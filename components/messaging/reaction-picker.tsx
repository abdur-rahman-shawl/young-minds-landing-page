'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { REACTION_EMOJIS } from '@/lib/db/schema/message-reactions';
import { cn } from '@/lib/utils';

interface ReactionPickerProps {
  onReact: (emoji: string) => void;
  className?: string;
  triggerClassName?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function ReactionPicker({
  onReact,
  className,
  triggerClassName,
  side = 'top',
}: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    onReact(emoji);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', triggerClassName)}
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        className={cn('w-auto p-2', className)}
      >
        <div className="flex flex-wrap gap-1 max-w-[280px]">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="h-8 w-8 rounded hover:bg-accent flex items-center justify-center text-lg transition-transform hover:scale-125"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}