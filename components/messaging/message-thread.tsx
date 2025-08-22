'use client';

import { useState, useEffect, useRef } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Send,
  MoreVertical,
  Archive,
  Bell,
  BellOff,
  Trash2,
  Paperclip,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useThread } from '@/hooks/use-messaging';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MessageThreadProps {
  threadId: string;
  userId: string;
  onBack: () => void;
  onSendMessage: (threadId: string, content: string) => Promise<any>;
  onArchive: () => void;
}

export function MessageThread({
  threadId,
  userId,
  onBack,
  onSendMessage,
  onArchive,
}: MessageThreadProps) {
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { thread, messages, otherUser, isLoading } = useThread(threadId, userId);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;

    const message = messageInput.trim();
    setMessageInput('');
    setIsSending(true);

    try {
      await onSendMessage(threadId, message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
      setMessageInput(message); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageDate = (date: string) => {
    const messageDate = new Date(date);
    
    if (isToday(messageDate)) {
      return format(messageDate, 'h:mm a');
    } else if (isYesterday(messageDate)) {
      return `Yesterday ${format(messageDate, 'h:mm a')}`;
    } else {
      return format(messageDate, 'MMM d, h:mm a');
    }
  };

  const renderDateSeparator = (date: string) => {
    const messageDate = new Date(date);
    let label = '';
    
    if (isToday(messageDate)) {
      label = 'Today';
    } else if (isYesterday(messageDate)) {
      label = 'Yesterday';
    } else {
      label = format(messageDate, 'MMMM d, yyyy');
    }

    return (
      <div className="flex items-center justify-center my-4">
        <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
          {label}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b p-4">
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-3/4" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUser?.image} />
              <AvatarFallback>
                {otherUser?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h3 className="font-semibold">{otherUser?.name || 'Unknown User'}</h3>
              <p className="text-xs text-muted-foreground">
                {otherUser?.email}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Bell className="mr-2 h-4 w-4" />
                Mute notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="mr-2 h-4 w-4" />
                Archive conversation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const showDateSeparator = index === 0 || 
                new Date(messages[index - 1].message.createdAt).toDateString() !== 
                new Date(msg.message.createdAt).toDateString();
              
              const isOwnMessage = msg.message.senderId === userId;

              return (
                <div key={msg.message.id}>
                  {showDateSeparator && renderDateSeparator(msg.message.createdAt)}
                  
                  <div
                    className={cn(
                      'flex gap-3',
                      isOwnMessage && 'flex-row-reverse'
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.sender?.image} />
                      <AvatarFallback>
                        {msg.sender?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={cn(
                        'max-w-[70%] space-y-1',
                        isOwnMessage && 'items-end'
                      )}
                    >
                      <div
                        className={cn(
                          'rounded-lg px-3 py-2',
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.message.content}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatMessageDate(msg.message.createdAt)}
                        </span>
                        {isOwnMessage && (
                          <span className="text-xs text-muted-foreground">
                            {msg.message.status === 'read' ? 'Read' :
                             msg.message.status === 'delivered' ? 'Delivered' :
                             msg.message.status === 'sent' ? 'Sent' : 'Sending...'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden md:flex"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <Input
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            disabled={isSending}
            className="flex-1"
          />
          
          <Button
            type="submit"
            disabled={!messageInput.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}