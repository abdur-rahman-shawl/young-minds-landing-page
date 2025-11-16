/**
 * GET /api/sessions/[sessionId]/livekit/access-token
 *
 * Generates a secure LiveKit access token for an authenticated participant.
 *
 * Security:
 * - Requires authentication
 * - Validates user is a participant of the session
 * - Validates session ID format (UUID)
 * - Generates JWT token server-side only
 * - Tokens expire after 24 hours
 * - Fails loudly on any error
 *
 * Called by: Meeting room page when user joins
 *
 * Response:
 * - 200: Token generated successfully
 * - 400: Invalid session ID
 * - 401: Unauthorized (not logged in)
 * - 403: Forbidden (not a participant or kicked)
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

export async function GET(
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
      console.error('❌ Unauthorized attempt to get access token - no session');
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required. Please log in to access the meeting.',
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

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
    // TOKEN GENERATION
    // ========================================================================
    console.log(
      `🔐 Generating access token for user ${userId} in session ${sessionId}`
    );

    const tokenData = await LiveKitRoomManager.generateAccessToken(
      sessionId,
      userId
    );

    console.log(
      `✅ Access token generated for ${tokenData.participantName} in room ${tokenData.roomName}`
    );

    // ========================================================================
    // SUCCESS RESPONSE
    // ========================================================================
    return NextResponse.json(
      {
        success: true,
        data: {
          token: tokenData.token,
          roomName: tokenData.roomName,
          participantName: tokenData.participantName,
          wsUrl: tokenData.wsUrl,
          expiresAt: tokenData.expiresAt.toISOString(),
        },
        message: 'Access token generated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // ========================================================================
    // ERROR HANDLING - FAIL LOUDLY
    // ========================================================================
    console.error('❌ CRITICAL ERROR generating access token:', {
      sessionId: params.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Check for specific error types
    if (error instanceof Error) {
      // User not authorized (403 Forbidden)
      if (
        error.message.includes('UNAUTHORIZED') ||
        error.message.includes('not a participant')
      ) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You are not authorized to join this meeting',
            details: error.message,
          },
          { status: 403 }
        );
      }

      // User kicked (403 Forbidden)
      if (error.message.includes('FORBIDDEN') || error.message.includes('kicked')) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You have been removed from this meeting',
            details: error.message,
          },
          { status: 403 }
        );
      }

      // Room not found (404)
      if (error.message.includes('No LiveKit room found')) {
        return NextResponse.json(
          {
            error: 'Room not found',
            message: 'No meeting room exists for this session',
            details: error.message,
          },
          { status: 404 }
        );
      }

      // User not found (500 - critical)
      if (error.message.includes('User') && error.message.includes('not found')) {
        return NextResponse.json(
          {
            error: 'Internal server error',
            message: 'User data inconsistency detected',
            details: error.message,
          },
          { status: 500 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to generate access token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
