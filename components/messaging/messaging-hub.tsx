'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Inbox, Send } from 'lucide-react';
import { ThreadList } from './thread-list';
import { MessageThread } from './message-thread';
import { MessageRequestsList } from './message-requests-list';
import { useMessaging } from '@/hooks/use-messaging-v2';

interface MessagingHubProps {
  userId: string;
}

export function MessagingHub({ userId }: MessagingHubProps) {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'threads' | 'requests'>('threads');
  
  const {
    threads,
    requests,
    threadsLoading,
    requestsLoading,
    unreadThreadsCount,
    pendingRequestsCount,
    sendMessage,
    markThreadAsRead,
    archiveThread,
  } = useMessaging(userId);

  const handleThreadSelect = (threadId: string) => {
    setSelectedThreadId(threadId);
    markThreadAsRead(threadId);
  };

  const handleBackToList = () => {
    setSelectedThreadId(null);
  };

  if (selectedThreadId) {
    return (
      <MessageThread
        threadId={selectedThreadId}
        userId={userId}
        onBack={handleBackToList}
        onSendMessage={(threadId, content, replyToId) => sendMessage(threadId, content, replyToId)}
        onArchive={() => {
          archiveThread(selectedThreadId);
          handleBackToList();
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold mb-2">Messages</h1>
        <p className="text-muted-foreground">
          Manage your conversations and message requests
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'threads' | 'requests')}
        className="flex-1 flex flex-col"
      >
        <TabsList className="mx-6 mt-4">
          <TabsTrigger value="threads" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversations
            {unreadThreadsCount > 0 && (
              <Badge variant="default" className="ml-2">
                {unreadThreadsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Requests
            {pendingRequestsCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingRequestsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="threads" className="flex-1 p-6 pt-4">
          <ThreadList
            threads={threads}
            loading={threadsLoading}
            onThreadSelect={handleThreadSelect}
            userId={userId}
          />
        </TabsContent>

        <TabsContent value="requests" className="flex-1 p-6 pt-4">
          <MessageRequestsList userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}