/**
 * Test LiveKit Server Connection and Room Creation
 *
 * Verifies:
 * 1. Connection to LiveKit server
 * 2. API credentials are valid
 * 3. Can create and delete test rooms
 *
 * Usage:
 *   npx tsx scripts/test-livekit-connection.ts
 */

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { RoomServiceClient } from 'livekit-server-sdk';
import { livekitConfig } from '../lib/livekit/config';

async function testLiveKitConnection() {
  console.log('🧪 Testing LiveKit Server Connection\n');
  console.log('='.repeat(60));

  // Configuration
  console.log('Configuration:');
  console.log(`  API Key: ${livekitConfig.server.apiKey.substring(0, 10)}...`);
  console.log(`  WS URL:  ${livekitConfig.server.wsUrl}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Create client
    const roomService = new RoomServiceClient(
      livekitConfig.server.wsUrl,
      livekitConfig.server.apiKey,
      livekitConfig.server.apiSecret
    );

    // Test 1: List existing rooms
    console.log('Test 1: List Existing Rooms');
    console.log('-'.repeat(40));
    const rooms = await roomService.listRooms();
    console.log(`✅ Successfully connected to LiveKit server`);
    console.log(`✅ Found ${rooms.length} existing rooms\n`);

    if (rooms.length > 0) {
      console.log('Existing rooms:');
      rooms.forEach((room, i) => {
        console.log(`  ${i + 1}. ${room.name} (SID: ${room.sid})`);
        console.log(`     Participants: ${room.numParticipants}`);
        console.log(`     Created: ${new Date(room.creationTime * 1000).toLocaleString()}\n`);
      });
    }

    // Test 2: Create a test room
    const testRoomName = `test-room-${Date.now()}`;
    console.log('Test 2: Create Test Room');
    console.log('-'.repeat(40));
    console.log(`Creating test room: ${testRoomName}`);

    const testRoom = await roomService.createRoom({
      name: testRoomName,
      emptyTimeout: 300,
      maxParticipants: 2,
      metadata: JSON.stringify({
        test: true,
        createdAt: new Date().toISOString(),
      }),
    });

    console.log(`✅ Test room created successfully!`);
    console.log(`   Name: ${testRoom.name}`);
    console.log(`   SID:  ${testRoom.sid}\n`);

    // Test 3: Verify room exists
    console.log('Test 3: Verify Room Exists');
    console.log('-'.repeat(40));
    const allRooms = await roomService.listRooms();
    const testRoomExists = allRooms.some((r) => r.name === testRoomName);

    if (testRoomExists) {
      console.log(`✅ Test room verified in room list\n`);
    } else {
      throw new Error('Test room not found in room list');
    }

    // Test 4: Delete test room
    console.log('Test 4: Delete Test Room');
    console.log('-'.repeat(40));
    await roomService.deleteRoom(testRoomName);
    console.log(`✅ Test room deleted successfully\n`);

    // Final verification
    const finalRooms = await roomService.listRooms();
    const testRoomStillExists = finalRooms.some((r) => r.name === testRoomName);

    if (!testRoomStillExists) {
      console.log(`✅ Verified test room was deleted\n`);
    } else {
      throw new Error('Test room still exists after deletion');
    }

    // Success
    console.log('='.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(60));
    console.log('\n🎉 LiveKit server connection is working perfectly!\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED\n');
    console.error('Error:', error);
    console.error('\nPossible issues:');
    console.error('  1. LiveKit server is not running');
    console.error('  2. API credentials are incorrect');
    console.error('  3. Network connectivity issues');
    console.error('  4. Firewall blocking connection\n');
    process.exit(1);
  }
}

// Run the test
testLiveKitConnection()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });
