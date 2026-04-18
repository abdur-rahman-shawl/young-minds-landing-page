import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db';
import {
  accessPolicyConfigs,
  type AccessPolicyConfig,
} from '@/lib/db/schema';
import {
  ACCOUNT_ACCESS_REASON_CODES,
  ACCOUNT_CONFIGURABLE_STATUSES,
} from '@/lib/access-policy/account';
import {
  DEFAULT_MENTEE_POLICY_CONFIG,
  MENTEE_FEATURE_KEYS,
  MENTEE_SUBSCRIPTION_POLICY_RULE_CODES,
  MENTEE_SUBSCRIPTION_POLICY_STATES,
  mergeMenteePolicyConfig,
  type MenteePolicyConfig,
  type MenteePolicyConfigOverrides,
} from '@/lib/mentee/access-policy';
import {
  DEFAULT_MENTOR_POLICY_CONFIG,
  MENTOR_FEATURE_KEYS,
  MENTOR_PAYMENT_POLICY_RULE_CODES,
  MENTOR_PAYMENT_STATUSES,
  MENTOR_SUBSCRIPTION_POLICY_RULE_CODES,
  MENTOR_SUBSCRIPTION_POLICY_STATES,
  MENTOR_VERIFICATION_POLICY_RULE_CODES,
  MENTOR_VERIFICATION_STATUSES,
  mergeMentorPolicyConfig,
  type MentorPolicyConfig,
  type MentorPolicyConfigOverrides,
} from '@/lib/mentor/access-policy';

export const ACCESS_POLICY_CONFIG_SCHEMA_VERSION = 1;

function createPartialEnumRecordSchema<T extends z.ZodTypeAny>(
  keys: readonly string[],
  valueSchema: T
) {
  return z
    .object(
      Object.fromEntries(
        keys.map((key) => [key, valueSchema.optional()])
      ) as Record<string, z.ZodOptional<T>>
    )
    .partial()
    .strict();
}

const accountRuleSchema = z.enum(ACCOUNT_ACCESS_REASON_CODES);
const mentorVerificationRuleSchema = z.enum(
  MENTOR_VERIFICATION_POLICY_RULE_CODES
);
const mentorPaymentRuleSchema = z.enum(MENTOR_PAYMENT_POLICY_RULE_CODES);
const mentorSubscriptionRuleSchema = z.enum(
  MENTOR_SUBSCRIPTION_POLICY_RULE_CODES
);
const menteeSubscriptionRuleSchema = z.enum(
  MENTEE_SUBSCRIPTION_POLICY_RULE_CODES
);

const mentorFeatureOverrideSchema = z
  .object({
    account: createPartialEnumRecordSchema(
      ACCOUNT_CONFIGURABLE_STATUSES,
      accountRuleSchema
    ).optional(),
    verification: createPartialEnumRecordSchema(
      MENTOR_VERIFICATION_STATUSES,
      mentorVerificationRuleSchema
    ).optional(),
    payment: createPartialEnumRecordSchema(
      MENTOR_PAYMENT_STATUSES,
      mentorPaymentRuleSchema
    ).optional(),
    subscription: createPartialEnumRecordSchema(
      MENTOR_SUBSCRIPTION_POLICY_STATES,
      mentorSubscriptionRuleSchema
    ).optional(),
  })
  .strict();

const menteeFeatureOverrideSchema = z
  .object({
    account: createPartialEnumRecordSchema(
      ACCOUNT_CONFIGURABLE_STATUSES,
      accountRuleSchema
    ).optional(),
    subscription: createPartialEnumRecordSchema(
      MENTEE_SUBSCRIPTION_POLICY_STATES,
      menteeSubscriptionRuleSchema
    ).optional(),
  })
  .strict();

const mentorPolicyOverridesSchema = z
  .object({
    features: createPartialEnumRecordSchema(
      Object.values(MENTOR_FEATURE_KEYS),
      mentorFeatureOverrideSchema
    ).optional(),
  })
  .strict();

const menteePolicyOverridesSchema = z
  .object({
    features: createPartialEnumRecordSchema(
      Object.values(MENTEE_FEATURE_KEYS),
      menteeFeatureOverrideSchema
    ).optional(),
  })
  .strict();

export const accessPolicyConfigOverridesSchema = z
  .object({
    mentor: mentorPolicyOverridesSchema.optional(),
    mentee: menteePolicyOverridesSchema.optional(),
  })
  .strict();

export type AccessPolicyConfigOverrides = {
  mentor?: MentorPolicyConfigOverrides;
  mentee?: MenteePolicyConfigOverrides;
};

export interface AccessPolicyRuntimeMetadata {
  source: 'baseline' | 'published';
  version: number | null;
  schemaVersion: number;
  configId: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
}

export interface AccessPolicyRuntimeConfig {
  mentor: MentorPolicyConfig;
  mentee: MenteePolicyConfig;
  metadata: AccessPolicyRuntimeMetadata;
}

export const DEFAULT_ACCESS_POLICY_RUNTIME_CONFIG: AccessPolicyRuntimeConfig = {
  mentor: DEFAULT_MENTOR_POLICY_CONFIG,
  mentee: DEFAULT_MENTEE_POLICY_CONFIG,
  metadata: {
    source: 'baseline',
    version: null,
    schemaVersion: ACCESS_POLICY_CONFIG_SCHEMA_VERSION,
    configId: null,
    publishedAt: null,
    updatedAt: null,
  },
};

export function buildAccessPolicyRuntimeConfig(
  overrides?: AccessPolicyConfigOverrides | null,
  metadata?: Partial<AccessPolicyRuntimeMetadata>
): AccessPolicyRuntimeConfig {
  return {
    mentor: mergeMentorPolicyConfig(overrides?.mentor ?? null),
    mentee: mergeMenteePolicyConfig(overrides?.mentee ?? null),
    metadata: {
      ...DEFAULT_ACCESS_POLICY_RUNTIME_CONFIG.metadata,
      ...(metadata ?? {}),
    },
  };
}

function buildPublishedRuntimeMetadata(row: AccessPolicyConfig): AccessPolicyRuntimeMetadata {
  return {
    source: 'published',
    version: row.version,
    schemaVersion: row.schemaVersion,
    configId: row.id,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

export function parseAccessPolicyConfigOverrides(
  value: unknown
): AccessPolicyConfigOverrides | null {
  const parsed = accessPolicyConfigOverridesSchema.safeParse(value ?? {});

  if (!parsed.success) {
    console.error(
      '[access-policy] invalid published runtime config; using baseline',
      parsed.error.flatten()
    );
    return null;
  }

  return parsed.data as AccessPolicyConfigOverrides;
}

async function getPublishedAccessPolicyConfigRow() {
  const [row] = await db
    .select()
    .from(accessPolicyConfigs)
    .where(eq(accessPolicyConfigs.status, 'published'))
    .orderBy(desc(accessPolicyConfigs.version))
    .limit(1);

  return row ?? null;
}

function isMissingConfigTableError(error: unknown) {
  const code =
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code
      : null;

  return code === '42P01';
}

export async function resolveAccessPolicyRuntimeConfig(): Promise<AccessPolicyRuntimeConfig> {
  try {
    const row = await getPublishedAccessPolicyConfigRow();

    if (!row) {
      return DEFAULT_ACCESS_POLICY_RUNTIME_CONFIG;
    }

    const overrides = parseAccessPolicyConfigOverrides(row.config);

    if (!overrides) {
      return DEFAULT_ACCESS_POLICY_RUNTIME_CONFIG;
    }

    return buildAccessPolicyRuntimeConfig(
      overrides,
      buildPublishedRuntimeMetadata(row)
    );
  } catch (error) {
    if (isMissingConfigTableError(error)) {
      console.warn(
        '[access-policy] config table missing; using baseline runtime config'
      );
      return DEFAULT_ACCESS_POLICY_RUNTIME_CONFIG;
    }

    throw error;
  }
}
