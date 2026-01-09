import { db } from '@/lib/db';
import { auditEvents } from '@/lib/db/schema/audit-events';

type JsonRecord = Record<string, any>;

export interface AuditActor {
  type: string;
  id?: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditResource {
  type: string;
  id?: string;
}

export interface RecordAuditEventInput {
  action: string;
  actor: AuditActor;
  resource: AuditResource;
  status?: string;
  requestId?: string;
  traceId?: string;
  occurredAt?: Date;
  details?: JsonRecord;
  diff?: JsonRecord;
  schemaVersion?: number;
}

export async function recordAuditEvent(input: RecordAuditEventInput) {
  const { actor, resource, ...rest } = input;

  await db.insert(auditEvents).values({
    occurredAt: rest.occurredAt,
    actorType: actor.type,
    actorId: actor.id,
    actorRole: actor.role,
    action: rest.action,
    resourceType: resource.type,
    resourceId: resource.id,
    status: rest.status,
    requestId: rest.requestId,
    traceId: rest.traceId,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
    details: rest.details,
    diff: rest.diff,
    schemaVersion: rest.schemaVersion,
  });
}
