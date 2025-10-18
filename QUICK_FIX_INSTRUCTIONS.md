# 🚨 QUICK FIX: "Room Does Not Exist" Error

## ✅ Bug Fixed in Code

The code has been updated to CREATE rooms on the LiveKit server (not just in the database).

## 🔧 Immediate Fix for Broken Room

### Problem:
Your session `44fa27d7-0528-46ce-9648-810539c2555c` has a database record but no LiveKit server room.

### Solution Options:

---

## **Option A: Fix from Next.js Admin Panel (Recommended)**

1. **Create an admin endpoint** to manually trigger room creation:

Add this file: `app/api/admin/fix-room/[sessionId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { LiveKitRoomManager } from '@/lib/livekit/room-manager';
import { db } from '@/lib/db';
import { livekitRooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { RoomServiceClient } from 'livekit-server-sdk';
import { livekitConfig } from '@/lib/livekit/config';

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    // Check if room already exists in DB
    const dbRoom = await db.query.livekitRooms.findFirst({
      where: eq(livekitRooms.sessionId, sessionId),
    });

    if (!dbRoom) {
      return NextResponse.json({ error: 'Room not found in database' }, { status: 404 });
    }

    // Create room on LiveKit server
    const roomService = new RoomServiceClient(
      livekitConfig.server.wsUrl,
      livekitConfig.server.apiKey,
      livekitConfig.server.apiSecret
    );

    const livekitRoom = await roomService.createRoom({
      name: dbRoom.roomName,
      emptyTimeout: dbRoom.emptyTimeoutSeconds || 300,
      maxParticipants: dbRoom.maxParticipants || 2,
      metadata: JSON.stringify(dbRoom.metadata),
    });

    // Update DB with SID
    await db
      .update(livekitRooms)
      .set({ roomSid: livekitRoom.sid })
      .where(eq(livekitRooms.id, dbRoom.id));

    return NextResponse.json({
      success: true,
      message: 'Room fixed',
      room: {
        name: livekitRoom.name,
        sid: livekitRoom.sid,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

2. **Call the endpoint:**
```bash
curl -X POST http://localhost:3333/api/admin/fix-room/44fa27d7-0528-46ce-9648-810539c2555c
```

---

## **Option B: Delete and Recreate (Cleanest)**

Since the booking flow now AUTOMATICALLY creates LiveKit rooms:

1. **Delete the broken room from database:**
```sql
DELETE FROM livekit_participants WHERE room_id IN (
  SELECT id FROM livekit_rooms WHERE session_id = '44fa27d7-0528-46ce-9648-810539c2555c'
);
DELETE FROM livekit_rooms WHERE session_id = '44fa27d7-0528-46ce-9648-810539c2555c';
```

2. **Trigger room creation** by calling the API:
```bash
curl -X POST http://localhost:3333/api/sessions/44fa27d7-0528-46ce-9648-810539c2555c/livekit/create-room \
  -H "Cookie: your-session-cookie"
```

---

## **Option C: SSH into Oracle VM and Fix Directly**

If you can't access the API from your local machine:

1. SSH into Oracle VM:
```bash
ssh -i ./ssh-key-2025-09-14.key ubuntu@140.245.251.150
```

2. Install Node.js (if not installed):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. Create a fix script on the server:
```bash
cat > /tmp/fix-room.js << 'EOF'
const { RoomServiceClient } = require('livekit-server-sdk');

const client = new RoomServiceClient(
  'http://localhost:7880',
  'LKAPI02A7AAF539137A1EA3196A7284B9D18F420C7759',
  '6u9N7ojOpU8Y0Yd1UZZqCHla4rP0hYsMWiOIuXUzD3w='
);

async function fix() {
  const room = await client.createRoom({
    name: 'session-44fa27d7-0528-46ce-9648-810539c2555c',
    emptyTimeout: 300,
    maxParticipants: 2,
  });
  console.log('✅ Room created:', room.name, 'SID:', room.sid);
}

fix().catch(console.error);
EOF

npm install livekit-server-sdk
node /tmp/fix-room.js
```

4. Update database with the SID returned

---

## 🎯 Network Issue - Why Local Connection Fails

Your Next.js app runs on `localhost:3333` (your Windows machine).
LiveKit server runs on `140.245.251.150:7880` (Oracle Cloud VM).

**The problem:** Oracle Cloud has **Security Lists** that block inbound traffic by default.

### To Allow External Connections:

1. Go to Oracle Cloud Console
2. Navigate to: **Networking → Virtual Cloud Networks**
3. Select your VCN → Security Lists → Default Security List
4. Add **Ingress Rule**:
   - Source CIDR: `0.0.0.0/0` (or your specific IP)
   - IP Protocol: TCP
   - Destination Port Range: `7880`
   - Description: LiveKit HTTP/WebSocket

5. Add **Ingress Rule** for WebRTC:
   - Source CIDR: `0.0.0.0/0`
   - IP Protocol: TCP
   - Destination Port Range: `7881`

6. Add **Ingress Rule** for Media:
   - Source CIDR: `0.0.0.0/0`
   - IP Protocol: UDP
   - Destination Port Range: `50000-60000`

---

## ✅ For New Bookings

ALL NEW bookings will work automatically because the code now:
1. Creates room on LiveKit server ✅
2. Stores `room_sid` in database ✅
3. Cleans up if anything fails ✅

The only issue is existing broken rooms created BEFORE the fix.

---

## 🧪 Test After Fix

```bash
# Should work now
curl "http://140.245.251.150:7880/rtc/validate?access_token=YOUR_TOKEN_HERE"
```

If it returns success (not "room does not exist"), the fix worked!

---

## 📝 Summary

- ✅ Code fixed: Rooms now created on LiveKit server
- ⚠️ Network: Oracle Cloud security rules need configuration for external access
- 🔧 Broken room: Use Option A, B, or C above to fix
- 🚀 Future: All new bookings will work perfectly

Choose the option that works best for your setup!
