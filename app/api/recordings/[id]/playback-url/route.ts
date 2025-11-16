/**
 * GET /api/recordings/[id]/playback-url
 *
 * Generate temporary signed URL for recording playback.
 *
 * Security:
 * - Requires authentication
 * - Authorization: Only session participants can access
 * - Returns signed URL with 1-hour expiration
 * - Fail-loud error handling
 *
 * Response:
 * - 200: Signed URL generated
 * - 401: Unauthorized
 * - 403: Forbidden (not a participant)
 * - 404: Recording not found
 * - 423: Recording not ready (still processing)
 * - 500: Server error
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
    // ======================================================================
    // AUTHENTICATION
    // ======================================================================
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      console.error('❌ Unauthorized playback URL request - no session');
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required to access recording',
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const recordingId = params.id;

    console.log(
      `🎥 Playback URL request: recording=${recordingId}, user=${userId}`
    );

    // ======================================================================
    // GENERATE PLAYBACK URL (includes authorization check)
    // ======================================================================
    const playbackUrl = await getPlaybackUrl(recordingId, userId);

    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    console.log(
      `✅ Playback URL generated for user ${userId}, expires at ${expiresAt.toISOString()}`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          playbackUrl,
          expiresAt: expiresAt.toISOString(),
          expiresIn: 3600, // seconds
        },
        message: 'Playback URL generated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Playback URL generation error:', {
      recordingId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // ======================================================================
    // ERROR HANDLING - Specific error types
    // ======================================================================
    if (error instanceof Error) {
      const message = error.message;

      // Authorization error (403 Forbidden)
      if (message.includes('UNAUTHORIZED') || message.includes('not authorized')) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You are not authorized to access this recording',
            details: 'Only session participants can view recordings',
          },
          { status: 403 }
        );
      }

      // Recording not found (404)
      if (message.includes('not found')) {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Recording not found',
            details: message,
          },
          { status: 404 }
        );
      }

      // Recording not ready (423 Locked)
      if (message.includes('not ready') || message.includes('status:')) {
        return NextResponse.json(
          {
            error: 'Recording Not Ready',
            message: 'Recording is still being processed',
            details: message,
          },
          { status: 423 }
        );
      }
    }

    // Generic server error (500)
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to generate playback URL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
