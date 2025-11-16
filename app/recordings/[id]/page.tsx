/**
 * Recording Playback Page - Server Component
 *
 * Handles authentication, authorization, and validation before rendering the video player.
 *
 * Security Checks:
 * 1. User must be authenticated
 * 2. User must be a participant (mentor or mentee) of the session
 * 3. Recording must exist and be completed
 * 4. All checks fail loudly with clear error messages
 *
 * Production-grade: Comprehensive error states, loading states, user feedback
 */

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { livekitRecordings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import RecordingPlayer from './RecordingPlayer';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Props {
  params: { id: string };
}

// ============================================================================
// RECORDING PLAYBACK PAGE
// ============================================================================

export default async function RecordingPlaybackPage({ params }: Props) {
  // ==========================================================================
  // AUTHENTICATION
  // ==========================================================================
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    // Redirect to sign in with callback to return to this recording
    redirect(`/auth/signin?callbackUrl=/recordings/${params.id}`);
  }

  const userId = session.user.id;

  // ==========================================================================
  // GET RECORDING WITH SESSION DATA
  // ==========================================================================
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

  // ==========================================================================
  // RECORDING NOT FOUND
  // ==========================================================================
  if (!recording) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Recording Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            This recording does not exist or has been deleted.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // AUTHORIZATION CHECK
  // ==========================================================================
  const sessionData = recording.room.session;
  const isMentor = sessionData.mentorId === userId;
  const isMentee = sessionData.menteeId === userId;

  if (!isMentor && !isMentee) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-6">🚫</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">
            You are not authorized to view this recording. Only session
            participants can access recordings.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RECORDING FAILED
  // ==========================================================================
  if (recording.status === 'failed') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-6">⚠️</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Recording Failed
          </h1>
          <p className="text-gray-600 mb-4">
            This recording failed to process due to a technical error.
          </p>
          {recording.errorMessage && (
            <p className="text-sm text-gray-500 mb-6 font-mono bg-gray-100 p-3 rounded">
              {recording.errorMessage}
            </p>
          )}
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RECORDING PROCESSING
  // ==========================================================================
  if (recording.status !== 'completed') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-6">⏳</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Recording Processing
          </h1>
          <p className="text-gray-600 mb-4">
            This recording is still being processed. Please check back in a few
            minutes.
          </p>
          <div className="mb-6">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-800 mr-3"></div>
              <span className="font-medium">Status: {recording.status}</span>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER VIDEO PLAYER
  // ==========================================================================
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
