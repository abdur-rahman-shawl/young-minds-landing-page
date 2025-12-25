type ConsentEventInput = {
  consentType: string;
  consentVersion?: string;
  action: 'granted' | 'denied' | 'revoked';
  source: 'ui' | 'oauth' | 'browser_prompt' | 'system';
  userRole?: string;
  context?: Record<string, unknown>;
};

export const logConsentEvents = (events: ConsentEventInput | ConsentEventInput[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = {
    events: Array.isArray(events) ? events : [events],
  };

  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/consents', blob);
    return;
  }

  fetch('/api/consents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
};

export type { ConsentEventInput };
