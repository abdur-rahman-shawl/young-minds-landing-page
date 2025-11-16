/**
 * POST /api/sessions/[sessionId]/livekit/end-room
 *
 * Gracefully ends a LiveKit room.
 *
 * Security:
 * - Requires authentication
 * - Validates session ID format (UUID)
 * - Updates room and participant status
 * - Fails loudly on any error
 *
 * Called by: Session completion or cancellation flow
 *
 * Response:
 * - 200: Room ended successfully
 * - 400: Invalid session ID
 * - 401: Unauthorized
 * - 404: Room not found
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
      console.error('❌ Unauthorized attempt to end room - no session');
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required to end a room.',
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
    // END ROOM
    // ========================================================================
    console.log(
      `🛑 Ending LiveKit room for session ${sessionId} by user ${session.user.id}`
    );

    await LiveKitRoomManager.endRoom(sessionId);

    console.log(`✅ LiveKit room ended successfully for session ${sessionId}`);

    // ========================================================================
    // SUCCESS RESPONSE
    // ========================================================================
    return NextResponse.json(
      {
        success: true,
        message: 'Room ended successfully',
        data: {
          sessionId,
          endedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // ========================================================================
    // ERROR HANDLING - FAIL LOUDLY
    // ========================================================================
    console.error('❌ CRITICAL ERROR ending LiveKit room:', {
      sessionId: params.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Check for specific error types
    if (error instanceof Error) {
      // Room not found (404)
      if (error.message.includes('no room found')) {
        return NextResponse.json(
          {
            error: 'Room not found',
            message: 'No meeting room exists for this session',
            details: error.message,
          },
          { status: 404 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to end room',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
