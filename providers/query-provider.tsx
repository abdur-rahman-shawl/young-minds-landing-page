"use client";

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink, loggerLink } from '@trpc/client';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import superjson from 'superjson';
import type { AppRouter } from '@/lib/trpc/routers/_app';
import { TRPCProvider } from '@/lib/trpc/react';

interface QueryProviderProps {
  children: React.ReactNode;
}

function getTRPCErrorHttpStatus(result: unknown): number | null {
  if (!result || typeof result !== 'object') {
    return null;
  }

  if ('data' in result) {
    const httpStatus = (result as { data?: { httpStatus?: unknown } }).data?.httpStatus;
    return typeof httpStatus === 'number' ? httpStatus : null;
  }

  if ('result' in result) {
    const httpStatus = (
      result as {
        result?: {
          error?: {
            data?: {
              httpStatus?: unknown;
            };
          };
        };
      }
    ).result?.error?.data?.httpStatus;

    return typeof httpStatus === 'number' ? httpStatus : null;
  }

  return null;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create a client per component tree to avoid shared state issues
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered stale after 5 minutes
            staleTime: 5 * 60 * 1000,
            // Cache data for 30 minutes
            gcTime: 30 * 60 * 1000,
            // Retry failed requests intelligently
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors (client errors)
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              // Retry up to 3 times for other errors
              return failureCount < 3;
            },
            // Refetch on window focus for critical data
            refetchOnWindowFocus: true,
            // Refetch on reconnect
            refetchOnReconnect: 'always',
          },
          mutations: {
            // Retry mutations once on failure
            retry: 1,
          },
        },
      })
  );
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          enabled: (opts) => {
            if (opts.direction === 'down') {
              const httpStatus = getTRPCErrorHttpStatus(opts.result);

              if (httpStatus !== null && httpStatus < 500) {
                return false;
              }
            }

            return process.env.NODE_ENV === 'development';
          },
        }),
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: 'include',
            });
          },
        }),
      ],
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
        {children}
        {/* Only show devtools in development */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools 
            initialIsOpen={false}
            buttonPosition="bottom-right"
          />
        )}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
