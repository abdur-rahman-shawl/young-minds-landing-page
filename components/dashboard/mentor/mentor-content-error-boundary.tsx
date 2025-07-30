"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, BookOpen, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  context?: 'content-list' | 'course-builder' | 'upload' | 'general';
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class MentorContentErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Mentor content error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Report specific mentor content errors
    this.reportMentorContentError(error, errorInfo);
  }

  private reportMentorContentError = (error: Error, errorInfo: ErrorInfo) => {
    const context = this.props.context || 'general';
    const errorData = {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      console.error('Mentor content error reported:', errorData);
      // TODO: Integrate with error service (Sentry, LogRocket, etc.)
    }
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private getContextualContent = () => {
    const { context } = this.props;
    
    switch (context) {
      case 'content-list':
        return {
          title: 'Content Loading Error',
          description: 'We encountered an issue while loading your content. This might be due to a network issue or temporary server problem.',
          icon: <BookOpen className="h-8 w-8 text-blue-500" />,
          suggestions: [
            'Check your internet connection',
            'Try refreshing the page',
            'Contact support if the problem persists'
          ]
        };
      
      case 'course-builder':
        return {
          title: 'Course Builder Error',
          description: 'There was an issue with the course builder. Your progress should be saved automatically.',
          icon: <BookOpen className="h-8 w-8 text-green-500" />,
          suggestions: [
            'Try refreshing to recover your work',
            'Check if your changes were saved',
            'Try editing individual sections separately'
          ]
        };
      
      case 'upload':
        return {
          title: 'File Upload Error',
          description: 'We encountered an issue while uploading your file. The file might be too large or in an unsupported format.',
          icon: <Upload className="h-8 w-8 text-orange-500" />,
          suggestions: [
            'Check file size (max 100MB)',
            'Ensure file format is supported',
            'Try uploading a different file'
          ]
        };
      
      default:
        return {
          title: 'Something went wrong',
          description: 'We encountered an unexpected error in the mentor content area.',
          icon: <AlertTriangle className="h-8 w-8 text-red-500" />,
          suggestions: [
            'Try refreshing the page',
            'Check your internet connection',
            'Contact support if the issue continues'
          ]
        };
    }
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const contextContent = this.getContextualContent();

      // Contextual error UI for mentor content
      return (
        <Card className="max-w-2xl mx-auto mt-8">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {contextContent.icon}
            </div>
            <CardTitle className="text-xl">{contextContent.title}</CardTitle>
            <CardDescription>
              {contextContent.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Technical Details:</strong> {this.state.error?.message || 'Unknown error occurred'}
              </AlertDescription>
            </Alert>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">What you can try:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                {contextContent.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3 justify-center">
              <Button 
                onClick={this.handleRetry}
                variant="default"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>

              <Button 
                onClick={() => window.location.href = '/dashboard'}
                variant="outline"
              >
                Back to Dashboard
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-6 p-4 bg-gray-100 rounded-lg text-xs">
                <summary className="cursor-pointer font-medium text-gray-700">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-gray-600 max-h-64 overflow-auto">
                  {this.state.error?.stack}
                  {'\n\nComponent Stack:'}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook for handling mentor content errors programmatically
export const useMentorContentErrorHandler = () => {
  const handleError = (error: Error, context?: string) => {
    console.error(`Mentor content error in ${context}:`, error);
    
    // Report specific mentor content errors
    const errorData = {
      error: error.message,
      stack: error.stack,
      context: context || 'unknown',
      timestamp: new Date().toISOString(),
      feature: 'mentor-content',
    };

    // In production, report to error service
    if (process.env.NODE_ENV === 'production') {
      console.error('Mentor content error logged:', errorData);
      // TODO: Integrate with error service
    }
  };

  return { handleError };
};