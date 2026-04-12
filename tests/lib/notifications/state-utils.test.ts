import { describe, expect, it } from 'vitest';

import {
  buildBulkNotificationUpdate,
  buildNotificationUpdateData,
} from '@/lib/notifications/state-utils';

describe('buildNotificationUpdateData', () => {
  it('sets readAt when marking an unread notification as read', () => {
    const update = buildNotificationUpdateData(
      {
        isRead: false,
        isArchived: false,
        readAt: null,
        archivedAt: null,
      },
      { isRead: true }
    );

    expect(update.isRead).toBe(true);
    expect(update.readAt).toBeInstanceOf(Date);
  });

  it('clears readAt when marking a notification unread', () => {
    const update = buildNotificationUpdateData(
      {
        isRead: true,
        isArchived: false,
        readAt: new Date(),
        archivedAt: null,
      },
      { isRead: false }
    );

    expect(update.isRead).toBe(false);
    expect(update.readAt).toBeNull();
  });

  it('preserves archivedAt when an archived notification stays archived', () => {
    const archivedAt = new Date('2026-01-01T00:00:00.000Z');
    const update = buildNotificationUpdateData(
      {
        isRead: false,
        isArchived: true,
        readAt: null,
        archivedAt,
      },
      { isArchived: true }
    );

    expect(update.isArchived).toBe(true);
    expect(update.archivedAt).toBe(archivedAt);
  });
});

describe('buildBulkNotificationUpdate', () => {
  it('returns delete mode for delete actions', () => {
    const result = buildBulkNotificationUpdate('delete');

    expect(result).toEqual({
      mode: 'delete',
      message: 'Notifications deleted successfully',
    });
  });

  it('returns update mode with read timestamps for mark_read', () => {
    const result = buildBulkNotificationUpdate('mark_read');

    expect(result.mode).toBe('update');
    if (result.mode === 'update') {
      expect(result.updateData.isRead).toBe(true);
      expect(result.updateData.readAt).toBeInstanceOf(Date);
    }
  });
});
