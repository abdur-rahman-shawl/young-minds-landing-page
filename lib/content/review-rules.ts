export type ContentStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED'
  | 'FLAGGED';

export type ContentReviewAction =
  | 'APPROVE'
  | 'REJECT'
  | 'FLAG'
  | 'UNFLAG'
  | 'FORCE_APPROVE'
  | 'FORCE_ARCHIVE'
  | 'REVOKE_APPROVAL'
  | 'FORCE_DELETE';

export const mentorEditableContentStatuses = new Set<ContentStatus>([
  'DRAFT',
  'REJECTED',
]);

export const reviewActionsRequiringNote = new Set<ContentReviewAction>([
  'REJECT',
  'FLAG',
  'REVOKE_APPROVAL',
  'FORCE_DELETE',
]);

export const allowedReviewSourceStates: Record<
  ContentReviewAction,
  ContentStatus[]
> = {
  APPROVE: ['PENDING_REVIEW'],
  REJECT: ['PENDING_REVIEW'],
  FLAG: ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'],
  UNFLAG: ['FLAGGED'],
  FORCE_APPROVE: ['DRAFT', 'REJECTED', 'FLAGGED', 'ARCHIVED'],
  FORCE_ARCHIVE: ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'FLAGGED'],
  REVOKE_APPROVAL: ['APPROVED'],
  FORCE_DELETE: ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED', 'FLAGGED'],
};

export function validateContentReviewAction(input: {
  action: ContentReviewAction;
  currentStatus: ContentStatus;
  note?: string | null;
  isDeleted?: boolean;
}) {
  const { action, currentStatus, note, isDeleted = false } = input;

  if (isDeleted && action !== 'FORCE_DELETE') {
    return {
      ok: false as const,
      error: 'Content is deleted and pending purge',
    };
  }

  if (!allowedReviewSourceStates[action].includes(currentStatus)) {
    return {
      ok: false as const,
      error: `Action '${action}' not allowed from status '${currentStatus}'`,
    };
  }

  if (reviewActionsRequiringNote.has(action) && !note?.trim()) {
    return {
      ok: false as const,
      error: `A reason is required when performing action '${action}'`,
    };
  }

  return { ok: true as const };
}
