export class UnexpectedResponseContentTypeError extends Error {
  status: number;
  contentType: string;
  bodySnippet: string;

  constructor(input: {
    status: number;
    contentType: string;
    bodySnippet: string;
  }) {
    super(
      `Expected JSON response but received ${
        input.contentType || 'unknown content type'
      } (HTTP ${input.status})`
    );
    this.name = 'UnexpectedResponseContentTypeError';
    this.status = input.status;
    this.contentType = input.contentType;
    this.bodySnippet = input.bodySnippet;
  }
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.toLowerCase().includes('application/json')) {
    return response.json() as Promise<T>;
  }

  const body = await response.text();

  throw new UnexpectedResponseContentTypeError({
    status: response.status,
    contentType,
    bodySnippet: body.slice(0, 200),
  });
}
