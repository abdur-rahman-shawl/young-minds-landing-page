import { describe, expect, it } from 'vitest';

import { AppHttpError } from '@/lib/http/app-error';
import { getErrorContract } from '@/lib/http/error-metadata';

class StatusServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'StatusServiceError';
  }
}

describe('error contract metadata', () => {
  it('extracts structured denial details from AppHttpError instances', () => {
    const error = new AppHttpError(403, 'Forbidden', {
      reasonCode: 'feature_not_in_plan',
      feature: 'analytics.view',
      source: 'test.route',
    });

    expect(getErrorContract(error)).toEqual(
      expect.objectContaining({
        status: 403,
        reasonCode: 'feature_not_in_plan',
        feature: 'analytics.view',
        source: 'test.route',
        data: expect.objectContaining({
          reasonCode: 'feature_not_in_plan',
        }),
      })
    );
  });

  it('extracts structured denial details from status-based service errors', () => {
    const error = new StatusServiceError(409, 'Meeting not started', {
      reasonCode: 'meeting_not_started',
      scope: 'meeting',
    });

    expect(getErrorContract(error)).toEqual(
      expect.objectContaining({
        status: 409,
        reasonCode: 'meeting_not_started',
        scope: 'meeting',
      })
    );
  });
});
