"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Send to error reporting service
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry, LogRocket, etc.
      console.error('Production error:', { error, errorInfo });
    }
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleLogout = async () => {
    try {
      const { signOut } = await import('@/lib/auth-client');
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-6">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />
              <h2 className="mt-4 text-2xl font-bold text-gray-900">
                Something went wrong
              </h2>
              <p className="mt-2 text-gray-600">
                We encountered an unexpected error. This has been logged and we'll look into it.
              </p>
            </div>

            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Error:</strong> {this.state.error?.message || 'Unknown error occurred'}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button 
                onClick={this.handleRetry}
                className="w-full"
                variant="default"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>

              <Button 
                onClick={this.handleGoHome}
                className="w-full"
                variant="outline"
              >
                <Home className="mr-2 h-4 w-4" />
                Go to Homepage
              </Button>

              <Button 
                onClick={this.handleLogout}
                className="w-full"
                variant="ghost"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-6 p-4 bg-gray-100 rounded-lg text-xs">
                <summary className="cursor-pointer font-medium text-gray-700">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-gray-600">
                  {this.state.error?.stack}
                  {'\n\nComponent Stack:'}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specific error boundary for auth-related errors
export class AuthErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Only catch auth-related errors
    const isAuthError = error.message.includes('auth') || 
                       error.message.includes('session') ||
                       error.message.includes('unauthorized') ||
                       error.message.includes('token');
    
    return { hasError: isAuthError, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Auth error caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleSignOut = async () => {
    try {
      const { signOut } = await import('@/lib/auth-client');
      await signOut();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error during sign out:', error);
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-amber-500" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Authentication Error
              </h2>
              <p className="mt-2 text-gray-600">
                Your session has expired or there was an authentication error. 
                Please sign in again to continue.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={this.handleSignOut}
                className="w-full"
              >
                Sign In Again
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="w-full"
              >
                Go to Homepage
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for programmatic error reporting
export const useErrorHandler = () => {
  const handleError = (error: Error, context?: string) => {
    console.error(`Error in ${context}:`, error);
    
    // In production, report to error service
    if (process.env.NODE_ENV === 'production') {
      // Report to error service
    }
  };

  return { handleError };
};