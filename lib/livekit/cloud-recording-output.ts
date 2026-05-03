import { EncodedFileOutput, S3Upload } from 'livekit-server-sdk';

type RecordingMode = 'disabled' | 'cloud';

interface S3TargetConfig {
  accessKey: string;
  secret: string;
  region: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle: boolean;
}

function parseBooleanEnv(
  value: string | undefined,
  variableName: string
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  throw new Error(
    `CRITICAL: ${variableName} must be "true" or "false", received "${value}".`
  );
}

export function resolveRecordingMode(
  env: NodeJS.ProcessEnv = process.env
): RecordingMode {
  const explicitMode = env.LIVEKIT_RECORDING_MODE?.trim().toLowerCase();
  if (explicitMode) {
    if (explicitMode === 'disabled' || explicitMode === 'cloud') {
      return explicitMode;
    }

    throw new Error(
      `CRITICAL: LIVEKIT_RECORDING_MODE must be "disabled" or "cloud", received "${env.LIVEKIT_RECORDING_MODE}".`
    );
  }

  const legacyEnabled = parseBooleanEnv(
    env.LIVEKIT_RECORDING_ENABLED,
    'LIVEKIT_RECORDING_ENABLED'
  );

  return legacyEnabled ? 'cloud' : 'disabled';
}

export function isCloudRecordingEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return resolveRecordingMode(env) === 'cloud';
}

export function deriveSupabaseS3Endpoint(supabaseUrl: string): string {
  let parsed: URL;

  try {
    parsed = new URL(supabaseUrl);
  } catch {
    throw new Error(
      `CRITICAL: SUPABASE_URL is not a valid URL: "${supabaseUrl}".`
    );
  }

  return `${parsed.origin.replace(/\/$/, '')}/storage/v1/s3`;
}

function resolveS3TargetConfig(
  env: NodeJS.ProcessEnv = process.env
): S3TargetConfig {
  const accessKey = env.LIVEKIT_EGRESS_S3_ACCESS_KEY?.trim();
  const secret = env.LIVEKIT_EGRESS_S3_SECRET_KEY?.trim();
  const region = env.LIVEKIT_EGRESS_S3_REGION?.trim();
  const bucket =
    env.LIVEKIT_EGRESS_S3_BUCKET?.trim() ||
    env.SUPABASE_STORAGE_BUCKET?.trim();

  const configuredEndpoint = env.LIVEKIT_EGRESS_S3_ENDPOINT?.trim();
  const fallbackSupabaseEndpoint =
    env.STORAGE_PROVIDER?.trim().toLowerCase() === 'supabase' &&
    env.SUPABASE_URL?.trim()
      ? deriveSupabaseS3Endpoint(env.SUPABASE_URL)
      : undefined;
  const endpoint = configuredEndpoint || fallbackSupabaseEndpoint;

  const missing: string[] = [];

  if (!accessKey) missing.push('LIVEKIT_EGRESS_S3_ACCESS_KEY');
  if (!secret) missing.push('LIVEKIT_EGRESS_S3_SECRET_KEY');
  if (!region) missing.push('LIVEKIT_EGRESS_S3_REGION');
  if (!bucket) missing.push('LIVEKIT_EGRESS_S3_BUCKET or SUPABASE_STORAGE_BUCKET');

  if (missing.length > 0) {
    throw new Error(
      `CRITICAL: LiveKit Cloud recording upload is enabled but storage configuration is incomplete.\n` +
        `Missing: ${missing.join(', ')}\n` +
        `Provide S3-compatible upload credentials before enabling recordings.`
    );
  }

  if (endpoint && !endpoint.startsWith('https://')) {
    throw new Error(
      `CRITICAL: LIVEKIT_EGRESS_S3_ENDPOINT must start with https://, received "${endpoint}".`
    );
  }

  const forcePathStyle =
    parseBooleanEnv(
      env.LIVEKIT_EGRESS_S3_FORCE_PATH_STYLE,
      'LIVEKIT_EGRESS_S3_FORCE_PATH_STYLE'
    ) ?? Boolean(endpoint);

  return {
    accessKey,
    secret,
    region,
    bucket,
    endpoint,
    forcePathStyle,
  };
}

export function createCloudRecordingFileOutput(
  filepath: string,
  env: NodeJS.ProcessEnv = process.env
): EncodedFileOutput {
  if (!filepath.trim()) {
    throw new Error('CRITICAL: Recording filepath is required.');
  }

  if (!isCloudRecordingEnabled(env)) {
    throw new Error(
      'CRITICAL: createCloudRecordingFileOutput() was called while cloud recording is disabled.'
    );
  }

  const config = resolveS3TargetConfig(env);

  return new EncodedFileOutput({
    filepath,
    output: {
      case: 's3',
      value: new S3Upload({
        accessKey: config.accessKey,
        secret: config.secret,
        region: config.region,
        bucket: config.bucket,
        endpoint: config.endpoint,
        forcePathStyle: config.forcePathStyle,
      }),
    },
  });
}
