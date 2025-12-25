import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { consentEvents } from '@/lib/db/schema';

const consentEventSchema = z.object({
  consentType: z.string().min(1),
  consentVersion: z.string().optional(),
  action: z.enum(['granted', 'denied', 'revoked']),
  source: z.enum(['ui', 'oauth', 'browser_prompt', 'system']),
  userRole: z.string().optional(),
  context: z.record(z.any()).optional(),
});

const consentEventsSchema = z.array(consentEventSchema).min(1);

const getRequestIp = (req: NextRequest) => {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const [first] = forwardedFor.split(',');
    return first?.trim() || null;
  }
  return req.headers.get('x-real-ip') || null;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = Array.isArray(body?.events) ? body.events : [body];
    const validatedEvents = consentEventsSchema.parse(events);

    const session = await auth.api.getSession({ headers: req.headers });
    const userId = session?.user?.id ?? null;
    const userEmail = session?.user?.email ?? null;
    const ipAddress = getRequestIp(req);
    const userAgent = req.headers.get('user-agent');

    const values = validatedEvents.map((event) => ({
      consentType: event.consentType,
      consentVersion: event.consentVersion,
      action: event.action,
      source: event.source,
      context: event.context ?? {},
      userId,
      userEmail,
      userRole: event.userRole ?? null,
      ipAddress,
      userAgent,
    }));

    await db.insert(consentEvents).values(values);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid consent payload' }, { status: 400 });
    }
    console.error('Consent capture error:', error);
    return NextResponse.json({ error: 'Failed to capture consent' }, { status: 500 });
  }
}
