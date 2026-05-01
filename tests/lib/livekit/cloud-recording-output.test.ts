import { describe, expect, it } from 'vitest';

import {
  createCloudRecordingFileOutput,
  deriveSupabaseS3Endpoint,
  resolveRecordingMode,
} from '@/lib/livekit/cloud-recording-output';

describe('cloud recording output helpers', () => {
  it('defaults recording mode to disabled', () => {
    expect(resolveRecordingMode({})).toBe('disabled');
  });

  it('supports the explicit cloud recording mode', () => {
    expect(
      resolveRecordingMode({
        LIVEKIT_RECORDING_MODE: 'cloud',
      })
    ).toBe('cloud');
  });

  it('supports the legacy boolean recording flag', () => {
    expect(
      resolveRecordingMode({
        LIVEKIT_RECORDING_ENABLED: 'true',
      })
    ).toBe('cloud');
  });

  it('derives the Supabase S3 endpoint from the project URL', () => {
    expect(
      deriveSupabaseS3Endpoint('https://project-ref.supabase.co')
    ).toBe('https://project-ref.supabase.co/storage/v1/s3');
  });

  it('builds an S3-compatible LiveKit output using Supabase defaults', () => {
    const output = createCloudRecordingFileOutput('sessions/test/video.mp4', {
      LIVEKIT_RECORDING_MODE: 'cloud',
      LIVEKIT_EGRESS_S3_ACCESS_KEY: 'access-key',
      LIVEKIT_EGRESS_S3_SECRET_KEY: 'secret-key',
      LIVEKIT_EGRESS_S3_REGION: 'ap-south-1',
      STORAGE_PROVIDER: 'supabase',
      SUPABASE_URL: 'https://project-ref.supabase.co',
      SUPABASE_STORAGE_BUCKET: 'recordings',
    });

    expect(output.filepath).toBe('sessions/test/video.mp4');
    expect(output.output.case).toBe('s3');
    expect(output.output.value.bucket).toBe('recordings');
    expect(output.output.value.region).toBe('ap-south-1');
    expect(output.output.value.endpoint).toBe(
      'https://project-ref.supabase.co/storage/v1/s3'
    );
    expect(output.output.value.forcePathStyle).toBe(true);
  });
});
