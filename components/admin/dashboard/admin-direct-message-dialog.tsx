'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { buildMessagingThreadUrl } from '@/lib/messaging/urls';

interface AdminDirectMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId: string | null;
  recipientName: string;
  recipientRoleLabel: string;
}

export function AdminDirectMessageDialog({
  open,
  onOpenChange,
  recipientId,
  recipientName,
  recipientRoleLabel,
}: AdminDirectMessageDialogProps) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedContent = content.trim();

  const handleClose = (nextOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(nextOpen);
      if (!nextOpen) {
        setContent('');
      }
    }
  };

  const handleSubmit = async () => {
    if (!recipientId || !trimmedContent) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/messaging/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          recipientId,
          content: trimmedContent,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to send message');
      }

      const threadId = result?.data?.threadId;
      if (!threadId) {
        throw new Error('Message was sent but no conversation was returned');
      }

      toast.success(`Message sent to ${recipientName}`);
      setContent('');
      onOpenChange(false);
      router.push(buildMessagingThreadUrl(threadId));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to send message';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <MessageSquare className='h-5 w-5' />
            Message {recipientName}
          </DialogTitle>
          <DialogDescription>
            This sends a direct admin message to this {recipientRoleLabel} and
            opens the conversation in the shared inbox.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-2'>
          <Label htmlFor='admin-direct-message'>Message</Label>
          <Textarea
            id='admin-direct-message'
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={`Write your message to ${recipientName}...`}
            className='min-h-[160px]'
            disabled={isSubmitting}
            maxLength={5000}
          />
          <p className='text-xs text-muted-foreground'>
            This creates or reopens the conversation immediately. {trimmedContent.length}/5000
          </p>
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type='button'
            onClick={handleSubmit}
            disabled={isSubmitting || !recipientId || trimmedContent.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Sending...
              </>
            ) : (
              <>
                <Send className='mr-2 h-4 w-4' />
                Send Message
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
