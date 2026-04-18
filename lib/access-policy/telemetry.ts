export interface AccessPolicyDenialEvent {
  scope: 'mentor_feature' | 'mentee_feature' | 'messaging';
  userId: string;
  status: number;
  message: string;
  reasonCode: string;
  feature?: string;
  intent?: string;
  audience?: string | null;
  source?: string;
}

export function logAccessPolicyDenial(event: AccessPolicyDenialEvent) {
  console.warn('[access-policy] denied', {
    ...event,
    timestamp: new Date().toISOString(),
  });
}
