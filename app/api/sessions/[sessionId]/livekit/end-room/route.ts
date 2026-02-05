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
import { LiveKitRoomManager } from '@/lib/livekit/room-manager';
import { z } from 'zod';
import { requireUserWithRoles } from '@/lib/api/guards';
import { db } from '@/lib/db';
import { sessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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
    const guard = await requireUserWithRoles(request);
    if ('error' in guard) {
      return guard.error;
    }
    const currentUserId = guard.session.user.id;
    const isAdmin = guard.user.roles.some((role) => role.name === 'admin');

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
    const sessionRecord = await db
      .select({
        mentorId: sessions.mentorId,
        menteeId: sessions.menteeId,
      })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!sessionRecord.length) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const { mentorId, menteeId } = sessionRecord[0];
    const isParticipant = mentorId === currentUserId || menteeId === currentUserId;

    if (!isAdmin && !isParticipant) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You are not authorized to end this room' },
        { status: 403 }
      );
    }

    console.log(
      `🛑 Ending LiveKit room for session ${sessionId} by user ${currentUserId}`
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
