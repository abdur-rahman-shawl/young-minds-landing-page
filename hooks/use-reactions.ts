'use client';

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';

interface ReactionUser {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface ReactionGroup {
  emoji: string;
  count: number;
  users: ReactionUser[];
  hasReacted: boolean;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const data = await res.json();
  return data.data;
};

export function useReactions(messageId: string, userId: string | undefined) {
  const [isToggling, setIsToggling] = useState(false);

  const { data: reactions, error, isLoading } = useSWR<ReactionGroup[]>(
    messageId && userId ? `/api/messaging/messages/${messageId}/reactions?userId=${userId}` : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: false,
    }
  );

  const toggleReaction = useCallback(async (emoji: string) => {
    if (!userId || isToggling) return;

    setIsToggling(true);
    
    // Optimistic update
    const currentReactions = reactions || [];
    const existingReaction = currentReactions.find(r => r.emoji === emoji);
    
    let optimisticReactions: ReactionGroup[];
    
    if (existingReaction) {
      if (existingReaction.hasReacted) {
        // Remove user's reaction
        if (existingReaction.count === 1) {
          // Remove the entire reaction group
          optimisticReactions = currentReactions.filter(r => r.emoji !== emoji);
        } else {
          // Decrease count
          optimisticReactions = currentReactions.map(r => 
            r.emoji === emoji 
              ? { 
                  ...r, 
                  count: r.count - 1, 
                  hasReacted: false,
                  users: r.users.filter(u => u.id !== userId)
                }
              : r
          );
        }
      } else {
        // Add user's reaction
        optimisticReactions = currentReactions.map(r => 
          r.emoji === emoji 
            ? { 
                ...r, 
                count: r.count + 1, 
                hasReacted: true,
                users: [...r.users, { id: userId, name: 'You', email: '', image: '' }]
              }
            : r
        );
      }
    } else {
      // Add new reaction
      optimisticReactions = [
        ...currentReactions,
        {
          emoji,
          count: 1,
          hasReacted: true,
          users: [{ id: userId, name: 'You', email: '', image: '' }]
        }
      ];
    }

    // Update UI optimistically
    mutate(
      `/api/messaging/messages/${messageId}/reactions?userId=${userId}`,
      optimisticReactions,
      false
    );

    try {
      const response = await fetch(`/api/messaging/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, emoji }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle reaction');
      }

      const result = await response.json();
      
      // Revalidate to get the actual server state
      mutate(`/api/messaging/messages/${messageId}/reactions?userId=${userId}`);
      
      // Subtle feedback
      if (result.action === 'added') {
        // Could add haptic feedback on mobile here
      }
    } catch (error) {
      // Revert optimistic update on error
      mutate(`/api/messaging/messages/${messageId}/reactions?userId=${userId}`);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update reaction';
      if (errorMessage.includes('permission')) {
        toast.error(errorMessage);
      } else if (errorMessage.includes('slow down')) {
        toast.warning('Slow down! Too many reactions.');
      } else {
        toast.error('Failed to update reaction');
      }
    } finally {
      setIsToggling(false);
    }
  }, [messageId, userId, reactions, isToggling]);

  return {
    reactions: reactions || [],
    isLoading,
    error,
    toggleReaction,
    isToggling,
  };
}