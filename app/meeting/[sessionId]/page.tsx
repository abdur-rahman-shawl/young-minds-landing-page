/**
 * Meeting Page - Server Component
 *
 * Handles authentication, authorization, and validation before rendering the meeting room.
 *
 * Security Checks:
 * 1. User must be authenticated
 * 2. User must be a participant (mentor or mentee) of the session
 * 3. Meeting must be within valid time window (15 min before → 2 hours after scheduled time)
 * 4. Session must exist and be valid
 *
 * All checks fail loudly with clear error messages.
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, livekitRooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import MeetingRoom from './MeetingRoom';
import { livekitConfig } from '@/lib/livekit/config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Props {
  params: Promise<{ sessionId: string }>;
}

// ============================================================================
// MEETING PAGE COMPONENT
// ============================================================================

export default async function MeetingPage({ params: paramsPromise }: Props) {
  const params = await paramsPromise;
  // ==========================================================================
  // AUTHENTICATION
  // ==========================================================================
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    // Redirect to sign in with callback to return to this meeting
    redirect(`/auth/signin?callbackUrl=/meeting/${params.sessionId}`);
  }

  const userId = session.user.id;

  // ==========================================================================
  // SESSION VALIDATION
  // ==========================================================================
  const sessionData = await db.query.sessions.findFirst({
    where: eq(sessions.id, params.sessionId),
    with: {
      mentor: true,
      mentee: true,
    },
  });

  if (!sessionData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Session Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            This session does not exist or has been cancelled.
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
  // AUTHORIZATION - Verify user is a participant
  // ==========================================================================
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
            You are not authorized to access this meeting. Only session
            participants can join.
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
  // TIME WINDOW VALIDATION
  // ==========================================================================
  const now = new Date();
  const scheduledTime = new Date(sessionData.scheduledAt);

  // Calculate time windows
  const earlyJoinTime = new Date(
    scheduledTime.getTime() -
      livekitConfig.meeting.earlyJoinMinutes * 60 * 1000
  );
  const lateJoinTime = new Date(
    scheduledTime.getTime() +
      livekitConfig.meeting.lateJoinMaxHours * 60 * 60 * 1000
  );

  // Too early
  if (now < earlyJoinTime) {
    const minutesUntil = Math.ceil(
      (earlyJoinTime.getTime() - now.getTime()) / (1000 * 60)
    );

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-6">⏰</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Meeting Not Started Yet
          </h1>
          <p className="text-gray-600 mb-4">
            <strong>{sessionData.title}</strong>
          </p>
          <p className="text-gray-600 mb-4">
            Scheduled for:{' '}
            <strong>
              {scheduledTime.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </strong>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            You can join {livekitConfig.meeting.earlyJoinMinutes} minutes
            before the scheduled time (in {minutesUntil} minutes).
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

  // Too late - meeting expired
  if (now > lateJoinTime) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-6">⏱️</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Meeting Has Ended
          </h1>
          <p className="text-gray-600 mb-4">
            This meeting window has expired.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Meetings are available for{' '}
            {livekitConfig.meeting.lateJoinMaxHours} hours after the scheduled
            time.
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
  // ROOM VALIDATION
  // ==========================================================================
  const room = await db.query.livekitRooms.findFirst({
    where: eq(livekitRooms.sessionId, params.sessionId),
  });

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-6">⚠️</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Meeting Room Not Ready
          </h1>
          <p className="text-gray-600 mb-6">
            The meeting room for this session has not been created yet. Please
            contact support.
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
  // RENDER MEETING ROOM
  // ==========================================================================
  const otherParticipant = isMentor ? sessionData.mentee : sessionData.mentor;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <MeetingRoom
        sessionId={params.sessionId}
        userId={userId}
        userRole={isMentor ? 'mentor' : 'mentee'}
        sessionTitle={sessionData.title}
        otherParticipantName={otherParticipant.name || otherParticipant.email}
      />
    </Suspense>
  );
}

// ============================================================================
// LOADING SCREEN COMPONENT
// ============================================================================

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center text-white">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-lg font-medium">Loading meeting room...</p>
        <p className="text-sm text-gray-400 mt-2">
          Preparing your video connection
        </p>
      </div>
    </div>
  );
}
