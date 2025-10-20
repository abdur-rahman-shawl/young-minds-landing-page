# 🎥 LiveKit Recording System - Complete Implementation Guide

**For:** New developer implementing recording functionality
**Estimated Time:** 10-14 hours
**Skill Level:** Intermediate (TypeScript, Node.js, PostgreSQL, AWS/Cloud Storage)
**Objective:** Build production-grade automatic session recording with storage abstraction

---

## 📖 Table of Contents

1. [Project Context](#project-context)
2. [What You're Building](#what-youre-building)
3. [Current System State](#current-system-state)
4. [Recording System Architecture](#recording-system-architecture)
5. [Prerequisites](#prerequisites)
6. [Implementation Steps](#implementation-steps)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)
9. [Success Criteria](#success-criteria)

---

## 📖 Project Context

### **What is Young Minds?**

Young Minds is a mentoring platform that connects mentors with mentees for 1-on-1 video sessions. Think of it like a professional tutoring/coaching platform where:
- **Mentors** offer expertise in various fields
- **Mentees** book sessions for guidance
- **Sessions** are video calls conducted through the web browser

### **Current Tech Stack:**

```
Frontend:  Next.js 15 (React, TypeScript, Tailwind CSS)
Backend:   Next.js API Routes (Server-side)
Database:  PostgreSQL (via Drizzle ORM)
Auth:      Better Auth
Video:     LiveKit (self-hosted on Oracle Cloud VM)
Storage:   Supabase Storage (will migrate to S3 later)
```

### **Why Recording?**

Users want to:
1. Review sessions after they happen
2. Share recordings with colleagues/teams
3. Keep records for compliance/training purposes
4. Revisit important advice from mentors

**Business Requirements:**
- Every session MUST be recorded automatically
- Recordings stored forever (no auto-deletion)
- Only session participants can view recordings
- Easy to switch storage providers (Supabase → S3 → GCS)

---

## 🎯 What You're Building

You are implementing an **automatic video recording system** with these components:

### **Component Overview:**

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR IMPLEMENTATION                      │
└─────────────────────────────────────────────────────────────┘

1. Storage Abstraction Layer
   ├─ Interface (works with any storage)
   ├─ Supabase Provider (current)
   ├─ S3 Provider (future)
   └─ GCS Provider (future)

2. Recording Manager
   ├─ Start recording (auto on session start)
   ├─ Stop recording (auto on session end)
   ├─ Upload to storage
   └─ Generate playback URLs

3. API Routes
   ├─ Webhook handler (LiveKit → Your App)
   ├─ Playback URL generator
   └─ Recording list

4. Database Changes
   └─ Add recording_config to sessions table

5. Frontend Updates
   ├─ Recording indicator in meeting
   └─ Playback page

6. Oracle VM Setup
   └─ Install LiveKit Egress service
```

### **User Flow (What Happens):**

```
User books session
    ↓
Session created with recording_config = {enabled: true}
    ↓
Meeting room opens (existing LiveKit integration)
    ↓
First participant joins
    ↓
🔴 Recording starts automatically via Egress API
    ↓
"Recording in progress" indicator shows in UI
    ↓
Participants have their video session
    ↓
Last participant leaves
    ↓
Recording stops automatically
    ↓
Egress processes video → Saves temp file on Oracle VM
    ↓
Webhook fires → Your code uploads to Supabase Storage
    ↓
Database updated → Recording marked as "completed"
    ↓
Users get notification → "Recording ready to view"
    ↓
User clicks link → Authorization check → Play recording
```

---

## 🔍 Current System State

### **What's Already Built:**

✅ **Video Calling System** (Fully Operational)
- Users can join meetings at `/meeting/[sessionId]`
- LiveKit server running on Oracle VM (`140.245.251.150:7880`)
- Token generation works (secure JWT tokens)
- Database tables: `livekit_rooms`, `livekit_participants`, `livekit_events`

✅ **Database Schema** (Recording Tables Exist)
- `livekit_recordings` table already created
- Columns: `recording_sid`, `storage_path`, `file_url`, `status`, etc.
- Ready to store recording metadata

✅ **Session Booking Flow**
- Users book sessions via `/api/bookings`
- LiveKit room auto-created on booking
- Participants added to database

### **What's Missing (Your Job):**

❌ Recording actually doesn't happen yet
❌ No Egress service installed on Oracle VM
❌ No storage integration (Supabase)
❌ No recording start/stop logic
❌ No webhook handler for recording events
❌ No playback UI

---

## 🏗️ Recording System Architecture

### **The Big Picture:**

```
┌──────────────────────────────────────────────────────────────────┐
│                        YOUR NEXT.JS APP                          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. Session Starts → Check recording_config                  ││
│  │    if enabled: Call Egress API to start recording           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                    │                              │
│                                    ▼                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ORACLE VM (140.245.251.150)                                 ││
│  │                                                              ││
│  │  ┌──────────────┐        ┌──────────────┐                  ││
│  │  │ LiveKit      │◄──────►│ Egress       │                  ││
│  │  │ Server       │        │ Service      │                  ││
│  │  │ (Port 7880)  │        │ (Recorder)   │                  ││
│  │  └──────────────┘        └──────┬───────┘                  ││
│  │                                  │                           ││
│  │                                  ▼                           ││
│  │                          Records video/audio                 ││
│  │                          Saves temp file:                    ││
│  │                          /tmp/egress/session-xxx.mp4        ││
│  └──────────────────────────────────┬───────────────────────────┘│
│                                     │                             │
│                                     │ Webhook fires when done     │
│                                     ▼                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 2. Webhook Handler (Your Code)                              ││
│  │    - Receives notification: "Recording completed"           ││
│  │    - Reads temp file from disk                              ││
│  │    - Uploads to Supabase Storage                            ││
│  │    - Updates database (livekit_recordings)                  ││
│  │    - Deletes temp file                                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                    │                              │
│                                    ▼                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ SUPABASE STORAGE (supabase.co/storage/v1/object/...)       ││
│  │                                                              ││
│  │  📹 session-abc123/2025-10-15-140532.mp4 (500 MB)          ││
│  │  📹 session-def456/2025-10-16-093012.mp4 (750 MB)          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                    │                              │
│                                    ▼                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 3. User Requests Playback                                   ││
│  │    - GET /api/recordings/[id]/playback-url                  ││
│  │    - Authorization check (participant only)                 ││
│  │    - Generate Supabase signed URL (expires 1 hour)          ││
│  │    - Return URL to frontend                                 ││
│  │    - Frontend plays video                                   ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### **Key Concepts You Need to Understand:**

#### **1. LiveKit Egress**
- **What:** Separate service that records LiveKit sessions
- **How:** Connects to LiveKit server, captures audio/video streams, encodes to MP4
- **Where:** Runs on Oracle VM alongside LiveKit server
- **Why separate:** Recording is CPU-intensive; separating prevents main server slowdown

#### **2. Storage Abstraction**
- **What:** Design pattern that lets you swap storage providers without changing code
- **How:** Interface defines methods (`uploadRecording`, `getPlaybackUrl`), implementations use different APIs
- **Example:**
  ```typescript
  // Interface (contract)
  interface StorageProvider {
    uploadRecording(file: Buffer, path: string): Promise<string>;
  }

  // Supabase implementation
  class SupabaseStorage implements StorageProvider {
    async uploadRecording(file, path) {
      return await supabase.storage.from('recordings').upload(path, file);
    }
  }

  // S3 implementation (future)
  class S3Storage implements StorageProvider {
    async uploadRecording(file, path) {
      return await s3.putObject({ Bucket: 'recordings', Key: path, Body: file });
    }
  }

  // Your code uses interface (doesn't know which implementation)
  const storage: StorageProvider = getStorageProvider(); // Factory decides
  await storage.uploadRecording(videoFile, 'session-123.mp4'); // Works with any provider!
  ```

#### **3. Webhooks**
- **What:** HTTP callbacks from LiveKit Egress to your app
- **When:** Fired when recording starts, ends, or fails
- **Payload Example:**
  ```json
  {
    "event": "egress_ended",
    "egress_info": {
      "egress_id": "EG_abcdef123456",
      "room_name": "session-abc123",
      "started_at": 1697385600,
      "ended_at": 1697389200,
      "file": {
        "filename": "/tmp/egress/session-abc123.mp4",
        "size": 524288000,
        "duration": 3600
      }
    }
  }
  ```
- **Your job:** Handle this webhook, upload file, update database

#### **4. Signed URLs (Temporary Access)**
- **What:** Time-limited URLs that allow file access without authentication
- **Why:** Recordings are private, but video players need direct URLs
- **Example:**
  ```
  Regular URL (doesn't work):
  https://supabase.co/storage/v1/object/recordings/session-123.mp4
  ❌ Returns 403 Forbidden

  Signed URL (works for 1 hour):
  https://supabase.co/storage/v1/object/recordings/session-123.mp4?token=eyJhbGc...
  ✅ Returns video file
  ⏰ Expires after 1 hour
  ```

---

## 📋 Prerequisites

### **Before You Start:**

1. **Access to Oracle VM:**
   ```bash
   ssh -i ./ssh-key-2025-09-14.key ubuntu@140.245.251.150
   ```

2. **Supabase Account:**
   - Sign up at https://supabase.com
   - Create new project: "young-minds-recordings"
   - Get credentials:
     - Project URL: `https://<project-id>.supabase.co`
     - Service Role Key (Settings → API → service_role key)
   - Create storage bucket:
     - Go to Storage → Create bucket
     - Name: `recordings`
     - Public: **NO** (private recordings)
     - File size limit: 2 GB

3. **Environment Variables:**
   Add to `.env.local` in Next.js project:
   ```bash
   # Supabase Storage
   SUPABASE_URL=https://abcdefghij.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_STORAGE_BUCKET=recordings

   # Recording Config
   RECORDING_ENABLED=true
   STORAGE_PROVIDER=supabase

   # LiveKit (should already exist)
   LIVEKIT_API_KEY=LKAPI02A7AAF539137A1EA3196A7284B9D18F420C7759
   LIVEKIT_API_SECRET=6u9N7ojOpU8Y0Yd1UZZqCHla4rP0hYsMWiOIuXUzD3w=
   ```

4. **Install Dependencies:**
   ```bash
   npm install @supabase/supabase-js
   ```

5. **Database Migration:**
   You need to add the `recording_config` column to the `sessions` table.
   Run this SQL in your PostgreSQL database:
   ```sql
   -- File: lib/db/migrations/0027_add_recording_config.sql

   ALTER TABLE sessions
   ADD COLUMN recording_config JSONB
   DEFAULT '{"enabled": true, "resolution": "1280x720", "fps": 30}'::jsonb;

   CREATE INDEX idx_sessions_recording_enabled
   ON sessions ((recording_config->>'enabled'));

   COMMENT ON COLUMN sessions.recording_config IS
   'Recording configuration: {enabled: boolean, resolution: string, fps: number, bitrate: number}';
   ```

---

## 🚀 Implementation Steps

### **Step 1: Create Storage Abstraction Layer**

**Why:** So we can easily switch from Supabase to S3 to GCS without rewriting code.

#### **1.1 Create Storage Provider Interface**

**File:** `lib/livekit/storage/storage-provider.interface.ts`

```typescript
/**
 * Storage Provider Interface
 *
 * Contract that all storage implementations must follow.
 * Allows swapping storage providers (Supabase → S3 → GCS) without code changes.
 */

export interface StorageProvider {
  /**
   * Upload a recording file to storage
   *
   * @param fileBuffer - Binary file data
   * @param path - Storage path (e.g., "sessions/abc123/2025-10-15.mp4")
   * @returns Public URL or storage identifier
   * @throws Error if upload fails
   */
  uploadRecording(fileBuffer: Buffer, path: string): Promise<string>;

  /**
   * Generate a temporary signed URL for playback
   *
   * @param path - Storage path of the recording
   * @param expiresIn - Seconds until URL expires (default: 3600 = 1 hour)
   * @returns Signed URL that works for limited time
   * @throws Error if file doesn't exist
   */
  getPlaybackUrl(path: string, expiresIn?: number): Promise<string>;

  /**
   * Delete a recording from storage
   *
   * @param path - Storage path of the recording
   * @throws Error if deletion fails
   */
  deleteRecording(path: string): Promise<void>;

  /**
   * Check if a recording exists
   *
   * @param path - Storage path to check
   * @returns true if file exists
   */
  exists(path: string): Promise<boolean>;
}
```

#### **1.2 Implement Supabase Storage Provider**

**File:** `lib/livekit/storage/supabase-storage.provider.ts`

```typescript
/**
 * Supabase Storage Provider Implementation
 *
 * Uses Supabase Storage API to store recordings.
 * Supabase uses S3-compatible API under the hood.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StorageProvider } from './storage-provider.interface';

export class SupabaseStorageProvider implements StorageProvider {
  private supabase: SupabaseClient;
  private bucket: string;

  constructor() {
    // Validate environment variables
    if (!process.env.SUPABASE_URL) {
      throw new Error('SUPABASE_URL is not defined in environment variables');
    }
    if (!process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('SUPABASE_SERVICE_KEY is not defined in environment variables');
    }
    if (!process.env.SUPABASE_STORAGE_BUCKET) {
      throw new Error('SUPABASE_STORAGE_BUCKET is not defined in environment variables');
    }

    // Initialize Supabase client with service role key (full access)
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          persistSession: false, // Server-side, no session needed
        },
      }
    );

    this.bucket = process.env.SUPABASE_STORAGE_BUCKET;

    console.log('✅ Supabase Storage Provider initialized');
  }

  /**
   * Upload recording to Supabase Storage
   */
  async uploadRecording(fileBuffer: Buffer, path: string): Promise<string> {
    try {
      console.log(`📤 Uploading recording to Supabase: ${path}`);

      // Upload file to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .upload(path, fileBuffer, {
          contentType: 'video/mp4',
          upsert: false, // Fail if file exists (prevent overwrites)
        });

      if (error) {
        console.error('❌ Supabase upload error:', error);
        throw new Error(`Failed to upload to Supabase: ${error.message}`);
      }

      // Get public URL (for reference, not for direct access)
      const { data: urlData } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(path);

      console.log(`✅ Recording uploaded successfully: ${urlData.publicUrl}`);

      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ Upload recording failed:', error);
      throw error;
    }
  }

  /**
   * Generate signed URL for playback (expires in 1 hour)
   */
  async getPlaybackUrl(path: string, expiresIn: number = 3600): Promise<string> {
    try {
      console.log(`🔐 Generating signed URL for: ${path} (expires in ${expiresIn}s)`);

      // Create signed URL (temporary access)
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        console.error('❌ Signed URL generation error:', error);
        throw new Error(`Failed to generate signed URL: ${error.message}`);
      }

      if (!data || !data.signedUrl) {
        throw new Error('Signed URL generation returned empty result');
      }

      console.log(`✅ Signed URL generated, expires at: ${new Date(Date.now() + expiresIn * 1000).toISOString()}`);

      return data.signedUrl;
    } catch (error) {
      console.error('❌ Get playback URL failed:', error);
      throw error;
    }
  }

  /**
   * Delete recording from Supabase Storage
   */
  async deleteRecording(path: string): Promise<void> {
    try {
      console.log(`🗑️  Deleting recording from Supabase: ${path}`);

      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove([path]);

      if (error) {
        console.error('❌ Supabase delete error:', error);
        throw new Error(`Failed to delete from Supabase: ${error.message}`);
      }

      console.log(`✅ Recording deleted successfully`);
    } catch (error) {
      console.error('❌ Delete recording failed:', error);
      throw error;
    }
  }

  /**
   * Check if recording exists
   */
  async exists(path: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .list(path.split('/').slice(0, -1).join('/'), {
          search: path.split('/').pop(),
        });

      if (error) {
        console.error('❌ Exists check error:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('❌ Exists check failed:', error);
      return false;
    }
  }
}
```

#### **1.3 Create Storage Factory**

**File:** `lib/livekit/storage/storage-factory.ts`

```typescript
/**
 * Storage Factory
 *
 * Returns the correct storage provider based on environment variable.
 * Allows switching providers by changing STORAGE_PROVIDER env var.
 */

import { StorageProvider } from './storage-provider.interface';
import { SupabaseStorageProvider } from './supabase-storage.provider';
// Future imports:
// import { S3StorageProvider } from './s3-storage.provider';
// import { GCSStorageProvider } from './gcs-storage.provider';

/**
 * Get storage provider instance based on configuration
 */
export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || 'supabase';

  console.log(`📦 Initializing storage provider: ${provider}`);

  switch (provider.toLowerCase()) {
    case 'supabase':
      return new SupabaseStorageProvider();

    // Future implementations:
    // case 's3':
    //   return new S3StorageProvider();
    // case 'gcs':
    //   return new GCSStorageProvider();

    default:
      throw new Error(
        `Unknown storage provider: ${provider}. ` +
        `Supported providers: supabase (s3 and gcs coming soon)`
      );
  }
}
```

#### **1.4 Create S3 Provider Stub (For Future)**

**File:** `lib/livekit/storage/s3-storage.provider.ts`

```typescript
/**
 * AWS S3 Storage Provider (STUB - Implement when switching to S3)
 *
 * This is a placeholder implementation. When you switch to S3:
 * 1. npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 * 2. Implement the methods below
 * 3. Change STORAGE_PROVIDER=s3 in .env.local
 * 4. Everything else works automatically (no other code changes needed)
 */

import { StorageProvider } from './storage-provider.interface';

export class S3StorageProvider implements StorageProvider {
  constructor() {
    // TODO: Initialize AWS S3 client
    // const s3Client = new S3Client({
    //   region: process.env.AWS_REGION,
    //   credentials: {
    //     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    //   },
    // });
    throw new Error('S3 Storage Provider not yet implemented');
  }

  async uploadRecording(fileBuffer: Buffer, path: string): Promise<string> {
    // TODO: Implement S3 upload
    // const command = new PutObjectCommand({
    //   Bucket: process.env.AWS_S3_BUCKET,
    //   Key: path,
    //   Body: fileBuffer,
    //   ContentType: 'video/mp4',
    // });
    // await s3Client.send(command);
    throw new Error('S3 upload not yet implemented');
  }

  async getPlaybackUrl(path: string, expiresIn: number = 3600): Promise<string> {
    // TODO: Implement S3 presigned URL
    // const command = new GetObjectCommand({
    //   Bucket: process.env.AWS_S3_BUCKET,
    //   Key: path,
    // });
    // return await getSignedUrl(s3Client, command, { expiresIn });
    throw new Error('S3 presigned URL not yet implemented');
  }

  async deleteRecording(path: string): Promise<void> {
    // TODO: Implement S3 delete
    throw new Error('S3 delete not yet implemented');
  }

  async exists(path: string): Promise<boolean> {
    // TODO: Implement S3 exists check
    throw new Error('S3 exists check not yet implemented');
  }
}
```

---

### **Step 2: Create Recording Manager**

**Why:** Centralized business logic for recording operations.

**File:** `lib/livekit/recording-manager.ts`

```typescript
/**
 * Recording Manager
 *
 * Manages recording lifecycle: start, stop, status, playback.
 * Uses storage abstraction layer (provider-agnostic).
 */

import { db } from '@/lib/db';
import { livekitRooms, livekitRecordings, livekitEvents, sessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getStorageProvider } from './storage/storage-factory';
import { livekitConfig } from './config';

/**
 * Start recording for a session
 * Called automatically when first participant joins
 */
export async function startRecording(sessionId: string) {
  try {
    console.log(`🎬 Starting recording for session ${sessionId}`);

    // Get session and room info
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Check if recording is enabled for this session
    const recordingConfig = session.recording_config as any;
    if (!recordingConfig || !recordingConfig.enabled) {
      console.log(`⏭️  Recording disabled for session ${sessionId}`);
      return null;
    }

    const room = await db.query.livekitRooms.findFirst({
      where: eq(livekitRooms.sessionId, sessionId),
    });

    if (!room) {
      throw new Error(`Room not found for session ${sessionId}`);
    }

    // Call LiveKit Egress API to start recording
    // Note: This requires Egress service running on Oracle VM
    const response = await fetch(`${livekitConfig.server.wsUrl.replace('ws://', 'http://')}/twirp/livekit.Egress/StartRoomCompositeEgress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${generateEgressToken()}`, // Use LiveKit API key
      },
      body: JSON.stringify({
        room_name: room.roomName,
        layout: 'grid', // All participants in grid
        audio_only: false,
        video_only: false,
        file: {
          filepath: `sessions/${sessionId}/{time}.mp4`,
          output: {
            file_type: 'MP4',
          },
        },
        preset: recordingConfig.resolution === '1920x1080' ? 'H264_1080P_30' : 'H264_720P_30',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Egress API error: ${error}`);
    }

    const egressInfo = await response.json();

    // Create recording record in database
    const [recording] = await db.insert(livekitRecordings).values({
      roomId: room.id,
      recordingSid: egressInfo.egress_id,
      recordingType: 'composite',
      fileType: 'mp4',
      storageProvider: process.env.STORAGE_PROVIDER || 'supabase',
      storagePath: `sessions/${sessionId}/${new Date().toISOString()}.mp4`,
      status: 'in_progress',
      startedAt: new Date(),
    }).returning();

    // Log event
    await db.insert(livekitEvents).values({
      roomId: room.id,
      eventType: 'recording_started',
      eventData: {
        recordingId: recording.id,
        egressId: egressInfo.egress_id,
      },
      source: 'api',
      severity: 'info',
    });

    console.log(`✅ Recording started: ${recording.recordingSid}`);

    return recording;
  } catch (error) {
    console.error(`❌ Failed to start recording for session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Stop recording for a session
 * Called automatically when last participant leaves
 */
export async function stopRecording(sessionId: string) {
  try {
    console.log(`⏹️  Stopping recording for session ${sessionId}`);

    // Get room and recording
    const room = await db.query.livekitRooms.findFirst({
      where: eq(livekitRooms.sessionId, sessionId),
      with: {
        recordings: {
          where: eq(livekitRecordings.status, 'in_progress'),
        },
      },
    });

    if (!room || !room.recordings.length) {
      console.log(`⏭️  No active recording found for session ${sessionId}`);
      return;
    }

    const recording = room.recordings[0];

    // Call LiveKit Egress API to stop recording
    const response = await fetch(`${livekitConfig.server.wsUrl.replace('ws://', 'http://')}/twirp/livekit.Egress/StopEgress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${generateEgressToken()}`,
      },
      body: JSON.stringify({
        egress_id: recording.recordingSid,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Egress API error: ${error}`);
    }

    console.log(`✅ Recording stop requested: ${recording.recordingSid}`);
    console.log(`⏳ Waiting for webhook to complete upload...`);

    // Note: Recording will be marked as completed by webhook handler
  } catch (error) {
    console.error(`❌ Failed to stop recording for session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Get playback URL for a recording
 * Generates temporary signed URL (expires in 1 hour)
 */
export async function getPlaybackUrl(recordingId: string, userId: string): Promise<string> {
  try {
    console.log(`🎥 Generating playback URL for recording ${recordingId}`);

    // Get recording
    const recording = await db.query.livekitRecordings.findFirst({
      where: eq(livekitRecordings.id, recordingId),
      with: {
        room: {
          with: {
            session: true,
          },
        },
      },
    });

    if (!recording) {
      throw new Error(`Recording ${recordingId} not found`);
    }

    // Authorization: Check if user is participant of the session
    const session = recording.room.session;
    if (session.mentorId !== userId && session.menteeId !== userId) {
      throw new Error(`User ${userId} is not authorized to view this recording`);
    }

    // Check recording is completed
    if (recording.status !== 'completed') {
      throw new Error(`Recording is not ready yet (status: ${recording.status})`);
    }

    // Get storage provider and generate signed URL
    const storageProvider = getStorageProvider();
    const playbackUrl = await storageProvider.getPlaybackUrl(recording.storagePath, 3600);

    // Log access for audit
    await db.insert(livekitEvents).values({
      roomId: recording.roomId,
      eventType: 'recording_accessed',
      eventData: {
        recordingId,
        userId,
        timestamp: new Date().toISOString(),
      },
      source: 'api',
      severity: 'info',
    });

    console.log(`✅ Playback URL generated for user ${userId}`);

    return playbackUrl;
  } catch (error) {
    console.error(`❌ Failed to generate playback URL:`, error);
    throw error;
  }
}

/**
 * Helper: Generate JWT token for Egress API
 */
function generateEgressToken(): string {
  // Use LiveKit API key and secret
  // This is a simplified version - in production, use proper JWT library
  const jwt = require('jsonwebtoken');

  return jwt.sign(
    {
      iss: livekitConfig.server.apiKey,
      sub: livekitConfig.server.apiKey,
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    livekitConfig.server.apiSecret,
    { algorithm: 'HS256' }
  );
}
```

---

### **Step 3: Create API Routes**

#### **3.1 Webhook Handler**

**File:** `app/api/livekit/webhook/recording/route.ts`

```typescript
/**
 * LiveKit Recording Webhook Handler
 *
 * Receives notifications from LiveKit Egress when:
 * - Recording starts
 * - Recording completes (file ready)
 * - Recording fails
 *
 * On completion: Uploads file to storage, updates database
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { livekitRecordings, livekitEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getStorageProvider } from '@/lib/livekit/storage/storage-factory';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('📥 Received Egress webhook:', JSON.stringify(body, null, 2));

    const { event, egress_info } = body;

    if (!event || !egress_info) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Handle different event types
    switch (event) {
      case 'egress_started':
        await handleEgressStarted(egress_info);
        break;

      case 'egress_ended':
        await handleEgressEnded(egress_info);
        break;

      case 'egress_failed':
        await handleEgressFailed(egress_info);
        break;

      default:
        console.log(`⏭️  Ignoring event type: ${event}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * Handle egress_started event
 */
async function handleEgressStarted(egressInfo: any) {
  console.log('🎬 Egress started:', egressInfo.egress_id);

  // Update recording status
  await db
    .update(livekitRecordings)
    .set({
      status: 'in_progress',
      metadata: egressInfo,
    })
    .where(eq(livekitRecordings.recordingSid, egressInfo.egress_id));
}

/**
 * Handle egress_ended event (MOST IMPORTANT)
 * Upload file to storage and update database
 */
async function handleEgressEnded(egressInfo: any) {
  console.log('✅ Egress ended:', egressInfo.egress_id);

  try {
    // Get recording from database
    const [recording] = await db
      .select()
      .from(livekitRecordings)
      .where(eq(livekitRecordings.recordingSid, egressInfo.egress_id));

    if (!recording) {
      throw new Error(`Recording not found: ${egressInfo.egress_id}`);
    }

    // Get file info from webhook
    const file = egressInfo.file;
    if (!file || !file.filename) {
      throw new Error('No file information in webhook payload');
    }

    // Read file from Oracle VM disk (Egress saves files locally)
    const localFilePath = file.filename; // e.g., "/tmp/egress/session-123.mp4"

    console.log(`📁 Reading file from disk: ${localFilePath}`);

    if (!fs.existsSync(localFilePath)) {
      throw new Error(`File not found on disk: ${localFilePath}`);
    }

    const fileBuffer = fs.readFileSync(localFilePath);
    const fileSize = fs.statSync(localFilePath).size;

    console.log(`📦 File loaded: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    // Upload to storage (Supabase, S3, etc.)
    const storageProvider = getStorageProvider();
    const storageUrl = await storageProvider.uploadRecording(
      fileBuffer,
      recording.storagePath
    );

    // Update database
    await db
      .update(livekitRecordings)
      .set({
        status: 'completed',
        fileUrl: storageUrl,
        fileSizeBytes: fileSize,
        durationSeconds: file.duration || 0,
        completedAt: new Date(),
        metadata: egressInfo,
      })
      .where(eq(livekitRecordings.id, recording.id));

    // Log success event
    await db.insert(livekitEvents).values({
      roomId: recording.roomId,
      eventType: 'recording_completed',
      eventData: {
        recordingId: recording.id,
        egressId: egressInfo.egress_id,
        fileSize,
        duration: file.duration,
      },
      source: 'webhook',
      severity: 'info',
    });

    // Clean up: Delete local file
    console.log(`🗑️  Deleting local file: ${localFilePath}`);
    fs.unlinkSync(localFilePath);

    console.log(`✅ Recording processing complete for ${egressInfo.egress_id}`);
  } catch (error) {
    console.error('❌ Failed to process egress_ended:', error);

    // Update recording as failed
    await db
      .update(livekitRecordings)
      .set({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
      .where(eq(livekitRecordings.recordingSid, egressInfo.egress_id));

    throw error;
  }
}

/**
 * Handle egress_failed event
 */
async function handleEgressFailed(egressInfo: any) {
  console.error('❌ Egress failed:', egressInfo.egress_id, egressInfo.error);

  // Update recording status
  await db
    .update(livekitRecordings)
    .set({
      status: 'failed',
      errorMessage: egressInfo.error || 'Unknown error',
    })
    .where(eq(livekitRecordings.recordingSid, egressInfo.egress_id));

  // Log error event
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
        error: egressInfo.error,
      },
      source: 'webhook',
      severity: 'error',
    });
  }
}
```

#### **3.2 Playback URL API**

**File:** `app/api/recordings/[id]/playback-url/route.ts`

```typescript
/**
 * GET /api/recordings/[id]/playback-url
 *
 * Generate temporary signed URL for recording playback.
 * Authorization: Only session participants can access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getPlaybackUrl } from '@/lib/livekit/recording-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate playback URL (includes authorization check)
    const playbackUrl = await getPlaybackUrl(params.id, session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        playbackUrl,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      },
    });
  } catch (error) {
    console.error('Playback URL error:', error);

    if (error instanceof Error && error.message.includes('not authorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to generate playback URL', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
```

#### **3.3 List Recordings API**

**File:** `app/api/sessions/[sessionId]/recordings/route.ts`

```typescript
/**
 * GET /api/sessions/[sessionId]/recordings
 *
 * List all recordings for a session.
 * Authorization: Only session participants can list.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { livekitRooms, livekitRecordings, sessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Authenticate
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get session and verify authorization
    const sessionData = await db.query.sessions.findFirst({
      where: eq(sessions.id, params.sessionId),
    });

    if (!sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user is participant
    if (sessionData.mentorId !== session.user.id && sessionData.menteeId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get room and recordings
    const room = await db.query.livekitRooms.findFirst({
      where: eq(livekitRooms.sessionId, params.sessionId),
      with: {
        recordings: true,
      },
    });

    if (!room) {
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({
      success: true,
      data: room.recordings.map((rec) => ({
        id: rec.id,
        status: rec.status,
        durationSeconds: rec.durationSeconds,
        fileSizeBytes: rec.fileSizeBytes,
        createdAt: rec.createdAt,
        completedAt: rec.completedAt,
      })),
    });
  } catch (error) {
    console.error('List recordings error:', error);
    return NextResponse.json(
      { error: 'Failed to list recordings' },
      { status: 500 }
    );
  }
}
```

---

### **Step 4: Modify Room Manager for Auto-Recording**

**File:** `lib/livekit/room-manager.ts` (existing file, add this logic)

Add this method to the `LiveKitRoomManager` class:

```typescript
/**
 * Handle room activation (first participant joined)
 * Automatically starts recording if enabled for session
 */
static async handleRoomActivation(sessionId: string): Promise<void> {
  try {
    console.log(`🟢 Room activated for session ${sessionId}`);

    // Import recording functions
    const { startRecording } = await import('./recording-manager');

    // Start recording automatically
    await startRecording(sessionId);
  } catch (error) {
    console.error(`❌ Failed to handle room activation for session ${sessionId}:`, error);
    // Don't throw - recording failure shouldn't break the meeting
  }
}
```

**Where to call this:**
You need to trigger this when the first participant joins. The best way is via a LiveKit webhook.

Add to your LiveKit config file on Oracle VM (`~/livekit/livekit.yaml`):

```yaml
webhook:
  urls:
    - http://your-nextjs-app-url.com/api/livekit/webhook/room-events
  api_key: <your-webhook-secret>
```

Then create webhook handler:

**File:** `app/api/livekit/webhook/room-events/route.ts`

```typescript
/**
 * LiveKit Room Events Webhook
 * Triggers auto-recording when room becomes active
 */

import { NextRequest, NextResponse } from 'next/server';
import { LiveKitRoomManager } from '@/lib/livekit/room-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, room } = body;

    if (event === 'room_started') {
      // Extract session ID from room name
      const sessionId = room.name.replace('session-', '');

      // Trigger auto-recording
      await LiveKitRoomManager.handleRoomActivation(sessionId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Room events webhook error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
```

---

### **Step 5: Create Playback UI**

**File:** `app/recordings/[id]/page.tsx`

```typescript
/**
 * Recording Playback Page
 * Shows video player for recorded sessions
 */

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { livekitRecordings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import RecordingPlayer from './RecordingPlayer';

interface Props {
  params: { id: string };
}

export default async function RecordingPlaybackPage({ params }: Props) {
  // Authenticate
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=/recordings/${params.id}`);
  }

  // Get recording
  const recording = await db.query.livekitRecordings.findFirst({
    where: eq(livekitRecordings.id, params.id),
    with: {
      room: {
        with: {
          session: true,
        },
      },
    },
  });

  if (!recording) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Recording Not Found</h1>
          <a href="/dashboard" className="text-blue-600 hover:underline">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Authorization check
  const sessionData = recording.room.session;
  if (sessionData.mentorId !== session.user.id && sessionData.menteeId !== session.user.id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You are not authorized to view this recording.</p>
          <a href="/dashboard" className="text-blue-600 hover:underline">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Check recording is ready
  if (recording.status !== 'completed') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Recording Processing</h1>
          <p className="text-gray-600 mb-4">
            This recording is still being processed. Please check back in a few minutes.
          </p>
          <p className="text-sm text-gray-500">Status: {recording.status}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <RecordingPlayer
        recordingId={params.id}
        sessionTitle={sessionData.title}
        durationSeconds={recording.durationSeconds || 0}
        fileSizeBytes={recording.fileSizeBytes || 0}
        recordedAt={recording.createdAt}
      />
    </div>
  );
}
```

**File:** `app/recordings/[id]/RecordingPlayer.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';

interface Props {
  recordingId: string;
  sessionTitle: string;
  durationSeconds: number;
  fileSizeBytes: number;
  recordedAt: Date;
}

export default function RecordingPlayer({
  recordingId,
  sessionTitle,
  durationSeconds,
  fileSizeBytes,
  recordedAt,
}: Props) {
  const [playbackUrl, setPlaybackUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Fetch playback URL
  useEffect(() => {
    async function fetchUrl() {
      try {
        const response = await fetch(`/api/recordings/${recordingId}/playback-url`);

        if (!response.ok) {
          throw new Error('Failed to get playback URL');
        }

        const data = await response.json();
        setPlaybackUrl(data.data.playbackUrl);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    }

    fetchUrl();
  }, [recordingId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading recording...</p>
        </div>
      </div>
    );
  }

  if (error || !playbackUrl) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Failed to load recording'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 text-white">
        <h1 className="text-3xl font-bold mb-2">{sessionTitle}</h1>
        <div className="flex items-center gap-4 text-gray-400 text-sm">
          <span>Recorded: {new Date(recordedAt).toLocaleDateString()}</span>
          <span>•</span>
          <span>Duration: {Math.floor(durationSeconds / 60)} minutes</span>
          <span>•</span>
          <span>Size: {(fileSizeBytes / 1024 / 1024).toFixed(1)} MB</span>
        </div>
      </div>

      {/* Video Player */}
      <div className="bg-black rounded-lg overflow-hidden shadow-2xl">
        <video
          controls
          className="w-full"
          src={playbackUrl}
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-4">
        <a
          href={playbackUrl}
          download={`${sessionTitle}.mp4`}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Download Recording
        </a>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
        >
          Back
        </button>
      </div>
    </div>
  );
}
```

---

### **Step 6: Update Meeting Room UI**

**File:** `app/meeting/[sessionId]/MeetingRoom.tsx` (existing file, add indicator)

Add this inside the meeting room UI (after line with "Leave Meeting" button):

```typescript
{/* Recording Indicator - Always visible when recording */}
{isRecording && (
  <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
    <div className="bg-red-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
      <div className="w-3 h-3 bg-white rounded-full"></div>
      <span className="font-medium">Recording in Progress</span>
    </div>
  </div>
)}
```

Add state management:

```typescript
// At top of component
const [isRecording, setIsRecording] = useState(false);

// Check if recording is active
useEffect(() => {
  async function checkRecording() {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/recordings`);
      const data = await response.json();

      // Check if any recording is in progress
      const hasActiveRecording = data.data?.some(
        (rec: any) => rec.status === 'in_progress'
      );

      setIsRecording(hasActiveRecording);
    } catch (error) {
      console.error('Failed to check recording status:', error);
    }
  }

  checkRecording();

  // Poll every 30 seconds
  const interval = setInterval(checkRecording, 30000);

  return () => clearInterval(interval);
}, [sessionId]);
```

---

### **Step 7: Oracle VM - Install Egress**

**SSH into Oracle VM:**

```bash
ssh -i ./ssh-key-2025-09-14.key ubuntu@140.245.251.150
```

**Download LiveKit Egress:**

```bash
cd ~
wget https://github.com/livekit/egress/releases/download/v1.9.1/livekit-egress_1.9.1_linux_amd64.tar.gz
tar -xzf livekit-egress_1.9.1_linux_amd64.tar.gz
chmod +x livekit-egress
mv livekit-egress /usr/local/bin/
```

**Create Egress Configuration:**

```bash
sudo nano /etc/livekit-egress.yaml
```

Paste this configuration:

```yaml
# LiveKit Egress Configuration

# Connection to LiveKit server
api_key: LKAPI02A7AAF539137A1EA3196A7284B9D18F420C7759
api_secret: 6u9N7ojOpU8Y0Yd1UZZqCHla4rP0hYsMWiOIuXUzD3w=
ws_url: ws://localhost:7880

# Webhook URL (your Next.js app)
webhook:
  url: https://your-nextjs-app-url.com/api/livekit/webhook/recording
  api_key: <your-webhook-secret>

# File output settings
file_output:
  # Local directory for temporary files
  local:
    directory: /tmp/egress

# Template settings
template_base: ""

# Logging
log_level: info
```

**Create SystemD Service:**

```bash
sudo nano /etc/systemd/system/livekit-egress.service
```

Paste:

```ini
[Unit]
Description=LiveKit Egress Service
After=network.target livekit.service
Requires=livekit.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/tmp/egress
ExecStartPre=/bin/mkdir -p /tmp/egress
ExecStart=/usr/local/bin/livekit-egress --config /etc/livekit-egress.yaml
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=livekit-egress

# Resource limits
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

**Start Service:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable livekit-egress
sudo systemctl start livekit-egress
sudo systemctl status livekit-egress
```

**Check logs:**

```bash
sudo journalctl -u livekit-egress -f
```

---

## 🧪 Testing Guide

### **Test 1: End-to-End Recording**

1. **Create test session with recording enabled:**
   ```sql
   UPDATE sessions
   SET recording_config = '{"enabled": true, "resolution": "1280x720", "fps": 30}'::jsonb
   WHERE id = '<your-test-session-id>';
   ```

2. **Start meeting:**
   - Open meeting URL in 2 browser tabs
   - Join as mentor and mentee

3. **Verify recording started:**
   - Check database:
     ```sql
     SELECT * FROM livekit_recordings WHERE status = 'in_progress';
     ```
   - Check Egress logs:
     ```bash
     sudo journalctl -u livekit-egress -n 50
     ```

4. **Have conversation (at least 2 minutes)**

5. **Leave meeting:**
   - Both participants click "Leave"

6. **Wait for processing (2-5 minutes)**
   - Watch Egress logs for "egress_ended"
   - Watch Next.js logs for upload progress

7. **Verify recording completed:**
   ```sql
   SELECT * FROM livekit_recordings WHERE status = 'completed';
   ```

8. **Check Supabase Storage:**
   - Go to Supabase dashboard → Storage → recordings bucket
   - Should see MP4 file

9. **Test playback:**
   - Navigate to `/recordings/<recording-id>`
   - Should see video player
   - Video should play

### **Test 2: Storage Provider Switching**

1. **Current: Supabase**
   - Verify recording uploads to Supabase

2. **Switch to S3:**
   ```bash
   # .env.local
   STORAGE_PROVIDER=s3
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_S3_BUCKET=...
   AWS_REGION=us-east-1
   ```

3. **Implement S3 provider** (follow stub in s3-storage.provider.ts)

4. **Test again**
   - Recording should now upload to S3
   - No other code changes needed!

### **Test 3: Authorization**

1. **As unauthorized user:**
   - Try accessing `/recordings/<id>` as non-participant
   - Should see "Access Denied"

2. **As participant:**
   - Should be able to view and download

---

## 🐛 Troubleshooting

### **Problem: Recording doesn't start**

**Check:**
1. Egress service running?
   ```bash
   sudo systemctl status livekit-egress
   ```

2. Egress can connect to LiveKit?
   ```bash
   sudo journalctl -u livekit-egress -n 100 | grep "connected"
   ```

3. Session has recording_config.enabled = true?
   ```sql
   SELECT recording_config FROM sessions WHERE id = '<session-id>';
   ```

4. Webhook URL configured in egress.yaml?

### **Problem: File doesn't upload to Supabase**

**Check:**
1. Supabase credentials correct?
   - Test manually:
     ```bash
     curl -X POST "https://<project-id>.supabase.co/storage/v1/object/recordings/test.txt" \
       -H "Authorization: Bearer <service-role-key>" \
       -H "Content-Type: text/plain" \
       -d "test"
     ```

2. Bucket exists and is private?

3. File exists on disk before upload?
   ```bash
   ls -lh /tmp/egress/
   ```

4. Check Next.js logs for upload errors

### **Problem: Playback URL returns 403**

**Check:**
1. URL signed correctly? (should have token parameter)
2. URL expired? (expires after 1 hour)
3. Regenerate URL by refreshing page

---

## ✅ Success Criteria

Your implementation is complete when:

- [x] Storage abstraction layer works (can switch providers by changing env var)
- [x] Recording starts automatically when meeting begins
- [x] Recording stops automatically when meeting ends
- [x] Webhook handler uploads file to Supabase
- [x] Database updated with recording metadata
- [x] Only participants can view recordings
- [x] Playback page displays video player
- [x] Download button works
- [x] Recording indicator shows in meeting
- [x] All operations logged for audit trail

---

## 📚 Additional Resources

- **LiveKit Egress Docs:** https://docs.livekit.io/home/egress/overview/
- **Supabase Storage Docs:** https://supabase.com/docs/guides/storage
- **AWS S3 SDK:** https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/
- **Webhooks Guide:** https://docs.livekit.io/home/server/webhooks/

---

## 🎓 Key Learnings

After implementing this, you'll understand:
- ✅ Storage abstraction patterns (Strategy + Factory)
- ✅ Webhook architecture
- ✅ Video processing pipelines
- ✅ Signed URL security
- ✅ Database triggers and automation
- ✅ Production-grade error handling

---

**Good luck! You've got this. 🚀**

If you get stuck, check the logs first:
- Next.js: `npm run dev` output
- LiveKit: `sudo journalctl -u livekit -f`
- Egress: `sudo journalctl -u livekit-egress -f`
