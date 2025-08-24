'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors except 408 (timeout) and 429 (rate limit)
              if (
                error &&
                typeof error === 'object' &&
                'statusCode' in error &&
                typeof error.statusCode === 'number'
              ) {
                if (error.statusCode >= 400 && error.statusCode < 500) {
                  if (error.statusCode === 408 || error.statusCode === 429) {
                    return failureCount < 2;
                  }
                  return false;
                }
              }
              
              // For other errors, retry up to 3 times
              return failureCount < 3;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: (failureCount, error) => {
              // Generally don't retry mutations, except for network errors
              if (
                error &&
                typeof error === 'object' &&
                'statusCode' in error &&
                typeof error.statusCode === 'number'
              ) {
                // Don't retry client errors (4xx)
                if (error.statusCode >= 400 && error.statusCode < 500) {
                  return false;
                }
                
                // Retry server errors (5xx) once
                if (error.statusCode >= 500) {
                  return failureCount < 1;
                }
              }
              
              // For network errors or unknown errors, retry once
              return failureCount < 1;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools 
        initialIsOpen={false} 
        buttonPosition="bottom-left"
        position="bottom"
      />
    </QueryClientProvider>
  );
}