'use client';

import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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

interface MessageReactionsProps {
  reactions: ReactionGroup[];
  onReact: (emoji: string) => void;
  className?: string;
}

export function MessageReactions({
  reactions,
  onReact,
  className,
}: MessageReactionsProps) {
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);

  if (reactions.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-1 mt-1', className)}>
      <AnimatePresence mode="popLayout">
        {reactions.map((reaction) => (
          <motion.div
            key={reaction.emoji}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            layout
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onReact(reaction.emoji)}
                    onMouseEnter={() => setHoveredEmoji(reaction.emoji)}
                    onMouseLeave={() => setHoveredEmoji(null)}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all',
                      'hover:scale-110',
                      reaction.hasReacted
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'bg-muted hover:bg-accent border border-transparent'
                    )}
                  >
                    <motion.span
                      animate={
                        hoveredEmoji === reaction.emoji
                          ? { rotate: [0, -10, 10, -10, 0] }
                          : {}
                      }
                      transition={{ duration: 0.5 }}
                      className="text-base"
                    >
                      {reaction.emoji}
                    </motion.span>
                    <span className="font-medium">{reaction.count}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <div className="space-y-1">
                    {reaction.users.slice(0, 5).map((user) => (
                      <div key={user.id} className="text-xs">
                        {user.name || user.email}
                      </div>
                    ))}
                    {reaction.users.length > 5 && (
                      <div className="text-xs text-muted-foreground">
                        and {reaction.users.length - 5} more...
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}