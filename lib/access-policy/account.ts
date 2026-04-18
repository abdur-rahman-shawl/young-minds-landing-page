export const ACCOUNT_OVERRIDE_SCOPES = {
  all: 'all',
  inactive: 'inactive',
  blocked: 'blocked',
} as const;

export type AccountOverrideScope =
  (typeof ACCOUNT_OVERRIDE_SCOPES)[keyof typeof ACCOUNT_OVERRIDE_SCOPES];

export const ACCOUNT_LIFECYCLE_STATUSES = [
  'anonymous',
  'active',
  'inactive',
  'blocked',
  'unavailable',
] as const satisfies readonly AccountLifecycleStatus[];

export const ACCOUNT_CONFIGURABLE_STATUSES = [
  'anonymous',
  'inactive',
  'blocked',
  'unavailable',
] as const satisfies readonly AccountLifecycleStatus[];

export type AccountLifecycleStatus =
  | 'anonymous'
  | 'active'
  | 'inactive'
  | 'blocked'
  | 'unavailable';

export type AccountAccessMode = 'full' | 'blocked';

export type AccountAccessReasonCode =
  | 'ok'
  | 'authentication_required'
  | 'account_inactive'
  | 'account_blocked'
  | 'account_state_unavailable';

export const ACCOUNT_ACCESS_REASON_CODES = [
  'ok',
  'authentication_required',
  'account_inactive',
  'account_blocked',
  'account_state_unavailable',
] as const satisfies readonly AccountAccessReasonCode[];

export interface AccountAccessContext {
  isAuthenticated?: boolean;
  isActive?: boolean | null;
  isBlocked?: boolean | null;
  overrideScopes?: readonly AccountOverrideScope[] | null;
}

export interface AccountAccessPolicySnapshot {
  isAuthenticated: boolean;
  isActive: boolean | null;
  isBlocked: boolean | null;
  status: AccountLifecycleStatus;
  mode: AccountAccessMode;
  allowed: boolean;
  reasonCode: AccountAccessReasonCode;
  overrideScopes: readonly AccountOverrideScope[];
  blockedSummary: string;
}

function normalizeOverrideScopes(
  scopes: readonly AccountOverrideScope[] | null | undefined
) {
  return scopes ?? [];
}

export function hasAccountOverrideScope(
  scopes: readonly AccountOverrideScope[] | null | undefined,
  requiredScope: AccountOverrideScope
) {
  const normalizedScopes = normalizeOverrideScopes(scopes);
  return (
    normalizedScopes.includes(ACCOUNT_OVERRIDE_SCOPES.all) ||
    normalizedScopes.includes(requiredScope)
  );
}

export function buildAccountAccessPolicySnapshot(
  context: AccountAccessContext
): AccountAccessPolicySnapshot {
  const isAuthenticated = Boolean(context.isAuthenticated);
  const isActive =
    context.isActive === undefined ? null : Boolean(context.isActive);
  const isBlocked =
    context.isBlocked === undefined ? null : Boolean(context.isBlocked);
  const overrideScopes = normalizeOverrideScopes(context.overrideScopes);

  if (!isAuthenticated) {
    return {
      isAuthenticated,
      isActive,
      isBlocked,
      status: 'anonymous',
      mode: 'blocked',
      allowed: false,
      reasonCode: 'authentication_required',
      overrideScopes,
      blockedSummary: 'Sign in to access the workspace.',
    };
  }

  if (isBlocked === null || isActive === null) {
    return {
      isAuthenticated,
      isActive,
      isBlocked,
      status: 'unavailable',
      mode: 'blocked',
      allowed: false,
      reasonCode: 'account_state_unavailable',
      overrideScopes,
      blockedSummary:
        'We could not verify your account status. Refresh the session or contact support.',
    };
  }

  if (isBlocked && !hasAccountOverrideScope(overrideScopes, 'blocked')) {
    return {
      isAuthenticated,
      isActive,
      isBlocked,
      status: 'blocked',
      mode: 'blocked',
      allowed: false,
      reasonCode: 'account_blocked',
      overrideScopes,
      blockedSummary:
        'This account is restricted. Contact support if you believe this is a mistake.',
    };
  }

  if (!isActive && !hasAccountOverrideScope(overrideScopes, 'inactive')) {
    return {
      isAuthenticated,
      isActive,
      isBlocked,
      status: 'inactive',
      mode: 'blocked',
      allowed: false,
      reasonCode: 'account_inactive',
      overrideScopes,
      blockedSummary:
        'This account is inactive. Reactivate it before continuing.',
    };
  }

  return {
    isAuthenticated,
    isActive,
    isBlocked,
    status: 'active',
    mode: 'full',
    allowed: true,
    reasonCode: 'ok',
    overrideScopes,
    blockedSummary: '',
  };
}

export function getAccountAccessFailure(
  snapshot: AccountAccessPolicySnapshot
): {
  status: number;
  message: string;
  reasonCode: AccountAccessReasonCode;
} {
  switch (snapshot.reasonCode) {
    case 'authentication_required':
      return {
        status: 401,
        message: 'Authentication required',
        reasonCode: snapshot.reasonCode,
      };
    case 'account_inactive':
      return {
        status: 403,
        message: 'This account is inactive',
        reasonCode: snapshot.reasonCode,
      };
    case 'account_blocked':
      return {
        status: 403,
        message: 'This account is restricted',
        reasonCode: snapshot.reasonCode,
      };
    case 'account_state_unavailable':
      return {
        status: 409,
        message: 'Unable to verify account status',
        reasonCode: snapshot.reasonCode,
      };
    case 'ok':
    default:
      return {
        status: 200,
        message: 'Account access granted',
        reasonCode: snapshot.reasonCode,
      };
  }
}
