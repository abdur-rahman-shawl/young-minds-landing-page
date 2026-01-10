'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
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

  return (
    <div className="h-full">
      {/* Mobile Layout */}
      <div className="md:hidden h-full flex flex-col">
        {selectedThreadId ? (
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
        ) : (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <h1 className="text-xl font-bold mb-1">Messages</h1>
              <p className="text-sm text-muted-foreground">
                Manage your conversations
              </p>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'threads' | 'requests')}
              className="flex-1 flex flex-col"
            >
              <div className="px-4 mt-4">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="threads" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Conversations
                    {unreadThreadsCount > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5 min-w-5">
                        {unreadThreadsCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="requests" className="flex items-center gap-2">
                    <Inbox className="h-4 w-4" />
                    Requests
                    {pendingRequestsCount > 0 && (
                      <Badge variant="destructive" className="ml-2 h-5 px-1.5 min-w-5">
                        {pendingRequestsCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="threads" className="flex-1 mt-0">
                <ThreadList
                  threads={threads}
                  loading={threadsLoading}
                  onThreadSelect={handleThreadSelect}
                  userId={userId}
                />
              </TabsContent>

              <TabsContent value="requests" className="flex-1 mt-0 p-4 pt-4 overflow-auto">
                <MessageRequestsList userId={userId} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block h-full">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={35} minSize={25} maxSize={40} className="border-r">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b flex items-center justify-between">
                <h1 className="text-xl font-bold">Messages</h1>
                <Badge variant="outline" className="text-xs font-normal">
                  {threads.length} conversations
                </Badge>
              </div>

              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as 'threads' | 'requests')}
                className="flex-1 flex flex-col"
              >
                <div className="px-4 py-2 bg-muted/30 border-b">
                  <TabsList className="w-full">
                    <TabsTrigger value="threads" className="flex-1 flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Conversations
                      {unreadThreadsCount > 0 && (
                        <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                          {unreadThreadsCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="requests" className="flex-1 flex items-center gap-2">
                      <Inbox className="h-3.5 w-3.5" />
                      Requests
                      {pendingRequestsCount > 0 && (
                        <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[10px]">
                          {pendingRequestsCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="threads" className="flex-1 mt-0">
                  <ThreadList
                    threads={threads}
                    loading={threadsLoading}
                    onThreadSelect={handleThreadSelect}
                    userId={userId}
                  />
                </TabsContent>

                <TabsContent value="requests" className="flex-1 mt-0 p-4 overflow-auto">
                  <MessageRequestsList userId={userId} />
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={65}>
            {selectedThreadId ? (
              <MessageThread
                threadId={selectedThreadId}
                userId={userId}
                onBack={handleBackToList}
                onSendMessage={(threadId, content, replyToId) => sendMessage(threadId, content, replyToId)}
                onArchive={() => {
                  archiveThread(selectedThreadId);
                  handleBackToList();
                }}
                showBackButton={false}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-muted/10">
                <div className="bg-muted p-4 rounded-full mb-4">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                <p className="text-muted-foreground max-w-xs">
                  Choose a conversation from the list to start messaging or managing requests.
                </p>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}