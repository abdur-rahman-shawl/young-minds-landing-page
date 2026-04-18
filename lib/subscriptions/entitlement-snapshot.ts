import type { FeatureKey } from '@/lib/subscriptions/feature-keys';
import {
  getNumericFeatureLimitAmount,
  hasIncludedFeature,
  type SubscriptionFeatureRecord,
} from '@/lib/subscriptions/client-access';

export type SubscriptionEntitlementAudience = 'mentor' | 'mentee';

export type SubscriptionEntitlementState =
  | 'loaded'
  | 'missing'
  | 'unavailable';

export interface SubscriptionEntitlementFeature {
  feature_key: string;
  is_included: boolean;
  limit_amount?: number | string | null;
}

export interface SubscriptionEntitlementSnapshot {
  audience: SubscriptionEntitlementAudience;
  state: SubscriptionEntitlementState;
  hasSubscription: boolean;
  features: SubscriptionEntitlementFeature[];
  featureRecords: SubscriptionFeatureRecord[];
  errorMessage: string | null;
}

export function toSubscriptionFeatureRecords(
  features: SubscriptionEntitlementFeature[]
): SubscriptionFeatureRecord[] {
  return features.map((feature) => ({
    feature_key: feature.feature_key,
    is_included: feature.is_included,
    limit_amount: feature.limit_amount,
  }));
}

export function hasSubscriptionEntitlement(
  snapshot: SubscriptionEntitlementSnapshot | null | undefined,
  featureKey: FeatureKey
): boolean | null {
  if (!snapshot) {
    return null;
  }

  if (snapshot.state === 'loaded') {
    return hasIncludedFeature(snapshot.featureRecords, featureKey);
  }

  if (snapshot.state === 'missing') {
    return false;
  }

  return null;
}

export function getSubscriptionEntitlementLimitAmount(
  snapshot: SubscriptionEntitlementSnapshot | null | undefined,
  featureKey: FeatureKey
) {
  if (!snapshot || snapshot.state !== 'loaded') {
    return null;
  }

  return getNumericFeatureLimitAmount(snapshot.featureRecords, featureKey);
}
