'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Calendar,
  Check,
  CheckCheck,
  Filter,
  MessageSquare,
  RotateCcw,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import {
  type NotificationItem,
  useBulkNotificationsMutation,
  useDeleteNotificationMutation,
  useNotificationsQuery,
  useUpdateNotificationMutation,
} from '@/hooks/queries/use-notification-queries';

function getNotificationIcon(type: string) {
  switch (type) {
    case 'BOOKING_REQUEST':
    case 'BOOKING_CONFIRMED':
    case 'BOOKING_CANCELLED':
    case 'BOOKING_RESCHEDULED':
    case 'SESSION_REMINDER':
      return Calendar;
    case 'MESSAGE_RECEIVED':
      return MessageSquare;
    case 'PROFILE_UPDATED':
      return User;
    case 'MENTOR_APPLICATION_APPROVED':
      return Check;
    case 'MENTOR_APPLICATION_REJECTED':
      return X;
    case 'MENTOR_APPLICATION_UPDATE_REQUESTED':
      return RotateCcw;
    default:
      return Bell;
  }
}

function getNotificationColor(type: string) {
  switch (type) {
    case 'BOOKING_CONFIRMED':
    case 'SESSION_COMPLETED':
    case 'MENTOR_APPLICATION_APPROVED':
      return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    case 'BOOKING_CANCELLED':
    case 'MENTOR_APPLICATION_REJECTED':
      return 'text-red-600 bg-red-100 dark:bg-red-900/30';
    case 'BOOKING_REQUEST':
    case 'SESSION_REMINDER':
    case 'MENTOR_APPLICATION_UPDATE_REQUESTED':
      return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
    case 'MESSAGE_RECEIVED':
      return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30';
    default:
      return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
  }
}

export function NotificationsDashboard() {
  const router = useRouter();
  const { session } = useAuth();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const userId = session?.user?.id;
  const notificationsQuery = useNotificationsQuery(userId, {
    limit: 50,
    unreadOnly,
    refetchInterval: 60 * 1000,
  });
  const updateNotificationMutation = useUpdateNotificationMutation();
  const bulkNotificationsMutation = useBulkNotificationsMutation();
  const deleteNotificationMutation = useDeleteNotificationMutation();

  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const loading = notificationsQuery.isLoading && notifications.length === 0;

  const filteredSummary = useMemo(() => {
    if (unreadOnly) {
      return `${notifications.length} unread notification${notifications.length === 1 ? '' : 's'}`;
    }

    return `${notifications.length} notification${notifications.length === 1 ? '' : 's'} loaded`;
  }, [notifications.length, unreadOnly]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!userId) {
      return;
    }

    await updateNotificationMutation.mutateAsync({
      notificationId,
      userId,
      isRead: true,
    });
  };

  const handleMarkAllAsRead = async () => {
    if (!userId || unreadCount === 0) {
      return;
    }

    await bulkNotificationsMutation.mutateAsync({
      userId,
      action: 'mark_read',
      markAllAsRead: true,
    });
    toast.success('All notifications marked as read');
  };

  const handleDelete = async (notificationId: string) => {
    if (!userId) {
      return;
    }

    await deleteNotificationMutation.mutateAsync({
      notificationId,
      userId,
    });
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  return (
    <div className='mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-8'>
      <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-foreground'>Notifications</h1>
          <p className='text-sm text-muted-foreground'>
            Review activity across messages, bookings, and account events.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant={unreadOnly ? 'default' : 'outline'}
            onClick={() => setUnreadOnly((current) => !current)}
          >
            <Filter className='mr-2 h-4 w-4' />
            {unreadOnly ? 'Showing Unread' : 'Show Unread Only'}
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => void notificationsQuery.refetch()}
            disabled={notificationsQuery.isFetching}
          >
            Refresh
          </Button>
          <Button
            type='button'
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || bulkNotificationsMutation.isPending}
          >
            <CheckCheck className='mr-2 h-4 w-4' />
            Mark All Read
          </Button>
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        <Badge variant='secondary'>{filteredSummary}</Badge>
        <Badge variant='outline'>{unreadCount} unread</Badge>
      </div>

      <Card className='flex-1 overflow-hidden'>
        <CardHeader className='border-b'>
          <CardTitle>Activity Feed</CardTitle>
          <CardDescription>
            The most recent 50 notifications for this account.
          </CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {loading ? (
            <div className='flex items-center justify-center py-12 text-sm text-muted-foreground'>
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className='flex flex-col items-center justify-center gap-3 py-16 text-center'>
              <Bell className='h-10 w-10 text-muted-foreground' />
              <div>
                <p className='font-medium text-foreground'>No notifications</p>
                <p className='text-sm text-muted-foreground'>
                  {unreadOnly
                    ? 'You are all caught up on unread activity.'
                    : 'New activity will appear here.'}
                </p>
              </div>
            </div>
          ) : (
            <div className='divide-y'>
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const colorClass = getNotificationColor(notification.type);

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 transition-colors ${
                      notification.actionUrl ? 'cursor-pointer hover:bg-muted/40' : ''
                    } ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''}`}
                    onClick={() => {
                      if (notification.actionUrl) {
                        void handleNotificationClick(notification);
                      }
                    }}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                      <Icon className='h-4 w-4' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-start justify-between gap-3'>
                        <div className='min-w-0'>
                          <div className='flex items-center gap-2'>
                            <p className='truncate text-sm font-semibold text-foreground'>
                              {notification.title}
                            </p>
                            {!notification.isRead ? (
                              <span className='h-2 w-2 rounded-full bg-blue-500' />
                            ) : null}
                          </div>
                          <p className='mt-1 text-sm text-muted-foreground'>
                            {notification.message}
                          </p>
                        </div>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8 shrink-0'
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDelete(notification.id);
                          }}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                      <div className='mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                        <span>
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        <Badge variant='outline'>{notification.type}</Badge>
                        {!notification.isRead ? (
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='h-7 px-2 text-xs'
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleMarkAsRead(notification.id);
                            }}
                          >
                            Mark as read
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
