"use client";

import React from 'react';
import { ErrorBoundary, AuthErrorBoundary } from '@/components/common/error-boundary';
import { QueryErrorResetBoundary } from '@tanstack/react-query';

interface ErrorProviderProps {
  children: React.ReactNode;
}

/**
 * Comprehensive error provider that wraps the application with multiple error boundaries
 * - QueryErrorResetBoundary: Handles React Query errors
 * - AuthErrorBoundary: Handles authentication-related errors
 * - ErrorBoundary: Handles general React errors
 */
export function ErrorProvider({ children }: ErrorProviderProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <AuthErrorBoundary
          onError={(error, errorInfo) => {
            console.error('Auth error in top-level boundary:', error, errorInfo);
          }}
        >
          <ErrorBoundary
            onError={(error, errorInfo) => {
              console.error('General error in top-level boundary:', error, errorInfo);
              // Reset React Query errors when general errors occur
              reset();
            }}
          >
            {children}
          </ErrorBoundary>
        </AuthErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}