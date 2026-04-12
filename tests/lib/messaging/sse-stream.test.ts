import { describe, expect, it, vi } from 'vitest';

import {
  closeSSEConnection,
  createSSEConnectionState,
  enqueueSSEPayload,
  isClosedSSEControllerError,
} from '@/lib/messaging/sse-stream';

describe('messaging SSE stream helpers', () => {
  it('updates the event id when a payload is enqueued', () => {
    const controller = {
      enqueue: vi.fn(),
      close: vi.fn(),
    };

    const connection = createSSEConnectionState({
      controller,
      lastEventId: 'older',
      userId: 'user-1',
    });

    const didEnqueue = enqueueSSEPayload({
      connection,
      encoder: new TextEncoder(),
      payload: 'event: ping',
      eventId: 'newer',
    });

    expect(didEnqueue).toBe(true);
    expect(connection.lastEventId).toBe('newer');
    expect(controller.enqueue).toHaveBeenCalledTimes(1);
  });

  it('marks the connection closed and suppresses closed-controller errors', () => {
    const controller = {
      enqueue: vi.fn(() => {
        const error = new Error('Invalid state: Controller is already closed') as Error & {
          code?: string;
        };
        error.code = 'ERR_INVALID_STATE';
        throw error;
      }),
      close: vi.fn(),
    };

    const connection = createSSEConnectionState({
      controller,
      lastEventId: 'older',
      userId: 'user-1',
    });
    const onClosed = vi.fn();

    const didEnqueue = enqueueSSEPayload({
      connection,
      encoder: new TextEncoder(),
      payload: 'event: ping',
      onClosed,
    });

    expect(didEnqueue).toBe(false);
    expect(connection.closed).toBe(true);
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('closes connections idempotently', () => {
    const controller = {
      enqueue: vi.fn(),
      close: vi.fn(),
    };

    const connection = createSSEConnectionState({
      controller,
      lastEventId: 'older',
      userId: 'user-1',
    });

    closeSSEConnection(connection);
    closeSSEConnection(connection);

    expect(connection.closed).toBe(true);
    expect(controller.close).toHaveBeenCalledTimes(1);
  });

  it('recognizes the known closed-controller runtime error shape', () => {
    const error = new Error('Invalid state: Controller is already closed') as Error & {
      code?: string;
    };
    error.code = 'ERR_INVALID_STATE';

    expect(isClosedSSEControllerError(error)).toBe(true);
    expect(isClosedSSEControllerError(new Error('Different failure'))).toBe(false);
  });
});
