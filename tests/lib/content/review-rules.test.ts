import { describe, expect, it } from 'vitest';

import {
  mentorEditableContentStatuses,
  validateContentReviewAction,
} from '@/lib/content/review-rules';

describe('content review rules', () => {
  it('limits mentor editing to draft and rejected content', () => {
    expect(mentorEditableContentStatuses.has('DRAFT')).toBe(true);
    expect(mentorEditableContentStatuses.has('REJECTED')).toBe(true);
    expect(mentorEditableContentStatuses.has('APPROVED')).toBe(false);
    expect(mentorEditableContentStatuses.has('PENDING_REVIEW')).toBe(false);
  });

  it('allows valid review transitions', () => {
    expect(
      validateContentReviewAction({
        action: 'APPROVE',
        currentStatus: 'PENDING_REVIEW',
      })
    ).toEqual({ ok: true });

    expect(
      validateContentReviewAction({
        action: 'UNFLAG',
        currentStatus: 'FLAGGED',
      })
    ).toEqual({ ok: true });
  });

  it('rejects invalid review transitions', () => {
    expect(
      validateContentReviewAction({
        action: 'APPROVE',
        currentStatus: 'DRAFT',
      })
    ).toEqual({
      ok: false,
      error: "Action 'APPROVE' not allowed from status 'DRAFT'",
    });
  });

  it('requires notes for destructive or policy actions', () => {
    expect(
      validateContentReviewAction({
        action: 'REJECT',
        currentStatus: 'PENDING_REVIEW',
      })
    ).toEqual({
      ok: false,
      error: "A reason is required when performing action 'REJECT'",
    });
  });

  it('blocks actions against deleted content except force delete', () => {
    expect(
      validateContentReviewAction({
        action: 'FLAG',
        currentStatus: 'APPROVED',
        note: 'policy issue',
        isDeleted: true,
      })
    ).toEqual({
      ok: false,
      error: 'Content is deleted and pending purge',
    });

    expect(
      validateContentReviewAction({
        action: 'FORCE_DELETE',
        currentStatus: 'APPROVED',
        note: 'retain for purge',
        isDeleted: true,
      })
    ).toEqual({ ok: true });
  });
});
