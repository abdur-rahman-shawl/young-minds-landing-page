interface SSEControllerLike {
  enqueue(chunk: Uint8Array): void;
  close(): void;
}

export interface SSEConnectionState {
  controller: SSEControllerLike;
  lastEventId: string;
  userId: string;
  closed: boolean;
}

export function createSSEConnectionState(input: {
  controller: SSEControllerLike;
  lastEventId: string;
  userId: string;
}): SSEConnectionState {
  return {
    controller: input.controller,
    lastEventId: input.lastEventId,
    userId: input.userId,
    closed: false,
  };
}

export function isClosedSSEControllerError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    (error as Error & { code?: string }).code === 'ERR_INVALID_STATE' ||
    error.message.includes('Controller is already closed')
  );
}

export function enqueueSSEPayload(input: {
  connection: SSEConnectionState;
  encoder: TextEncoder;
  payload: string;
  eventId?: string;
  onClosed?: () => void;
}) {
  const { connection, encoder, payload, eventId, onClosed } = input;

  if (connection.closed) {
    return false;
  }

  try {
    connection.controller.enqueue(encoder.encode(payload));

    if (eventId) {
      connection.lastEventId = eventId;
    }

    return true;
  } catch (error) {
    connection.closed = true;
    onClosed?.();

    if (isClosedSSEControllerError(error)) {
      return false;
    }

    throw error;
  }
}

export function closeSSEConnection(connection: SSEConnectionState) {
  if (connection.closed) {
    return;
  }

  connection.closed = true;

  try {
    connection.controller.close();
  } catch (error) {
    if (!isClosedSSEControllerError(error)) {
      throw error;
    }
  }
}
