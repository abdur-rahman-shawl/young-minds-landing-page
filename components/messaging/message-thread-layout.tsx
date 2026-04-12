'use client';

import type { ReactNode, Ref } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MessageThreadLayoutProps {
  header: ReactNode;
  body: ReactNode;
  composer?: ReactNode;
  headerClassName?: string;
  bodyClassName?: string;
  composerClassName?: string;
  scrollAreaRef?: Ref<HTMLDivElement>;
  scrollViewportRef?: Ref<HTMLDivElement>;
}

export function MessageThreadLayout({
  header,
  body,
  composer,
  headerClassName,
  bodyClassName,
  composerClassName,
  scrollAreaRef,
  scrollViewportRef,
}: MessageThreadLayoutProps) {
  return (
    <div
      data-testid='message-thread-layout'
      className='flex h-full min-h-0 min-w-0 flex-col overflow-hidden'
    >
      <div
        data-testid='message-thread-header'
        className={cn('shrink-0 border-b p-4', headerClassName)}
      >
        {header}
      </div>

      <ScrollArea
        ref={scrollAreaRef}
        viewportRef={scrollViewportRef}
        data-testid='message-thread-scroll-area'
        className={cn(
          'min-h-0 flex-1 bg-gradient-to-b from-muted/20 to-transparent p-4',
          bodyClassName
        )}
      >
        {body}
      </ScrollArea>

      {composer ? (
        <div
          data-testid='message-thread-composer'
          className={cn(
            'shrink-0 border-t border-border bg-card/80 backdrop-blur-sm',
            composerClassName
          )}
        >
          {composer}
        </div>
      ) : null}
    </div>
  );
}
