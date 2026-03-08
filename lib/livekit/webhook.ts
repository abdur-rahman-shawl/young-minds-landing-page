import type { NextRequest } from 'next/server';
import { WebhookReceiver } from 'livekit-server-sdk';
import { livekitConfig } from '@/lib/livekit/config';

export class LivekitWebhookAuthError extends Error {
  constructor(message = 'LiveKit webhook authorization failed') {
    super(message);
    this.name = 'LivekitWebhookAuthError';
  }
}

export class LivekitWebhookPayloadError extends Error {
  constructor(message = 'Invalid LiveKit webhook payload') {
    super(message);
    this.name = 'LivekitWebhookPayloadError';
  }
}

const apiKey = livekitConfig.server.apiKey;
const apiSecret = livekitConfig.server.apiSecret;

if (!apiKey || !apiSecret) {
  throw new Error('Missing LiveKit API credentials for webhook verification');
}

const receiver = new WebhookReceiver(apiKey, apiSecret);

function getAuthHeader(request: NextRequest): string | undefined {
  const raw = request.headers.get('Authorization') ?? request.headers.get('Authorize');
  if (!raw) return undefined;
  if (raw.startsWith('Bearer ')) {
    return raw.slice(7).trim();
  }
  return raw.trim();
}

export async function verifyLivekitWebhook(request: NextRequest): Promise<string> {
  const rawBody = await request.text();
  const authHeader = getAuthHeader(request);

  try {
    await receiver.receive(rawBody, authHeader);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new LivekitWebhookPayloadError('Malformed webhook JSON');
    }
    throw new LivekitWebhookAuthError(
      error instanceof Error ? error.message : 'Unknown authorization error'
    );
  }

  return rawBody;
}
