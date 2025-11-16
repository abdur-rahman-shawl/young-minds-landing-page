/**
 * GET /api/sessions/[sessionId]/recordings
 *
 * List all recordings for a session.
 *
 * Security:
 * - Requires authentication
 * - Authorization: Only session participants can list
 * - Returns recording metadata (not playback URLs)
 *
 * Response:
 * - 200: Array of recordings
 * - 401: Unauthorized
 * - 403: Forbidden
 * - 404: Session not found
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { livekitRooms, livekitRecordings, sessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const resolvedParams = await context.params;
  const { sessionId } = resolvedParams;

  try {
    // ======================================================================
    // AUTHENTICATION
    // ======================================================================
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    console.log(`📋 List recordings request: session=${sessionId}, user=${userId}`);

    // ======================================================================
    // GET SESSION AND VERIFY AUTHORIZATION
    // ======================================================================
    const sessionData = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });

    if (!sessionData) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if user is participant
    if (sessionData.mentorId !== userId && sessionData.menteeId !== userId) {
      console.error(`❌ User ${userId} not authorized for session ${sessionId}`);
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'You are not authorized to view recordings for this session',
        },
        { status: 403 }
      );
    }

    // ======================================================================
    // GET ROOM AND RECORDINGS
    // ======================================================================
    const room = await db.query.livekitRooms.findFirst({
      where: eq(livekitRooms.sessionId, sessionId),
      with: {
        recordings: true,
      },
    });

    if (!room) {
      // Session exists but no room created yet - return empty array
      console.log(`⚠️  No room found for session ${sessionId}`);
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No recordings found for this session',
      });
    }

    // ======================================================================
    // FORMAT RESPONSE (hide sensitive data)
    // ======================================================================
    const recordings = room.recordings.map((rec) => ({
      id: rec.id,
      status: rec.status,
      durationSeconds: rec.durationSeconds,
      fileSizeBytes: rec.fileSizeBytes,
      createdAt: rec.createdAt,
      startedAt: rec.startedAt,
      completedAt: rec.completedAt,
      errorMessage: rec.errorMessage,
      // Don't expose: access_token, storagePath, recordingSid
    }));

    console.log(`✅ Found ${recordings.length} recordings for session ${sessionId}`);

    return NextResponse.json({
      success: true,
      data: recordings,
      message: `Found ${recordings.length} recording(s)`,
    });
  } catch (error) {
    console.error('❌ List recordings error:', {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to list recordings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
