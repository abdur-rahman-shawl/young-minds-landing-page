import { describe, expect, it } from 'vitest';

import {
  buildAccountAccessPolicySnapshot,
  hasAccountOverrideScope,
} from '@/lib/access-policy/account';

describe('account access policy', () => {
  it('blocks anonymous users before any other account state is considered', () => {
    const snapshot = buildAccountAccessPolicySnapshot({
      isAuthenticated: false,
      isActive: true,
      isBlocked: false,
    });

    expect(snapshot.allowed).toBe(false);
    expect(snapshot.reasonCode).toBe('authentication_required');
    expect(snapshot.status).toBe('anonymous');
  });

  it('allows active unblocked authenticated accounts', () => {
    const snapshot = buildAccountAccessPolicySnapshot({
      isAuthenticated: true,
      isActive: true,
      isBlocked: false,
    });

    expect(snapshot.allowed).toBe(true);
    expect(snapshot.reasonCode).toBe('ok');
    expect(snapshot.status).toBe('active');
  });

  it('blocks restricted accounts', () => {
    const snapshot = buildAccountAccessPolicySnapshot({
      isAuthenticated: true,
      isActive: true,
      isBlocked: true,
    });

    expect(snapshot.allowed).toBe(false);
    expect(snapshot.reasonCode).toBe('account_blocked');
    expect(snapshot.status).toBe('blocked');
  });

  it('blocks inactive accounts without an override', () => {
    const snapshot = buildAccountAccessPolicySnapshot({
      isAuthenticated: true,
      isActive: false,
      isBlocked: false,
    });

    expect(snapshot.allowed).toBe(false);
    expect(snapshot.reasonCode).toBe('account_inactive');
    expect(snapshot.status).toBe('inactive');
  });

  it('surfaces unavailable account state when lifecycle flags are missing', () => {
    const snapshot = buildAccountAccessPolicySnapshot({
      isAuthenticated: true,
    });

    expect(snapshot.allowed).toBe(false);
    expect(snapshot.reasonCode).toBe('account_state_unavailable');
    expect(snapshot.status).toBe('unavailable');
  });

  it('supports explicit override scopes', () => {
    const snapshot = buildAccountAccessPolicySnapshot({
      isAuthenticated: true,
      isActive: false,
      isBlocked: false,
      overrideScopes: ['inactive'],
    });

    expect(snapshot.allowed).toBe(true);
    expect(hasAccountOverrideScope(snapshot.overrideScopes, 'inactive')).toBe(
      true
    );
  });
});
