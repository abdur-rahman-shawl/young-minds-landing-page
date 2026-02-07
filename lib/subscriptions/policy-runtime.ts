import {
  checkFeatureAccess,
  trackFeatureUsage,
  type FeatureAccess,
  type SubscriptionContext,
} from '@/lib/subscriptions/enforcement';
import {
  ACTION_POLICIES,
  type MeterDelta,
  type SubscriptionPolicyAction,
} from '@/lib/subscriptions/policies';

export interface PolicyErrorPayload {
  success: false;
  error: string;
  details?: string;
  feature?: string;
  limit?: number | string | null;
  usage?: number;
  remaining?: number | string;
  upgrade_required?: boolean;
}

export class SubscriptionPolicyError extends Error {
  readonly status: number;
  readonly payload: PolicyErrorPayload;

  constructor(payload: PolicyErrorPayload, status = 403) {
    super(payload.error);
    this.name = 'SubscriptionPolicyError';
    this.status = status;
    this.payload = payload;
  }
}

interface ResolvePolicyContextOptions {
  context?: Partial<SubscriptionContext>;
}

function resolvePolicyContext(
  action: SubscriptionPolicyAction,
  options?: ResolvePolicyContextOptions
): SubscriptionContext {
  const policy = ACTION_POLICIES[action];
  return {
    audience: options?.context?.audience ?? policy.audience,
    actorRole: options?.context?.actorRole ?? policy.actorRole,
    allowAdminOverride: options?.context?.allowAdminOverride ?? false,
  };
}

export interface EnforceFeatureInput extends ResolvePolicyContextOptions {
  action: SubscriptionPolicyAction;
  userId: string;
  failureMessage?: string;
  status?: number;
  upgradeRequired?: boolean;
}

export async function enforceFeature(input: EnforceFeatureInput): Promise<FeatureAccess> {
  const policy = ACTION_POLICIES[input.action];
  const context = resolvePolicyContext(input.action, input);

  let access: FeatureAccess;
  try {
    access = await checkFeatureAccess(input.userId, policy.featureKey, context);
  } catch (error) {
    throw new SubscriptionPolicyError(
      {
        success: false,
        error: 'Unable to verify subscription limits',
        details: error instanceof Error ? error.message : 'Unknown subscription check failure',
        feature: policy.featureKey,
      },
      500
    );
  }

  if (!access.has_access) {
    throw new SubscriptionPolicyError(
      {
        success: false,
        error: input.failureMessage || policy.defaultFailureMessage || access.reason || 'Access denied',
        details: access.reason,
        feature: policy.featureKey,
        limit: access.limit,
        usage: access.usage,
        remaining: access.remaining,
        upgrade_required: input.upgradeRequired ?? true,
      },
      input.status ?? 403
    );
  }

  return access;
}

export interface ConsumeFeatureInput extends ResolvePolicyContextOptions {
  action: SubscriptionPolicyAction;
  userId: string;
  delta?: MeterDelta;
  resourceType?: string;
  resourceId?: string;
  idempotencyKey?: string;
}

export async function consumeFeature(input: ConsumeFeatureInput): Promise<void> {
  const policy = ACTION_POLICIES[input.action];
  if (!policy.metered) {
    return;
  }

  const delta = input.delta ?? policy.defaultDelta;
  if (!delta) {
    throw new Error(`Missing usage delta for metered action '${input.action}'`);
  }

  const context = resolvePolicyContext(input.action, input);
  await trackFeatureUsage(
    input.userId,
    policy.featureKey,
    delta,
    input.resourceType ?? policy.defaultResourceType,
    input.resourceId,
    input.idempotencyKey,
    context
  );
}

export function isSubscriptionPolicyError(error: unknown): error is SubscriptionPolicyError {
  return error instanceof SubscriptionPolicyError;
}

