import { describe, expect, it } from 'vitest';

import {
  readJsonResponse,
  UnexpectedResponseContentTypeError,
} from '@/lib/http/json-response';

describe('readJsonResponse', () => {
  it('parses JSON payloads when the response is JSON', async () => {
    const response = new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      status: 200,
    });

    await expect(readJsonResponse<{ success: boolean }>(response)).resolves.toEqual({
      success: true,
    });
  });

  it('throws a typed error when the response body is HTML instead of JSON', async () => {
    const response = new Response('<!DOCTYPE html><html><body>404</body></html>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 404,
    });

    await expect(readJsonResponse(response)).rejects.toBeInstanceOf(
      UnexpectedResponseContentTypeError
    );
  });
});
