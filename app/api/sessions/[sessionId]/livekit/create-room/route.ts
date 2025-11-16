/**
 * POST /api/sessions/[sessionId]/livekit/create-room
 *
 * Creates a LiveKit room for a session.
 *
 * Security:
 * - Requires authentication
 * - Validates session ID format (UUID)
 * - Fails loudly on any error
 *
 * Called by: Session booking flow after successful booking creation
 *
 * Response:
 * - 200: Room created successfully
 * - 400: Invalid session ID
 * - 401: Unauthorized
 * - 409: Room already exists
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { LiveKitRoomManager } from '@/lib/livekit/room-manager';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const sessionIdSchema = z.string().uuid({
  message: 'Session ID must be a valid UUID format',
});

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // ========================================================================
    // AUTHENTICATION
    // ========================================================================
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      console.error('❌ Unauthorized attempt to create room - no session');
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required. Please log in.',
        },
        { status: 401 }
      );
    }

    // ========================================================================
    // INPUT VALIDATION
    // ========================================================================
    const { sessionId } = await params;

    // Validate UUID format
    const validationResult = sessionIdSchema.safeParse(sessionId);
    if (!validationResult.success) {
      console.error(`❌ Invalid session ID format: ${sessionId}`);
      return NextResponse.json(
        {
          error: 'Invalid session ID',
          message: 'Session ID must be a valid UUID',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    // ========================================================================
    // ROOM CREATION
    // ========================================================================
    console.log(
      `📹 Creating LiveKit room for session ${sessionId} by user ${session.user.id}`
    );

    const roomData = await LiveKitRoomManager.createRoomForSession(sessionId);

    console.log(
      `✅ LiveKit room created successfully: ${roomData.roomName} (${roomData.roomId})`
    );

    // ========================================================================
    // SUCCESS RESPONSE
    // ========================================================================
    return NextResponse.json(
      {
        success: true,
        data: {
          roomId: roomData.roomId,
          roomName: roomData.roomName,
          meetingUrl: roomData.meetingUrl,
        },
        message: 'Room created successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // ========================================================================
    // ERROR HANDLING - FAIL LOUDLY
    // ========================================================================
    console.error('❌ CRITICAL ERROR creating LiveKit room:', {
      sessionId: params.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Check for specific error types
    if (error instanceof Error) {
      // Room already exists (409 Conflict)
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          {
            error: 'Room already exists',
            message: error.message,
          },
          { status: 409 }
        );
      }

      // Session not found (404)
      if (error.message.includes('non-existent session')) {
        return NextResponse.json(
          {
            error: 'Session not found',
            message: error.message,
          },
          { status: 404 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to create LiveKit room',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
