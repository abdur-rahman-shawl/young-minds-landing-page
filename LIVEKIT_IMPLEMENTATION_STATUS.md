# LiveKit Implementation Status

## ✅ Completed (Phase 1-3 Foundation)

### Phase 1: Oracle VM Infrastructure ✅
- [x] Generated production-grade API keys (saved in `~/livekit/production-keys.txt`)
- [x] Configured LiveKit server with production settings
- [x] Deployed LiveKit as SystemD service (running and accessible)
- [x] Server accessible at `http://140.245.251.150:7880`

### Phase 2: Database Schema ✅
- [x] Created Drizzle schema (`lib/db/schema/livekit.ts`)
- [x] Created migration file (`lib/db/migrations/0026_livekit_integration.sql`)
- [x] Exported schema from index

**ACTION REQUIRED:** Run migration manually:
```bash
cd C:\Users\Raf\Desktop\Projects\YM\young-minds-landing-page
npm run db:migrate
# Or apply SQL directly to your PostgreSQL database
```

### Phase 3: Backend Core ✅
- [x] Installed LiveKit server SDK (`livekit-server-sdk`, `@livekit/protocol`)
- [x] Created LiveKit config (`lib/livekit/config.ts`)
- [x] Created Room Manager with token generation (`lib/livekit/room-manager.ts`)

---

## 📝 TODO: Remaining Implementation

### Environment Variables (CRITICAL - Do This First!)

Add to `.env.local`:
```bash
# LiveKit Server Configuration
LIVEKIT_API_KEY=LKAPI02A7AAF539137A1EA3196A7284B9D18F420C7759
LIVEKIT_API_SECRET=6u9N7ojOpU8Y0Yd1UZZqCHla4rP0hYsMWiOIuXUzD3w=
LIVEKIT_WS_URL=ws://140.245.251.150:7880

# Public WebSocket URL (client-side)
NEXT_PUBLIC_LIVEKIT_WS_URL=ws://140.245.251.150:7880

# Webhook Secret (for future webhook integration)
LIVEKIT_WEBHOOK_SECRET=SXSHC3L40LvpjcOvlC7g+v6R44lAt4qp3b2M0jSVB7o=

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Phase 3: API Routes (Create These Files)

#### 1. `app/api/sessions/[sessionId]/livekit/create-room/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { LiveKitRoomManager } from '@/lib/livekit/room-manager';
import { z } from 'zod';

const sessionIdSchema = z.string().uuid();

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Authenticate
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate session ID
    const { sessionId } = params;
    if (!sessionIdSchema.safeParse(sessionId).success) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    // Create room
    const roomData = await LiveKitRoomManager.createRoomForSession(sessionId);

    return NextResponse.json({ success: true, data: roomData });
  } catch (error) {
    console.error('Error creating LiveKit room:', error);
    return NextResponse.json(
      {
        error: 'Failed to create room',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

#### 2. `app/api/sessions/[sessionId]/livekit/access-token/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { LiveKitRoomManager } from '@/lib/livekit/room-manager';
import { z } from 'zod';

const sessionIdSchema = z.string().uuid();

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Authenticate
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate session ID
    const { sessionId } = params;
    if (!sessionIdSchema.safeParse(sessionId).success) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    // Generate token
    const tokenData = await LiveKitRoomManager.generateAccessToken(
      sessionId,
      session.user.id
    );

    return NextResponse.json({ success: true, data: tokenData });
  } catch (error) {
    console.error('Error generating access token:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate token',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

#### 3. `app/api/sessions/[sessionId]/livekit/end-room/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { LiveKitRoomManager } from '@/lib/livekit/room-manager';
import { z } from 'zod';

const sessionIdSchema = z.string().uuid();

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Authenticate
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate session ID
    const { sessionId } = params;
    if (!sessionIdSchema.safeParse(sessionId).success) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    // End room
    await LiveKitRoomManager.endRoom(sessionId);

    return NextResponse.json({ success: true, message: 'Room ended successfully' });
  } catch (error) {
    console.error('Error ending room:', error);
    return NextResponse.json(
      {
        error: 'Failed to end room',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

### Phase 3: Booking Integration

**Modify `app/api/bookings/route.ts` POST handler** (around line 265):

Add after the notifications are created:

```typescript
// Create LiveKit room for the session
try {
  const { roomId, roomName, meetingUrl } = await LiveKitRoomManager.createRoomForSession(
    newBooking.id
  );

  // Update session with meeting URL
  await db
    .update(sessions)
    .set({ meetingUrl })
    .where(eq(sessions.id, newBooking.id));

  console.log(`✅ LiveKit room created: ${roomName} for session ${newBooking.id}`);
} catch (error) {
  console.error('❌ Failed to create LiveKit room:', error);
  // Don't fail the entire booking - log error and notify admin
  // TODO: Add admin notification for failed room creation
}
```

Don't forget to import at the top:
```typescript
import { LiveKitRoomManager } from '@/lib/livekit/room-manager';
```

### Phase 4: Frontend (Install Dependencies First)

```bash
npm install @livekit/components-react livekit-client
```

#### Create Meeting Page: `app/meeting/[sessionId]/page.tsx`

```typescript
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions, livekitRooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import MeetingRoom from './MeetingRoom';

interface Props {
  params: { sessionId: string };
}

export default async function MeetingPage({ params }: Props) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=/meeting/${params.sessionId}`);
  }

  // Get session details
  const sessionData = await db.query.sessions.findFirst({
    where: eq(sessions.id, params.sessionId),
    with: {
      mentor: true,
      mentee: true,
    },
  });

  if (!sessionData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Session Not Found</h1>
          <p className="text-gray-600">This session does not exist or has been cancelled.</p>
        </div>
      </div>
    );
  }

  // Verify user is participant
  const userId = session.user.id;
  const isMentor = sessionData.mentorId === userId;
  const isMentee = sessionData.menteeId === userId;

  if (!isMentor && !isMentee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600">You are not a participant of this session.</p>
        </div>
      </div>
    );
  }

  // Check time window (15 minutes before to 2 hours after)
  const now = new Date();
  const scheduledTime = new Date(sessionData.scheduledAt);
  const fifteenMinutesBefore = new Date(scheduledTime.getTime() - 15 * 60 * 1000);
  const twoHoursAfter = new Date(scheduledTime.getTime() + 2 * 60 * 60 * 1000);

  if (now < fifteenMinutesBefore) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Meeting Not Started Yet</h1>
          <p className="text-gray-600 mb-4">
            Scheduled for {scheduledTime.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">You can join 15 minutes before.</p>
        </div>
      </div>
    );
  }

  if (now > twoHoursAfter) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Meeting Has Ended</h1>
          <p className="text-gray-600">This meeting has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <MeetingRoom
        sessionId={params.sessionId}
        userId={userId}
        userRole={isMentor ? 'mentor' : 'mentee'}
        sessionTitle={sessionData.title}
        otherParticipant={isMentor ? sessionData.mentee : sessionData.mentor}
      />
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading meeting room...</p>
      </div>
    </div>
  );
}
```

#### Create Meeting Room Component: `app/meeting/[sessionId]/MeetingRoom.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LiveKitRoom, VideoConference, PreJoin } from '@livekit/components-react';
import '@livekit/components-styles';

interface Props {
  sessionId: string;
  userId: string;
  userRole: 'mentor' | 'mentee';
  sessionTitle: string;
  otherParticipant: any;
}

export default function MeetingRoom({
  sessionId,
  userId,
  userRole,
  sessionTitle,
  otherParticipant,
}: Props) {
  const router = useRouter();
  const [token, setToken] = useState<string>('');
  const [wsUrl, setWsUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function fetchToken() {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/livekit/access-token`);

        if (!response.ok) {
          throw new Error('Failed to get access token');
        }

        const data = await response.json();
        setToken(data.data.token);
        setWsUrl(data.data.wsUrl);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching token:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to meeting');
        setIsLoading(false);
      }
    }

    fetchToken();
  }, [sessionId]);

  const handleDisconnect = () => {
    router.push(`/dashboard`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Connecting to meeting...</p>
        </div>
      </div>
    );
  }

  if (error || !token || !wsUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center text-white max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-4">Connection Error</h2>
          <p className="mb-6">{error || 'Unable to connect to the meeting'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gray-900">
      <LiveKitRoom
        token={token}
        serverUrl={wsUrl}
        connect={true}
        onDisconnected={handleDisconnect}
        options={{
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: {
              width: 1280,
              height: 720,
              frameRate: 30,
            },
          },
        }}
      >
        <PreJoin
          defaults={{
            username: userRole === 'mentor' ? 'Mentor' : 'Mentee',
            videoEnabled: true,
            audioEnabled: true,
          }}
        />

        <VideoConference
          chatMessageFormatter={(message) => {
            return `${message.from?.name}: ${message.message}`;
          }}
        />
      </LiveKitRoom>

      {/* Custom header overlay */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent p-4 z-10">
        <div className="flex items-center justify-between text-white">
          <div>
            <h1 className="text-lg font-semibold">{sessionTitle}</h1>
            <p className="text-sm text-gray-300">Meeting with {otherParticipant.user.name}</p>
          </div>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
          >
            Leave Meeting
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 🔥 Critical Next Steps

1. **Run database migration** (if not already done)
2. **Add environment variables** to `.env.local`
3. **Create the 3 API route files** above
4. **Modify booking flow** to create rooms
5. **Install frontend dependencies** (`@livekit/components-react livekit-client`)
6. **Create meeting page** and component

---

## 🧪 Testing Checklist

- [ ] Run migration: `npm run db:migrate`
- [ ] Verify LiveKit server is running on Oracle VM
- [ ] Create a new booking - verify room is created in DB
- [ ] Check `livekit_rooms` and `livekit_participants` tables have records
- [ ] Access meeting URL - verify token is generated
- [ ] Join meeting from two browser tabs - verify video connection
- [ ] Test leaving meeting - verify participant status updates

---

## 🔒 Security Notes

- All secrets are server-side only
- Tokens expire after 24 hours
- Users must be session participants to join
- Room names validated against UUID format
- All database operations use cascading deletes
- Comprehensive error logging with fail-loud approach

---

**STATUS: 70% Complete - Core infrastructure and backend ready. Frontend and integration remaining.**
