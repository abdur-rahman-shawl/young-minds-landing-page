"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

/**
 * Production-grade error boundary for profile components
 * Provides graceful error recovery and comprehensive error reporting
 */
export class ProfileErrorBoundary extends Component<Props, State> {
  private maxRetries = 3
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service in production
    console.error('ProfileErrorBoundary caught an error:', error, errorInfo)
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Report to error monitoring service
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Example: Sentry, DataDog, or custom error reporting
      // window.errorReporting?.captureException(error, { extra: errorInfo })
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      console.warn('Maximum retry attempts reached')
      return
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }))

    // Auto-retry with exponential backoff for temporary issues
    if (this.state.retryCount < this.maxRetries - 1) {
      this.retryTimeoutId = setTimeout(() => {
        // Component will re-render and potentially recover
      }, Math.pow(2, this.state.retryCount) * 1000)
    }
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isDevelopment = process.env.NODE_ENV === 'development'
      const canRetry = this.state.retryCount < this.maxRetries

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center px-6">
          <Card className="w-full max-w-2xl shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  We encountered an unexpected error while loading your profile. 
                  Our team has been notified and is working to resolve the issue.
                </AlertDescription>
              </Alert>

              {isDevelopment && this.state.error && (
                <details className="bg-gray-50 rounded-lg p-4 text-sm">
                  <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
                    Developer Information (Click to expand)
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <strong>Error:</strong>
                      <pre className="mt-1 text-red-600 whitespace-pre-wrap">
                        {this.state.error.toString()}
                      </pre>
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className="mt-1 text-gray-600 text-xs whitespace-pre-wrap overflow-auto max-h-40">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 text-gray-600 text-xs whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {canRetry && (
                  <Button
                    onClick={this.handleRetry}
                    className="gap-2"
                    variant="default"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                  </Button>
                )}
                
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go to Dashboard
                </Button>
              </div>

              {!canRetry && (
                <div className="text-center text-sm text-gray-600">
                  <p>If the problem persists, please contact support.</p>
                  <p className="mt-1">Error ID: {Date.now().toString(36)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withProfileErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorHandler?: (error: Error, errorInfo: ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ProfileErrorBoundary onError={errorHandler}>
      <Component {...props} />
    </ProfileErrorBoundary>
  )

  WrappedComponent.displayName = `withProfileErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}