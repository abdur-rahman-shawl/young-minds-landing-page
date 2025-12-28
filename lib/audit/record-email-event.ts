import { db } from '@/lib/db';
import { emailEvents } from '@/lib/db/schema/email-events';

type JsonRecord = Record<string, any>;

export interface RecordEmailEventInput {
  action: string;
  to: string;
  subject?: string;
  template?: string;
  actorType?: string;
  actorId?: string;
  details?: JsonRecord;
  occurredAt?: Date;
}

export async function recordEmailEvent(input: RecordEmailEventInput) {
  await db.insert(emailEvents).values({
    action: input.action,
    to: input.to,
    subject: input.subject,
    template: input.template,
    actorType: input.actorType,
    actorId: input.actorId,
    details: input.details,
    occurredAt: input.occurredAt,
  });
}
