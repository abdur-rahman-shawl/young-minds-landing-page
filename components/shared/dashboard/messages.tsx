'use client';

import { MessagingHub } from '@/components/messaging/messaging-hub';
import { useAuth } from '@/contexts/auth-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import {
  getMessagingAccessDecision,
  MESSAGING_ACCESS_INTENTS,
} from '@/lib/messaging/access-policy';

export function Messages() {
  const {
    session,
    isLoading,
    isAdmin,
    mentorAccess,
    menteeAccess,
    primaryRole,
  } = useAuth();
  const preferredAudience =
    primaryRole?.name === 'mentor' || primaryRole?.name === 'mentee'
      ? primaryRole.name
      : null;
  const mailboxAccess = getMessagingAccessDecision(
    {
      isAdmin,
      mentorAccess,
      menteeAccess,
      preferredAudience,
    },
    MESSAGING_ACCESS_INTENTS.mailbox
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="p-8">
        <Alert>
          <AlertDescription>
            Please sign in to view your messages.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!mailboxAccess.allowed) {
    return (
      <div className="p-8">
        <Alert>
          <AlertDescription>{mailboxAccess.blockedSummary}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden">
      <MessagingHub userId={session.user.id} />
    </div>
  );
} 
