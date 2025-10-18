/**
 * Fix Existing Broken LiveKit Rooms
 *
 * This script repairs rooms that were created in the database but not on the LiveKit server.
 * Run this ONCE after deploying the fix to create missing rooms on LiveKit server.
 *
 * Usage:
 *   npx tsx scripts/fix-existing-rooms.ts
 */

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { RoomServiceClient } from 'livekit-server-sdk';
import { db } from '../lib/db';
import { livekitRooms, sessions } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { livekitConfig } from '../lib/livekit/config';

async function fixExistingRooms() {
  console.log('🔧 Starting LiveKit room repair process...\n');

  try {
    // Get all pending/active rooms from database
    const rooms = await db.query.livekitRooms.findMany({
      where: eq(livekitRooms.status, 'pending'),
      with: {
        session: true,
      },
    });

    console.log(`Found ${rooms.length} rooms in 'pending' status to check\n`);

    if (rooms.length === 0) {
      console.log('✅ No rooms need fixing');
      return;
    }

    const roomService = new RoomServiceClient(
      livekitConfig.server.wsUrl,
      livekitConfig.server.apiKey,
      livekitConfig.server.apiSecret
    );

    // Get list of existing rooms on LiveKit server
    const livekitRoomList = await roomService.listRooms();
    const existingRoomNames = new Set(livekitRoomList.map((r) => r.name));

    let fixed = 0;
    let errors = 0;

    for (const room of rooms) {
      try {
        // Check if room exists on LiveKit server
        if (existingRoomNames.has(room.roomName)) {
          console.log(`✅ Room already exists on server: ${room.roomName}`);
          continue;
        }

        // Create missing room on LiveKit server
        console.log(`🔨 Creating missing room: ${room.roomName}`);

        const livekitRoom = await roomService.createRoom({
          name: room.roomName,
          emptyTimeout: room.emptyTimeoutSeconds || livekitConfig.room.emptyTimeoutSeconds,
          maxParticipants: room.maxParticipants || livekitConfig.room.maxParticipants,
          metadata: JSON.stringify({
            sessionId: room.sessionId,
            sessionTitle: room.session?.title,
            repairedAt: new Date().toISOString(),
          }),
        });

        // Update database with LiveKit SID
        await db
          .update(livekitRooms)
          .set({
            roomSid: livekitRoom.sid,
            metadata: {
              ...room.metadata,
              livekitCreatedAt: Number(livekitRoom.creationTime),
              repairedAt: new Date().toISOString(),
            },
          })
          .where(eq(livekitRooms.id, room.id));

        console.log(`✅ Fixed room: ${room.roomName} (SID: ${livekitRoom.sid})\n`);
        fixed++;
      } catch (error) {
        console.error(`❌ Error fixing room ${room.roomName}:`, error);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Repair complete: ${fixed} rooms fixed, ${errors} errors`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ CRITICAL ERROR during repair:', error);
    process.exit(1);
  }
}

// Run the script
fixExistingRooms()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
