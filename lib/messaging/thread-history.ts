export interface ThreadHistoryPage<TMessage = unknown> {
  messages: TMessage[];
}

export function flattenThreadHistoryPages<TMessage>(
  pages: ReadonlyArray<ThreadHistoryPage<TMessage>> | undefined
) {
  if (!pages || pages.length === 0) {
    return [] as TMessage[];
  }

  const flattened: TMessage[] = [];

  for (let index = pages.length - 1; index >= 0; index -= 1) {
    flattened.push(...pages[index].messages);
  }

  return flattened;
}

export function getNextThreadHistoryOffset(
  pages: ReadonlyArray<ThreadHistoryPage> | undefined
) {
  if (!pages || pages.length === 0) {
    return 0;
  }

  return pages.reduce((count, page) => count + page.messages.length, 0);
}

export function getPrependedThreadScrollTop(
  previousScrollTop: number,
  previousScrollHeight: number,
  nextScrollHeight: number
) {
  return previousScrollTop + (nextScrollHeight - previousScrollHeight);
}

export function isThreadViewportNearBottom(input: {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
  threshold?: number;
}) {
  const { scrollTop, clientHeight, scrollHeight, threshold = 80 } = input;
  return scrollHeight - (scrollTop + clientHeight) <= threshold;
}
