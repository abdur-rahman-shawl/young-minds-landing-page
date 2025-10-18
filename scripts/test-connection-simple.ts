/**
 * Simple LiveKit Connection Test (Direct - No Config Import)
 */

import * as dotenv from 'dotenv';
import { RoomServiceClient } from 'livekit-server-sdk';

// Load env
dotenv.config({ path: '.env.local' });

const API_KEY = process.env.LIVEKIT_API_KEY!;
const API_SECRET = process.env.LIVEKIT_API_SECRET!;
const WS_URL = process.env.LIVEKIT_WS_URL!;

async function test() {
  console.log('Testing LiveKit Connection...\n');
  console.log('Config:');
  console.log(`  WS URL: ${WS_URL}`);
  console.log(`  API Key: ${API_KEY?.substring(0, 15)}...`);
  console.log('');

  try {
    const client = new RoomServiceClient(WS_URL, API_KEY, API_SECRET);

    console.log('1. Listing rooms...');
    const rooms = await client.listRooms();
    console.log(`✅ Connected! Found ${rooms.length} rooms`);

    if (rooms.length > 0) {
      console.log('\nExisting rooms:');
      rooms.forEach((r) => {
        console.log(`  - ${r.name} (${r.numParticipants} participants)`);
      });
    }

    console.log('\n2. Creating test room...');
    const testRoom = await client.createRoom({
      name: `test-${Date.now()}`,
      emptyTimeout: 300,
      maxParticipants: 2,
    });
    console.log(`✅ Created: ${testRoom.name}`);

    console.log('\n3. Deleting test room...');
    await client.deleteRoom(testRoom.name);
    console.log(`✅ Deleted: ${testRoom.name}`);

    console.log('\n✅ ALL TESTS PASSED!\n');
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  }
}

test();
