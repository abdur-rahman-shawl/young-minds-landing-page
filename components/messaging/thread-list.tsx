'use client';

import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MessageSquare, Archive, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMessaging } from '@/hooks/use-messaging-v2';

interface Thread {
  thread: {
    id: string;
    participant1Id: string;
    participant2Id: string;
    status: string;
    lastMessageAt: string | null;
    lastMessagePreview: string | null;
    totalMessages: number;
    createdAt: string;
    updatedAt: string;
  };
  otherUser: {
    id: string;
    name: string;
    email: string;
    image?: string;
  } | null;
  unreadCount: number;
  isArchived: boolean;
  isMuted: boolean;
}

interface ThreadListProps {
  threads: Thread[];
  loading: boolean;
  onThreadSelect: (threadId: string) => void;
  userId: string;
}

function formatInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ThreadList({ threads, loading, onThreadSelect, userId }: ThreadListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { prefetchThread } = useMessaging(userId);

  const filteredThreads = threads.filter((thread) => {
    if (!searchQuery) return true;
    const otherUserName = thread.otherUser?.name?.toLowerCase() || '';
    const preview = thread.thread.lastMessagePreview?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return otherUserName.includes(query) || preview.includes(query);
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
        <p className="text-muted-foreground max-w-sm">
          Start a conversation by sending a message request to a mentor or mentee
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4 pt-0">
          {filteredThreads.map((thread) => (
            <Card
              key={thread.thread.id}
              className={`p-3 hover:bg-accent/50 cursor-pointer transition-colors border-0 shadow-none hover:shadow-sm rounded-lg ${
                // We can add logic here to highlight selected thread if we pass that prop
                ""
                }`}
              onClick={() => onThreadSelect(thread.thread.id)}
              onMouseEnter={() => prefetchThread(thread.thread.id, userId)}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={thread.otherUser?.image} />
                  <AvatarFallback className="text-sm">
                    {formatInitials(thread.otherUser?.name || 'U')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-sm truncate pr-2">
                      {thread.otherUser?.name || 'Unknown User'}
                    </h4>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {thread.unreadCount > 0 && (
                        <span className="flex h-2 w-2 rounded-full bg-primary" />
                      )}
                      {thread.thread.lastMessageAt && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(thread.thread.lastMessageAt), {
                            addSuffix: false,
                          }).replace('about ', '')}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground truncate font-medium">
                    {thread.thread.lastMessagePreview || 'No messages yet'}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5">
                    {thread.isMuted && (
                      <Badge variant="outline" className="text-[10px] px-1 h-4 font-normal text-muted-foreground bg-muted/50 border-0">
                        Muted
                      </Badge>
                    )}
                    {thread.isArchived && (
                      <Badge variant="outline" className="text-[10px] px-1 h-4 font-normal text-muted-foreground bg-muted/50 border-0">
                        Archived
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}