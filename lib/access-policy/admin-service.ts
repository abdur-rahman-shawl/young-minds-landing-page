import { desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { logAdminAction } from '@/lib/db/audit';
import { accessPolicyConfigs } from '@/lib/db/schema';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import type { TRPCContext } from '@/lib/trpc/context';
import {
  ACCESS_POLICY_CONFIG_SCHEMA_VERSION,
  buildAccessPolicyRuntimeConfig,
  DEFAULT_ACCESS_POLICY_RUNTIME_CONFIG,
  parseAccessPolicyConfigOverrides,
  type AccessPolicyConfigOverrides,
} from '@/lib/access-policy/runtime-config';
import {
  adminResetAccessPolicyDraftInputSchema,
  adminUpsertAccessPolicyDraftInputSchema,
  type AdminResetAccessPolicyDraftInput,
  type AdminUpsertAccessPolicyDraftInput,
} from '@/lib/access-policy/admin-schemas';
import { AdminServiceError, assertAdminService } from '@/lib/admin/server/errors';

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getUserWithRoles>>>;

type AccessPolicyAdminContext = Pick<TRPCContext, 'db'> & {
  userId: string;
  currentUser?: CurrentUser;
};

function getAccessPolicyDb(context?: Pick<TRPCContext, 'db'>) {
  return context?.db ?? db;
}

async function getAdminActor(
  context: AccessPolicyAdminContext
): Promise<CurrentUser> {
  const resolvedUser =
    context.currentUser ?? (await getUserWithRoles(context.userId));

  const isAdmin = resolvedUser?.roles.some(
    (role: { name: string }) => role.name === 'admin'
  );

  assertAdminService(resolvedUser, 401, 'Authentication required');
  assertAdminService(isAdmin, 403, 'Admin access required');

  return resolvedUser;
}

function normalizeNotes(notes?: string | null) {
  const trimmed = notes?.trim();
  return trimmed ? trimmed : null;
}

async function listConfigRows(context: AccessPolicyAdminContext) {
  return getAccessPolicyDb(context)
    .select()
    .from(accessPolicyConfigs)
    .orderBy(desc(accessPolicyConfigs.version));
}

async function getConfigRowByStatus(
  context: AccessPolicyAdminContext,
  status: 'draft' | 'published'
) {
  const [row] = await getAccessPolicyDb(context)
    .select()
    .from(accessPolicyConfigs)
    .where(eq(accessPolicyConfigs.status, status))
    .limit(1);

  return row ?? null;
}

async function getNextConfigVersion(context: AccessPolicyAdminContext) {
  const [row] = await getAccessPolicyDb(context)
    .select({
      version: accessPolicyConfigs.version,
    })
    .from(accessPolicyConfigs)
    .orderBy(desc(accessPolicyConfigs.version))
    .limit(1);

  return row ? row.version + 1 : 1;
}

function serializeAccessPolicyRow(
  row: typeof accessPolicyConfigs.$inferSelect | null
) {
  if (!row) {
    return null;
  }

  const overrides = parseAccessPolicyConfigOverrides(row.config) ?? {};
  const effective = buildAccessPolicyRuntimeConfig(overrides, {
    source: row.status === 'published' ? 'published' : 'baseline',
    version: row.version,
    schemaVersion: row.schemaVersion,
    configId: row.id,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  });

  return {
    id: row.id,
    version: row.version,
    status: row.status,
    schemaVersion: row.schemaVersion,
    notes: row.notes,
    overrides,
    effective,
    createdBy: row.createdBy,
    publishedBy: row.publishedBy,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

export async function getAdminAccessPolicyConfig(
  context: AccessPolicyAdminContext
) {
  await getAdminActor(context);

  const rows = await listConfigRows(context);
  const published = rows.find((row) => row.status === 'published') ?? null;
  const draft = rows.find((row) => row.status === 'draft') ?? null;

  return {
    baseline: DEFAULT_ACCESS_POLICY_RUNTIME_CONFIG,
    published: serializeAccessPolicyRow(published),
    draft: serializeAccessPolicyRow(draft),
    versions: rows.map((row) => ({
      id: row.id,
      version: row.version,
      status: row.status,
      schemaVersion: row.schemaVersion,
      notes: row.notes,
      createdBy: row.createdBy,
      publishedBy: row.publishedBy,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    })),
  };
}

export async function upsertAdminAccessPolicyDraft(
  context: AccessPolicyAdminContext,
  input: AdminUpsertAccessPolicyDraftInput
) {
  const actor = await getAdminActor(context);
  const parsed = adminUpsertAccessPolicyDraftInputSchema.parse(input);
  const database = getAccessPolicyDb(context);
  const draft = await getConfigRowByStatus(context, 'draft');
  const notes = normalizeNotes(parsed.notes);
  const now = new Date();

  const [row] = draft
    ? await database
        .update(accessPolicyConfigs)
        .set({
          config: parsed.overrides,
          notes,
          updatedAt: now,
        })
        .where(eq(accessPolicyConfigs.id, draft.id))
        .returning()
    : await database
        .insert(accessPolicyConfigs)
        .values({
          version: await getNextConfigVersion(context),
          status: 'draft',
          schemaVersion: ACCESS_POLICY_CONFIG_SCHEMA_VERSION,
          config: parsed.overrides,
          notes,
          createdBy: actor.id,
          updatedAt: now,
        })
        .returning();

  await logAdminAction({
    adminId: actor.id,
    action: draft
      ? 'access_policy_draft_updated'
      : 'access_policy_draft_created',
    targetId: row.id,
    targetType: 'access_policy_config',
    details: {
      version: row.version,
      notes,
    },
  });

  return {
    ...(await getAdminAccessPolicyConfig(context)),
    draft: serializeAccessPolicyRow(row),
  };
}

export async function publishAdminAccessPolicyDraft(
  context: AccessPolicyAdminContext
) {
  const actor = await getAdminActor(context);
  const database = getAccessPolicyDb(context);
  const draft = await getConfigRowByStatus(context, 'draft');

  assertAdminService(draft, 404, 'No access policy draft found to publish');

  const now = new Date();
  const [currentPublished] = await database
    .select()
    .from(accessPolicyConfigs)
    .where(eq(accessPolicyConfigs.status, 'published'))
    .limit(1);

  const [publishedRow] = await database.transaction(async (tx) => {
    if (currentPublished) {
      await tx
        .update(accessPolicyConfigs)
        .set({
          status: 'archived',
          updatedAt: now,
        })
        .where(eq(accessPolicyConfigs.id, currentPublished.id));
    }

    return tx
      .update(accessPolicyConfigs)
      .set({
        status: 'published',
        publishedBy: actor.id,
        publishedAt: now,
        updatedAt: now,
      })
      .where(eq(accessPolicyConfigs.id, draft.id))
      .returning();
  });

  await logAdminAction({
    adminId: actor.id,
    action: 'access_policy_published',
    targetId: publishedRow.id,
    targetType: 'access_policy_config',
    details: {
      version: publishedRow.version,
      archivedVersion: currentPublished?.version ?? null,
    },
  });

  return getAdminAccessPolicyConfig(context);
}

export async function resetAdminAccessPolicyDraft(
  context: AccessPolicyAdminContext,
  input?: AdminResetAccessPolicyDraftInput
) {
  const actor = await getAdminActor(context);
  const parsed = adminResetAccessPolicyDraftInputSchema.parse(input);
  const database = getAccessPolicyDb(context);
  const draft = await getConfigRowByStatus(context, 'draft');
  const published = await getConfigRowByStatus(context, 'published');
  const nextOverrides: AccessPolicyConfigOverrides =
    parsed?.source === 'baseline'
      ? {}
      : parseAccessPolicyConfigOverrides(published?.config) ?? {};
  const nextNotes =
    parsed?.source === 'baseline' ? null : normalizeNotes(published?.notes);
  const now = new Date();

  const [row] = draft
    ? await database
        .update(accessPolicyConfigs)
        .set({
          config: nextOverrides,
          notes: nextNotes,
          updatedAt: now,
        })
        .where(eq(accessPolicyConfigs.id, draft.id))
        .returning()
    : await database
        .insert(accessPolicyConfigs)
        .values({
          version: await getNextConfigVersion(context),
          status: 'draft',
          schemaVersion: ACCESS_POLICY_CONFIG_SCHEMA_VERSION,
          config: nextOverrides,
          notes: nextNotes,
          createdBy: actor.id,
          updatedAt: now,
        })
        .returning();

  await logAdminAction({
    adminId: actor.id,
    action: 'access_policy_draft_reset',
    targetId: row.id,
    targetType: 'access_policy_config',
    details: {
      version: row.version,
      source: parsed?.source ?? 'published',
    },
  });

  return {
    ...(await getAdminAccessPolicyConfig(context)),
    draft: serializeAccessPolicyRow(row),
  };
}
