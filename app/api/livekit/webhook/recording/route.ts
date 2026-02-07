/**
 * LiveKit Recording Webhook Handler
 *
 * Receives notifications from LiveKit Egress when:
 * - Recording starts (egress_started)
 * - Recording completes (egress_ended) - MOST IMPORTANT
 * - Recording fails (egress_failed)
 *
 * On completion:
 * 1. Read file from Oracle VM disk
 * 2. Upload to storage (Supabase/S3)
 * 3. Update database
 * 4. Clean up temp file
 * 5. Log event
 *
 * Security:
 * - Webhook signature validation (TODO: implement when LiveKit adds support)
 * - Server-side only
 * - Comprehensive error handling
 * - Fail-loud approach
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { livekitRecordings, livekitEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getStorageProvider } from '@/lib/livekit/storage/storage-factory';
import fs from 'fs';
import {
  LivekitWebhookAuthError,
  LivekitWebhookPayloadError,
  verifyLivekitWebhook,
} from '@/lib/livekit/webhook';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface EgressWebhook {
  event: 'egress_started' | 'egress_ended' | 'egress_failed';
  egress_info: {
    egress_id: string;
    room_name: string;
    started_at: number;
    ended_at?: number;
    error?: string;
    file?: {
      filename: string;
      size: number;
      duration: number;
    };
  };
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Received Egress webhook');

    // ======================================================================
    // PARSE WEBHOOK PAYLOAD
    // ======================================================================
    let body: EgressWebhook;
    try {
      const rawBody = await verifyLivekitWebhook(request);
      body = JSON.parse(rawBody);
    } catch (error) {
      console.error('❌ Webhook verification failed:', error);
      if (error instanceof LivekitWebhookPayloadError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error instanceof LivekitWebhookAuthError) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.json({ error: 'Webhook verification failed' }, { status: 401 });
    }

    console.log(`📋 Webhook event: ${body.event}`, {
      egressId: body.egress_info?.egress_id,
      roomName: body.egress_info?.room_name,
    });

    if (!body.event || !body.egress_info) {
      console.error('❌ Invalid webhook payload:', body);
      return NextResponse.json(
        { error: 'Invalid webhook payload - missing event or egress_info' },
        { status: 400 }
      );
    }

    // ======================================================================
    // HANDLE DIFFERENT EVENT TYPES
    // ======================================================================
    switch (body.event) {
      case 'egress_started':
        await handleEgressStarted(body.egress_info);
        break;

      case 'egress_ended':
        await handleEgressEnded(body.egress_info);
        break;

      case 'egress_failed':
        await handleEgressFailed(body.egress_info);
        break;

      default:
        console.log(`⏭️  Ignoring unknown event type: ${body.event}`);
    }

    return NextResponse.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('❌ CRITICAL: Webhook handler error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle egress_started event
 * Updates recording status to in_progress
 */
async function handleEgressStarted(egressInfo: EgressWebhook['egress_info']) {
  console.log(`🎬 Egress started: ${egressInfo.egress_id}`);

  try {
    // Update recording status
    const result = await db
      .update(livekitRecordings)
      .set({
        status: 'in_progress',
        metadata: egressInfo,
      })
      .where(eq(livekitRecordings.recordingSid, egressInfo.egress_id))
      .returning();

    if (result.length === 0) {
      console.warn(`⚠️  Recording not found for egress_id: ${egressInfo.egress_id}`);
    } else {
      console.log(`✅ Recording status updated to in_progress`);
    }
  } catch (error) {
    console.error('❌ Failed to handle egress_started:', error);
    throw error;
  }
}

/**
 * Handle egress_ended event (MOST CRITICAL)
 *
 * This is where the magic happens:
 * 1. Read file from disk
 * 2. Upload to storage
 * 3. Update database
 * 4. Clean up temp file
 */
async function handleEgressEnded(egressInfo: EgressWebhook['egress_info']) {
  console.log(`✅ Egress ended: ${egressInfo.egress_id}`);

  try {
    // ======================================================================
    // GET RECORDING FROM DATABASE
    // ======================================================================
    const [recording] = await db
      .select()
      .from(livekitRecordings)
      .where(eq(livekitRecordings.recordingSid, egressInfo.egress_id));

    if (!recording) {
      throw new Error(
        `CRITICAL: Recording not found in database for egress_id: ${egressInfo.egress_id}`
      );
    }

    console.log(`📁 Found recording in database: ${recording.id}`);

    // ======================================================================
    // VALIDATE FILE INFO
    // ======================================================================
    const file = egressInfo.file;

    if (!file || !file.filename) {
      throw new Error('No file information in webhook payload - recording may have failed');
    }

    console.log(`📦 File info:`, {
      filename: file.filename,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      duration: `${Math.floor(file.duration / 60)}m ${file.duration % 60}s`,
    });

    // ======================================================================
    // READ FILE FROM DISK (Egress saves files locally on Oracle VM)
    // ======================================================================
    const localFilePath = file.filename;

    console.log(`📖 Reading file from disk: ${localFilePath}`);

    if (!fs.existsSync(localFilePath)) {
      throw new Error(
        `CRITICAL: File not found on disk: ${localFilePath}\n` +
        `Egress may not have saved the file or path is incorrect.`
      );
    }

    const fileStats = fs.statSync(localFilePath);
    const fileBuffer = fs.readFileSync(localFilePath);

    console.log(
      `✅ File loaded from disk: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`
    );

    // ======================================================================
    // UPLOAD TO STORAGE (Supabase, S3, etc.)
    // ======================================================================
    console.log(`☁️  Uploading to storage: ${recording.storagePath}`);

    const storageProvider = getStorageProvider();
    const storageUrl = await storageProvider.uploadRecording(
      fileBuffer,
      recording.storagePath
    );

    console.log(`✅ File uploaded to storage successfully`);

    // ======================================================================
    // UPDATE DATABASE
    // ======================================================================
    await db
      .update(livekitRecordings)
      .set({
        status: 'completed',
        fileUrl: storageUrl,
        fileSizeBytes: fileStats.size,
        durationSeconds: file.duration || 0,
        completedAt: new Date(),
        metadata: {
          ...((recording.metadata as any) || {}),
          egressInfo,
          uploadedAt: new Date().toISOString(),
        },
      })
      .where(eq(livekitRecordings.id, recording.id));

    console.log(`✅ Database updated with recording metadata`);

    // ======================================================================
    // LOG SUCCESS EVENT
    // ======================================================================
    await db.insert(livekitEvents).values({
      roomId: recording.roomId,
      eventType: 'recording_completed',
      eventData: {
        recordingId: recording.id,
        egressId: egressInfo.egress_id,
        fileSize: fileStats.size,
        duration: file.duration,
        storagePath: recording.storagePath,
        storageUrl,
      },
      source: 'webhook',
      severity: 'info',
    });

    // ======================================================================
    // CLEAN UP: Delete local file
    // ======================================================================
    console.log(`🗑️  Deleting local file: ${localFilePath}`);

    fs.unlinkSync(localFilePath);

    console.log(
      `✅ Recording processing complete for ${egressInfo.egress_id}\n` +
      `   File: ${recording.storagePath}\n` +
      `   Size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB\n` +
      `   Duration: ${Math.floor(file.duration / 60)}m ${file.duration % 60}s`
    );

    // TODO: Send notification to users that recording is ready
    // await sendRecordingReadyNotification(recording);
  } catch (error) {
    console.error('❌ CRITICAL: Failed to process egress_ended:', {
      egressId: egressInfo.egress_id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // ======================================================================
    // UPDATE RECORDING AS FAILED
    // ======================================================================
    try {
      await db
        .update(livekitRecordings)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(livekitRecordings.recordingSid, egressInfo.egress_id));

      console.log(`⚠️  Recording marked as failed in database`);
    } catch (dbError) {
      console.error('❌ Failed to update recording status to failed:', dbError);
    }

    throw error;
  }
}

/**
 * Handle egress_failed event
 * Marks recording as failed in database
 */
async function handleEgressFailed(egressInfo: EgressWebhook['egress_info']) {
  console.error(`❌ Egress failed: ${egressInfo.egress_id}`, {
    error: egressInfo.error || 'Unknown error',
    roomName: egressInfo.room_name,
  });

  try {
    // ======================================================================
    // UPDATE RECORDING STATUS
    // ======================================================================
    await db
      .update(livekitRecordings)
      .set({
        status: 'failed',
        errorMessage: egressInfo.error || 'Unknown error',
        metadata: egressInfo,
      })
      .where(eq(livekitRecordings.recordingSid, egressInfo.egress_id));

    console.log(`⚠️  Recording marked as failed in database`);

    // ======================================================================
    // LOG ERROR EVENT
    // ======================================================================
    const [recording] = await db
      .select()
      .from(livekitRecordings)
      .where(eq(livekitRecordings.recordingSid, egressInfo.egress_id));

    if (recording) {
      await db.insert(livekitEvents).values({
        roomId: recording.roomId,
        eventType: 'recording_failed',
        eventData: {
          recordingId: recording.id,
          egressId: egressInfo.egress_id,
          error: egressInfo.error || 'Unknown error',
          roomName: egressInfo.room_name,
        },
        source: 'webhook',
        severity: 'error',
      });
    }

    // TODO: Send notification to admins about failed recording
    // await sendRecordingFailedNotification(egressInfo);
  } catch (error) {
    console.error('❌ Failed to handle egress_failed:', error);
    throw error;
  }
}
