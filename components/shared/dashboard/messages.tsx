'use client';

import { MessagingHub } from '@/components/messaging/messaging-hub';
import { useAuth } from '@/contexts/auth-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export function Messages() {
  const { session, isLoading } = useAuth();

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

  return <MessagingHub userId={session.user.id} />;
} 