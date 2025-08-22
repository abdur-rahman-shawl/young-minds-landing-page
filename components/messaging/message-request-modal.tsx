'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const messageRequestSchema = z.object({
  initialMessage: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(500, 'Message must be less than 500 characters'),
  requestReason: z.string().optional(),
});

type MessageRequestFormData = z.infer<typeof messageRequestSchema>;

interface MessageRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  recipientType: 'mentor' | 'mentee';
  userId: string;
  onSuccess?: () => void;
}

export function MessageRequestModal({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  recipientType,
  userId,
  onSuccess,
}: MessageRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<MessageRequestFormData>({
    resolver: zodResolver(messageRequestSchema),
    defaultValues: {
      initialMessage: '',
      requestReason: '',
    },
  });

  const requestType = recipientType === 'mentor' ? 'mentee_to_mentor' : 'mentor_to_mentee';
  const messageLimit = requestType === 'mentee_to_mentor' ? 1 : 3;

  const handleSubmit = async (data: MessageRequestFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/messaging/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          recipientId,
          requestType,
          ...data,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message request');
      }

      toast.success('Message request sent successfully');
      form.reset();
      onSuccess?.();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Message Request to {recipientName}</DialogTitle>
          <DialogDescription>
            {recipientType === 'mentor' ? (
              <>
                As a mentee, you can send {messageLimit} message{messageLimit > 1 ? 's' : ''} to this mentor. 
                The mentor must accept your request before you can start messaging.
              </>
            ) : (
              <>
                As a mentor, you can send up to {messageLimit} messages to this mentee. 
                The mentee must accept your request before you can continue messaging.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="initialMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        recipientType === 'mentor'
                          ? "Hi, I'm interested in learning about..."
                          : "Hi, I noticed you're interested in..."
                      }
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This will be your first message if the request is accepted.
                    {field.value.length}/500 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requestReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Contact (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Briefly explain why you want to connect..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Help the {recipientType} understand your intentions
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Request
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}