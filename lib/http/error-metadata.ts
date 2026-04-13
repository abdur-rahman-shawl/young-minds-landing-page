interface StatusDataErrorLike {
  status: number;
  message: string;
  data?: unknown;
}

export interface ErrorContractDetails {
  status: number | null;
  data: Record<string, unknown> | null;
  reasonCode: string | null;
  feature: string | null;
  intent: string | null;
  audience: string | null;
  source: string | null;
  scope: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isStatusDataErrorLike(
  error: unknown
): error is Error & StatusDataErrorLike {
  return (
    error instanceof Error &&
    typeof (error as { status?: unknown }).status === 'number'
  );
}

export function getErrorContract(error: unknown): ErrorContractDetails {
  const status = isStatusDataErrorLike(error) ? error.status : null;
  const data =
    isStatusDataErrorLike(error) && isRecord(error.data) ? error.data : null;

  const readString = (key: string) =>
    typeof data?.[key] === 'string' ? data[key] : null;

  return {
    status,
    data,
    reasonCode: readString('reasonCode'),
    feature: readString('feature'),
    intent: readString('intent'),
    audience: readString('audience'),
    source: readString('source'),
    scope: readString('scope'),
  };
}
