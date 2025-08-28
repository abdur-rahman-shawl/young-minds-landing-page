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
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="space-y-2">
          {filteredThreads.map((thread) => (
            <Card
              key={thread.thread.id}
              className="p-4 hover:bg-accent cursor-pointer transition-colors"
              onClick={() => onThreadSelect(thread.thread.id)}
              onMouseEnter={() => prefetchThread(thread.thread.id, userId)}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={thread.otherUser?.image} />
                  <AvatarFallback>
                    {thread.otherUser?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold truncate">
                      {thread.otherUser?.name || 'Unknown User'}
                    </h4>
                    <div className="flex items-center gap-2">
                      {thread.unreadCount > 0 && (
                        <Badge variant="default" className="h-5 px-1.5">
                          {thread.unreadCount}
                        </Badge>
                      )}
                      {thread.thread.lastMessageAt && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(thread.thread.lastMessageAt), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground truncate">
                    {thread.thread.lastMessagePreview || 'No messages yet'}
                  </p>

                  <div className="flex items-center gap-2 mt-1">
                    {thread.isMuted && (
                      <Badge variant="outline" className="text-xs">
                        Muted
                      </Badge>
                    )}
                    {thread.isArchived && (
                      <Badge variant="secondary" className="text-xs">
                        Archived
                      </Badge>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      Mute notifications
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      Delete conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}