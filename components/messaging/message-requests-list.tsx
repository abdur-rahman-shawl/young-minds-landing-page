'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Check,
  X,
  Clock,
  MessageSquare,
  Loader2,
  Inbox,
  Send,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface MessageRequest {
  request: {
    id: string;
    requesterId: string;
    recipientId: string;
    requestType: 'mentor_to_mentee' | 'mentee_to_mentor';
    status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
    initialMessage: string;
    requestReason?: string;
    maxMessages: number;
    messagesUsed: number;
    createdAt: string;
    expiresAt: string;
    respondedAt?: string;
    responseMessage?: string;
  };
  requester: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

interface MessageRequestsListProps {
  userId: string;
}

export function MessageRequestsList({ userId }: MessageRequestsListProps) {
  const [requests, setRequests] = useState<MessageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [responseMessages, setResponseMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRequests();
  }, [activeTab, userId]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/messaging/requests?userId=${userId}&type=${activeTab}&status=all`
      );
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.data);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load message requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (
    requestId: string,
    action: 'accept' | 'reject' | 'cancel'
  ) => {
    setProcessingId(requestId);
    
    try {
      const response = await fetch(`/api/messaging/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action,
          responseMessage: responseMessages[requestId],
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process request');
      }

      toast.success(
        action === 'accept'
          ? 'Request accepted! You can now message this user.'
          : action === 'reject'
          ? 'Request rejected.'
          : 'Request cancelled.'
      );

      fetchRequests();
      setResponseMessages((prev) => {
        const newMessages = { ...prev };
        delete newMessages[requestId];
        return newMessages;
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast.error(errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case 'accepted':
        return <Badge variant="default"><Check className="mr-1 h-3 w-3" />Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="mr-1 h-3 w-3" />Rejected</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const renderRequest = (item: MessageRequest) => {
    const isReceived = activeTab === 'received';
    const isPending = item.request.status === 'pending';
    const isExpired = new Date(item.request.expiresAt) < new Date();

    return (
      <Card key={item.request.id} className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={item.requester.image} />
                <AvatarFallback>
                  {item.requester.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{item.requester.name}</CardTitle>
                <CardDescription>
                  {format(new Date(item.request.createdAt), 'PPp')}
                </CardDescription>
              </div>
            </div>
            {getStatusBadge(item.request.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Message:</p>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              {item.request.initialMessage}
            </p>
          </div>

          {item.request.requestReason && (
            <div>
              <p className="text-sm font-medium mb-1">Reason:</p>
              <p className="text-sm text-muted-foreground">
                {item.request.requestReason}
              </p>
            </div>
          )}

          {item.request.responseMessage && (
            <div>
              <p className="text-sm font-medium mb-1">Response:</p>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {item.request.responseMessage}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Message limit: {item.request.messagesUsed}/{item.request.maxMessages}
            </span>
            {isPending && !isExpired && (
              <span>Expires: {format(new Date(item.request.expiresAt), 'PP')}</span>
            )}
          </div>

          {isPending && !isExpired && (
            <div className="space-y-3">
              {isReceived && (
                <Textarea
                  placeholder="Optional response message..."
                  value={responseMessages[item.request.id] || ''}
                  onChange={(e) =>
                    setResponseMessages((prev) => ({
                      ...prev,
                      [item.request.id]: e.target.value,
                    }))
                  }
                  className="min-h-[80px]"
                />
              )}
              
              <div className="flex gap-2">
                {isReceived ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleRequestAction(item.request.id, 'accept')}
                      disabled={processingId === item.request.id}
                    >
                      {processingId === item.request.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRequestAction(item.request.id, 'reject')}
                      disabled={processingId === item.request.id}
                    >
                      {processingId === item.request.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <X className="mr-2 h-4 w-4" />
                      )}
                      Reject
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRequestAction(item.request.id, 'cancel')}
                    disabled={processingId === item.request.id}
                  >
                    {processingId === item.request.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <X className="mr-2 h-4 w-4" />
                    )}
                    Cancel Request
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'received' | 'sent')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">
            <Inbox className="mr-2 h-4 w-4" />
            Received
          </TabsTrigger>
          <TabsTrigger value="sent">
            <Send className="mr-2 h-4 w-4" />
            Sent
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {requests.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No {activeTab} message requests found.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {requests.map(renderRequest)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}