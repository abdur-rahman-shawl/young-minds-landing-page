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
  Edit2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useThreadQuery } from '@/hooks/queries/use-messaging-queries';
import { useMessaging } from '@/hooks/use-messaging-v2';
import { useReactions } from '@/hooks/use-reactions';
import { MessageReactions } from './message-reactions';
import { ReactionPicker } from './reaction-picker';
import { MessageEditForm } from './message-edit-form';
import { MessageActionsMenu } from './message-actions-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MessageThreadProps {
  threadId: string;
  userId: string;
  onBack: () => void;
  onSendMessage: (threadId: string, content: string, replyToId?: string) => Promise<any>;
  onArchive: () => void;
}

interface MessageWithReactionsProps {
  msg: any;
  isOwnMessage: boolean;
  userId: string;
  showDateSeparator: boolean;
  renderDateSeparator: (date: string) => JSX.Element;
  formatMessageDate: (date: string) => string;
  onReply: (msg: any) => void;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  messages: any[];
  scrollToMessage: (messageId: string) => void;
}

function MessageWithReactions({
  msg,
  isOwnMessage,
  userId,
  showDateSeparator,
  renderDateSeparator,
  formatMessageDate,
  onReply,
  onEdit,
  onDelete,
  messages,
  scrollToMessage,
}: MessageWithReactionsProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { reactions, toggleReaction, isLoading } = useReactions(msg.message.id, userId);
  
  const messageAge = Date.now() - new Date(msg.message.createdAt).getTime();
  
  // Find the replied-to message if this message is a reply
  const repliedMessage = msg.message.replyToId 
    ? messages.find(m => m.message.id === msg.message.replyToId)
    : null;
    
  const handleEdit = async (newContent: string) => {
    try {
      await onEdit(msg.message.id, newContent);
      setIsEditing(false);
      toast.success('Message edited');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to edit message');
    }
  };
  
  const handleDelete = async () => {
    try {
      await onDelete(msg.message.id);
      toast.success('Message deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete message');
    }
  };

  return (
    <div>
      {showDateSeparator && renderDateSeparator(msg.message.createdAt)}
      
      <div
        className={cn(
          'group relative flex gap-3',
          isOwnMessage && 'flex-row-reverse'
        )}
        onMouseEnter={() => {
          setShowReactionPicker(true);
          setShowActions(true);
        }}
        onMouseLeave={() => {
          setShowReactionPicker(false);
          setShowActions(false);
        }}
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
          <div className="relative">
            <div
              className={cn(
                'rounded-lg px-3 py-2',
                isOwnMessage
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              {/* Reply Indicator */}
              {repliedMessage && (
                <div
                  className={cn(
                    'mb-2 p-2 rounded border-l-2 cursor-pointer',
                    isOwnMessage 
                      ? 'bg-primary-foreground/10 border-primary-foreground/20' 
                      : 'bg-background/50 border-muted-foreground/20'
                  )}
                  onClick={() => scrollToMessage(msg.message.replyToId)}
                >
                  <p className="text-xs font-medium opacity-70">
                    {repliedMessage.sender?.name || 'Unknown'}
                  </p>
                  <p className="text-xs opacity-60 line-clamp-2">
                    {repliedMessage.message.content}
                  </p>
                </div>
              )}
              
              {isEditing ? (
                <MessageEditForm
                  originalContent={msg.message.content}
                  onSave={handleEdit}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {msg.message.content}
                </p>
              )}
            </div>
            
            {/* Action Buttons - shows on hover */}
            {!isEditing && (
              <div
                className={cn(
                  'absolute top-0 flex items-center gap-1 transition-opacity duration-200',
                  isOwnMessage ? 'left-0 -translate-x-full' : 'right-0 translate-x-full',
                  showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
              >
                {/* Message Actions Menu for own messages */}
                {isOwnMessage && (
                  <MessageActionsMenu
                    messageId={msg.message.id}
                    messageContent={msg.message.content}
                    isOwnMessage={isOwnMessage}
                    isEdited={msg.message.isEdited}
                    messageAge={messageAge}
                    onEdit={() => setIsEditing(true)}
                    onDelete={handleDelete}
                    onReply={() => onReply(msg)}
                    onCopy={() => {}}
                  />
                )}
                
                {/* Reply Button for others' messages */}
                {!isOwnMessage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-muted"
                    onClick={() => onReply(msg)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 17 4 12 9 7" />
                      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                    </svg>
                  </Button>
                )}
                
                {/* Reaction Picker */}
                <ReactionPicker
                  onReact={toggleReaction}
                  side={isOwnMessage ? 'left' : 'right'}
                  triggerClassName="ml-1 mr-2"
                />
              </div>
            )}
          </div>
          
          {/* Display Reactions */}
          {reactions.length > 0 && (
            <MessageReactions
              reactions={reactions}
              onReact={toggleReaction}
              className={cn(isOwnMessage && 'justify-end')}
            />
          )}
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatMessageDate(msg.message.createdAt)}
            </span>
            {msg.message.isEdited && (
              <span className="text-xs text-muted-foreground italic">
                (edited)
              </span>
            )}
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
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement }>({});
  const { data: threadData, isLoading } = useThreadQuery(threadId, userId);
  const { editMessage, deleteMessage } = useMessaging(userId);
  
  const thread = threadData?.thread;
  const messages = threadData?.messages || [];
  const otherUser = threadData?.otherUser;

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;

    const message = messageInput.trim();
    const replyToId = replyingTo?.message?.id;
    
    setMessageInput('');
    setReplyingTo(null);
    setIsSending(true);

    try {
      await onSendMessage(threadId, message, replyToId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
      setMessageInput(message); // Restore message on error
      if (replyToId) setReplyingTo(replyingTo); // Restore reply state
    } finally {
      setIsSending(false);
    }
  };
  
  const scrollToMessage = (messageId: string) => {
    const element = messageRefs.current[messageId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add highlight effect
      element.classList.add('bg-accent/50');
      setTimeout(() => {
        element.classList.remove('bg-accent/50');
      }, 2000);
    }
  };
  
  const handleReply = (msg: any) => {
    setReplyingTo(msg);
    // Focus the input
    const input = document.querySelector('input[placeholder="Type a message..."]') as HTMLInputElement;
    if (input) input.focus();
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
                <div 
                  key={msg.message.id}
                  ref={(el) => {
                    if (el) messageRefs.current[msg.message.id] = el;
                  }}
                  className="transition-colors duration-300"
                >
                  <MessageWithReactions
                    msg={msg}
                    isOwnMessage={isOwnMessage}
                    userId={userId}
                    showDateSeparator={showDateSeparator}
                    renderDateSeparator={renderDateSeparator}
                    formatMessageDate={formatMessageDate}
                    onReply={handleReply}
                    onEdit={editMessage}
                    onDelete={deleteMessage}
                    messages={messages}
                    scrollToMessage={scrollToMessage}
                  />
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t">
        {/* Reply Bar */}
        {replyingTo && (
          <div className="px-4 pt-3 pb-2 bg-muted/30 border-b">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Replying to {replyingTo.sender?.name || 'Unknown'}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {replyingTo.message.content}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setReplyingTo(null)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Button>
            </div>
          </div>
        )}
        
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2 p-4"
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