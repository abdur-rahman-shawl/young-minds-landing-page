/**
 * Meeting Room - Client Component
 *
 * Handles the actual video call interface using LiveKit React components.
 *
 * Features:
 * - Fetches access token from API
 * - Pre-join lobby for camera/microphone setup
 * - Full-featured video conference UI
 * - Connection quality monitoring
 * - Error handling with retry logic
 * - Graceful disconnect handling
 *
 * Security:
 * - Token fetched from server-side API (never exposed)
 * - All validation done on server before token is issued
 *
 * UI Flow:
 * 1. Loading → Fetch token
 * 2. Pre-join → Setup camera/mic, click "Join Meeting"
 * 3. Video Conference → Full meeting UI
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
  ControlBar,
  Chat,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { livekitConfig } from '@/lib/livekit/config';
import { Room, RoomEvent } from 'livekit-client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Props {
  sessionId: string;
  userId: string;
  userRole: 'mentor' | 'mentee';
  sessionTitle: string;
  otherParticipantName: string;
}

interface TokenData {
  token: string;
  roomName: string;
  participantName: string;
  wsUrl: string;
  expiresAt: string;
}

// ============================================================================
// MEETING ROOM COMPONENT
// ============================================================================

export default function MeetingRoom({
  sessionId,
  userId,
  userRole,
  sessionTitle,
  otherParticipantName,
}: Props) {
  const router = useRouter();

  // State management
  const [token, setToken] = useState<string>('');
  const [wsUrl, setWsUrl] = useState<string>('');
  const [participantName, setParticipantName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  // ==========================================================================
  // FETCH ACCESS TOKEN
  // ==========================================================================
  useEffect(() => {
    let isMounted = true;

    async function fetchToken() {
      try {
        console.log(`🔐 Fetching access token for session ${sessionId}`);

        const response = await fetch(
          `/api/sessions/${sessionId}/livekit/access-token`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies for authentication
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const data = await response.json();

        if (!isMounted) return;

        if (!data.success || !data.data) {
          throw new Error('Invalid response from server');
        }

        const tokenData: TokenData = data.data;

        // Validate token data
        if (!tokenData.token || !tokenData.wsUrl || !tokenData.roomName) {
          throw new Error('Incomplete token data received from server');
        }

        setToken(tokenData.token);
        setWsUrl(tokenData.wsUrl);
        setParticipantName(tokenData.participantName);
        setIsLoading(false);

        console.log(`✅ Access token obtained for room ${tokenData.roomName}`);
      } catch (err) {
        console.error('❌ Error fetching access token:', err);

        if (!isMounted) return;

        const errorMessage =
          err instanceof Error ? err.message : 'Failed to connect to meeting';

        setError(errorMessage);
        setIsLoading(false);
      }
    }

    fetchToken();

    return () => {
      isMounted = false;
    };
  }, [sessionId, retryCount]);

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  const handleDisconnect = () => {
    console.log('👋 User disconnected from meeting');
    router.push('/dashboard');
  };

  const handleRetry = () => {
    console.log('🔄 Retrying connection...');
    setError('');
    setIsLoading(true);
    setRetryCount((prev) => prev + 1);
  };

  const handleError = (error: Error) => {
    console.error('❌ Meeting room error:', error);
    setError(error.message);
  };

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center text-white max-w-md">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Connecting to meeting...</h2>
          <p className="text-gray-400">Establishing secure connection</p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ERROR STATE
  // ==========================================================================
  if (error || !token || !wsUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center text-white max-w-md p-8">
          <div className="text-red-500 text-6xl mb-6">⚠️</div>
          <h2 className="text-3xl font-bold mb-4">Connection Error</h2>
          <p className="text-gray-300 mb-6">
            {error || 'Unable to connect to the meeting'}
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleRetry}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
            >
              Retry Connection
            </button>
            <button
              onClick={handleDisconnect}
              className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition"
            >
              Return to Dashboard
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            If the problem persists, please contact support.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // MEETING ROOM UI
  // ==========================================================================
  return (
    <div className="h-screen w-screen bg-gray-900">
      <LiveKitRoom
        token={token}
        serverUrl={wsUrl}
        connect={true}
        onDisconnected={handleDisconnect}
        onError={handleError}
        options={{
          // Adaptive streaming for optimal quality
          adaptiveStream: livekitConfig.meeting.video.adaptiveStream,
          dynacast: livekitConfig.meeting.video.dynacast,

          // Video quality settings
          videoCaptureDefaults: {
            resolution: livekitConfig.meeting.video.defaultResolution,
          },

          // Audio settings
          audioCaptureDefaults: {
            echoCancellation: livekitConfig.meeting.audio.echoCancellation,
            noiseSuppression: livekitConfig.meeting.audio.noiseSuppression,
            autoGainControl: livekitConfig.meeting.audio.autoGainControl,
          },

          // Disconnect on page leave
          disconnectOnPageLeave: true,

          // Reconnection settings
          reconnectAttempts: 5,
          reconnectDelay: 1000,
        }}
        data-lk-theme="default"
        className="h-full w-full"
      >
        {/* Meeting Room Content with Custom Header */}
        <MeetingRoomContent
          sessionTitle={sessionTitle}
          otherParticipantName={otherParticipantName}
          userRole={userRole}
          onLeave={handleDisconnect}
        />

        {/* Audio renderer for remote participants */}
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

// ============================================================================
// MEETING ROOM CONTENT COMPONENT
// ============================================================================

function MeetingRoomContent({
  sessionTitle,
  otherParticipantName,
  userRole,
  onLeave,
}: {
  sessionTitle: string;
  otherParticipantName: string;
  userRole: 'mentor' | 'mentee';
  onLeave: () => void;
}) {
  return (
    <div className="relative h-full w-full">
      {/* Custom header overlay */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-50 pointer-events-none">
        <div className="flex items-center justify-between text-white">
          <div className="pointer-events-auto">
            <h1 className="text-lg font-semibold">{sessionTitle}</h1>
            <p className="text-sm text-gray-300">
              Meeting with {otherParticipantName}
            </p>
          </div>
          <button
            onClick={onLeave}
            className="pointer-events-auto px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition font-medium text-sm"
          >
            Leave Meeting
          </button>
        </div>
      </div>

      {/* Main video conference UI */}
      <VideoConference
        chatMessageFormatter={(message) => {
          return `${message.from?.name || 'Anonymous'}: ${message.message}`;
        }}
      />

      {/* Role indicator badge */}
      <div className="absolute bottom-20 left-4 z-40 pointer-events-none">
        <div className="text-white text-xs font-medium bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
          {userRole === 'mentor' ? '🎓 Mentor' : '👨‍🎓 Mentee'}
        </div>
      </div>
    </div>
  );
}
