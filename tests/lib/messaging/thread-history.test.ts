import { describe, expect, it } from 'vitest';

import {
  flattenThreadHistoryPages,
  getNextThreadHistoryOffset,
  getPrependedThreadScrollTop,
  isThreadViewportNearBottom,
} from '@/lib/messaging/thread-history';

describe('thread history utilities', () => {
  it('flattens fetched pages into chronological order from oldest to newest', () => {
    const messages = flattenThreadHistoryPages([
      { messages: ['newest-3', 'newest-4'] },
      { messages: ['older-1', 'older-2'] },
    ]);

    expect(messages).toEqual(['older-1', 'older-2', 'newest-3', 'newest-4']);
  });

  it('computes the next offset from the total fetched message count', () => {
    expect(
      getNextThreadHistoryOffset([
        { messages: ['a', 'b', 'c'] },
        { messages: ['d'] },
      ])
    ).toBe(4);
  });

  it('preserves the visible anchor when older messages are prepended', () => {
    expect(getPrependedThreadScrollTop(24, 800, 1120)).toBe(344);
  });

  it('detects when the viewport is still near the bottom', () => {
    expect(
      isThreadViewportNearBottom({
        scrollTop: 640,
        clientHeight: 300,
        scrollHeight: 980,
      })
    ).toBe(true);

    expect(
      isThreadViewportNearBottom({
        scrollTop: 200,
        clientHeight: 300,
        scrollHeight: 980,
      })
    ).toBe(false);
  });
});
