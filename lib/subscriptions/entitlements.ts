import {
  getPlanFeatures,
  type SubscriptionContext,
} from '@/lib/subscriptions/enforcement';
import {
  toSubscriptionFeatureRecords,
  type SubscriptionEntitlementSnapshot,
} from '@/lib/subscriptions/entitlement-snapshot';

export type {
  SubscriptionEntitlementSnapshot,
  SubscriptionEntitlementState,
} from '@/lib/subscriptions/entitlement-snapshot';

function isMissingSubscriptionMessage(message: string) {
  return message.includes('No active');
}

export async function resolveSubscriptionEntitlements(
  userId: string,
  context: SubscriptionContext
): Promise<SubscriptionEntitlementSnapshot> {
  try {
    const features = await getPlanFeatures(userId, context);
    return {
      audience: context.audience!,
      state: 'loaded',
      hasSubscription: true,
      features,
      featureRecords: toSubscriptionFeatureRecords(features),
      errorMessage: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown subscription failure';

    if (isMissingSubscriptionMessage(message)) {
      return {
        audience: context.audience!,
        state: 'missing',
        hasSubscription: false,
        features: [],
        featureRecords: [],
        errorMessage: message,
      };
    }

    return {
      audience: context.audience!,
      state: 'unavailable',
      hasSubscription: false,
      features: [],
      featureRecords: [],
      errorMessage: message,
    };
  }
}
