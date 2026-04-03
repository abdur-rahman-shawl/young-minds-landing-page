/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NotificationsDashboard } from '@/components/shared/dashboard/notifications';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    session: {
      user: {
        id: 'user-1',
      },
    },
  }),
}));

vi.mock('@/hooks/queries/use-notification-queries', () => ({
  useNotificationsQuery: () => ({
    data: {
      notifications: [
        {
          id: 'notification-1',
          type: 'MESSAGE_RECEIVED',
          title: 'New Message',
          message: 'You have a new message',
          createdAt: '2026-04-03T00:00:00.000Z',
          isRead: false,
          actionUrl: '/dashboard?section=messages',
        },
      ],
      unreadCount: 1,
    },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useUpdateNotificationMutation: () => ({
    mutateAsync: vi.fn(),
  }),
  useBulkNotificationsMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteNotificationMutation: () => ({
    mutateAsync: vi.fn(),
  }),
}));

describe('NotificationsDashboard', () => {
  it('renders a full notifications view for the dashboard section', () => {
    render(<NotificationsDashboard />);

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(
      screen.getByText('Review activity across messages, bookings, and account events.')
    ).toBeInTheDocument();
    expect(screen.getByText('New Message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark all read/i })).toBeEnabled();
  });
});
