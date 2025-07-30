import { useMemo, useCallback, useRef, useState, useEffect } from 'react';

/**
 * Performance optimization hooks for the mentor content management system
 */

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Simple throttle implementation
function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

// Debounced value hook for search and filtering
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttled callback hook for expensive operations
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useMemo(
    () => throttle((...args) => callbackRef.current(...args), delay),
    [delay]
  ) as T;
}

// Debounced callback hook for search and input handling
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useMemo(
    () => debounce((...args) => callbackRef.current(...args), delay),
    [delay]
  ) as T;
}

// Intersection Observer hook for lazy loading and virtualization
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return isIntersecting;
}

// Memoized filtering hook for large lists
export function useMemoizedFilter<T>(
  items: T[],
  filterFn: (item: T) => boolean,
  deps: React.DependencyList = []
): T[] {
  return useMemo(() => {
    return items.filter(filterFn);
  }, [items, ...deps]);
}

// Memoized sorting hook for large lists
export function useMemoizedSort<T>(
  items: T[],
  compareFn: (a: T, b: T) => number,
  deps: React.DependencyList = []
): T[] {
  return useMemo(() => {
    return [...items].sort(compareFn);
  }, [items, ...deps]);
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} rendered ${renderCount.current} times. Time since last render: ${timeSinceLastRender}ms`);
    }
  }); // No dependencies array because we want this to run on every render

  return {
    renderCount: renderCount.current,
    reset: useCallback(() => {
      renderCount.current = 0;
      lastRenderTime.current = Date.now();
    }, [])
  };
}

// Stable callback hook to prevent unnecessary re-renders
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
}