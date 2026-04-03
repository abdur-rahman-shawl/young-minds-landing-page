type NotificationStateSnapshot = {
  isRead: boolean;
  isArchived: boolean;
  readAt: Date | null;
  archivedAt: Date | null;
};

export function buildNotificationUpdateData(
  existingNotification: NotificationStateSnapshot,
  input: {
    isRead?: boolean;
    isArchived?: boolean;
  }
) {
  const updateData: Record<string, unknown> = {};

  if (input.isRead !== undefined) {
    updateData.isRead = input.isRead;
    updateData.readAt =
      input.isRead && !existingNotification.isRead
        ? new Date()
        : input.isRead
          ? existingNotification.readAt
          : null;
  }

  if (input.isArchived !== undefined) {
    updateData.isArchived = input.isArchived;
    updateData.archivedAt =
      input.isArchived && !existingNotification.isArchived
        ? new Date()
        : input.isArchived
          ? existingNotification.archivedAt
          : null;
  }

  return updateData;
}

export function buildBulkNotificationUpdate(
  action: 'mark_read' | 'mark_unread' | 'archive' | 'unarchive' | 'delete'
) {
  switch (action) {
    case 'mark_read':
      return {
        mode: 'update' as const,
        message: 'Notifications marked as read',
        updateData: {
          isRead: true,
          readAt: new Date(),
        },
      };
    case 'mark_unread':
      return {
        mode: 'update' as const,
        message: 'Notifications marked as unread',
        updateData: {
          isRead: false,
          readAt: null,
        },
      };
    case 'archive':
      return {
        mode: 'update' as const,
        message: 'Notifications archived',
        updateData: {
          isArchived: true,
          archivedAt: new Date(),
        },
      };
    case 'unarchive':
      return {
        mode: 'update' as const,
        message: 'Notifications unarchived',
        updateData: {
          isArchived: false,
          archivedAt: null,
        },
      };
    case 'delete':
      return {
        mode: 'delete' as const,
        message: 'Notifications deleted successfully',
      };
  }
}
