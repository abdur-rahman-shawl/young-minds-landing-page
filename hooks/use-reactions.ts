'use client';

import { useCallback, useState } from 'react';
import {
  useMessageReactionsQuery,
  useToggleReactionMutation,
} from './queries/use-messaging-queries';

export function useReactions(messageId: string, userId: string | undefined) {
  const [isToggling, setIsToggling] = useState(false);
  const { data: reactions = [], error, isLoading } = useMessageReactionsQuery(
    messageId,
    userId
  );
  const toggleReactionMutation = useToggleReactionMutation();

  const toggleReaction = useCallback(
    async (emoji: string) => {
      if (!userId || isToggling) return;

      setIsToggling(true);
      try {
        await toggleReactionMutation.mutateAsync({
          userId,
          messageId,
          emoji,
        });
      } finally {
        setIsToggling(false);
      }
    },
    [isToggling, messageId, toggleReactionMutation, userId]
  );

  return {
    reactions,
    isLoading,
    error,
    toggleReaction,
    isToggling,
  };
}
