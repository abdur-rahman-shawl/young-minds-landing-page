import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_CONFIGURABLE_STATUSES,
  ACCOUNT_LIFECYCLE_STATUSES,
} from '@/lib/access-policy/account';
import {
  ACCESS_POLICY_AXIS_DEFINITIONS,
  ACCESS_POLICY_LIFECYCLE_MODEL,
} from '@/lib/access-policy/lifecycle-model';
import { MENTEE_SUBSCRIPTION_POLICY_STATES } from '@/lib/mentee/access-policy';
import {
  MENTOR_PAYMENT_STATUSES,
  MENTOR_SUBSCRIPTION_POLICY_STATES,
  MENTOR_VERIFICATION_STATUSES,
} from '@/lib/mentor/access-policy';

describe('access policy lifecycle model', () => {
  it('documents every supported policy state from the policy modules', () => {
    expect(ACCESS_POLICY_LIFECYCLE_MODEL.accountStatuses).toEqual(
      ACCOUNT_LIFECYCLE_STATUSES
    );
    expect(ACCESS_POLICY_LIFECYCLE_MODEL.configurableAccountStatuses).toEqual(
      ACCOUNT_CONFIGURABLE_STATUSES
    );
    expect(ACCESS_POLICY_LIFECYCLE_MODEL.mentorVerificationStatuses).toEqual(
      MENTOR_VERIFICATION_STATUSES
    );
    expect(ACCESS_POLICY_LIFECYCLE_MODEL.mentorPaymentStatuses).toEqual(
      MENTOR_PAYMENT_STATUSES
    );
    expect(ACCESS_POLICY_LIFECYCLE_MODEL.mentorSubscriptionStates).toEqual(
      MENTOR_SUBSCRIPTION_POLICY_STATES
    );
    expect(ACCESS_POLICY_LIFECYCLE_MODEL.menteeSubscriptionStates).toEqual(
      MENTEE_SUBSCRIPTION_POLICY_STATES
    );
  });

  it('only exposes configurable account states in runtime matrix axes', () => {
    const mentorAccountStates =
      ACCESS_POLICY_AXIS_DEFINITIONS.mentor.account.states.map(
        (definition) => definition.state
      );
    const menteeAccountStates =
      ACCESS_POLICY_AXIS_DEFINITIONS.mentee.account.states.map(
        (definition) => definition.state
      );

    expect(mentorAccountStates).toEqual(ACCOUNT_CONFIGURABLE_STATUSES);
    expect(menteeAccountStates).toEqual(ACCOUNT_CONFIGURABLE_STATUSES);
    expect(mentorAccountStates as readonly string[]).not.toContain('active');
  });
});
