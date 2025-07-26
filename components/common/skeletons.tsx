"use client";

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Dashboard skeleton components
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 bg-white rounded-lg border">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-6 bg-white rounded-lg border">
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-white rounded-lg border">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mentor list skeleton
export function MentorListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-6 bg-white rounded-lg border">
          <div className="flex items-start space-x-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
              <div className="flex space-x-2 mt-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-6 w-16 rounded-full" />
                ))}
              </div>
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Profile skeleton
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4 p-6 bg-white rounded-lg border">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Form sections */}
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 bg-white rounded-lg border">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Message list skeleton
export function MessageListSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Chat skeleton
export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center space-x-3 p-4 border-b">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-xs p-3 rounded-lg ${i % 2 === 0 ? 'bg-gray-100' : 'bg-blue-100'}`}>
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Chat input */}
      <div className="p-4 border-t">
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

// Session/Meeting skeleton
export function SessionSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 bg-white rounded-lg border">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex-1 p-4">
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex border-b">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="flex-1 p-4">
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Card grid skeleton
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 bg-white rounded-lg border">
          <Skeleton className="h-32 w-full mb-4 rounded" />
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex justify-between items-center mt-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Loading state wrapper
export function LoadingStateWrapper({ 
  isLoading, 
  skeleton, 
  children 
}: { 
  isLoading: boolean; 
  skeleton: React.ReactNode; 
  children: React.ReactNode; 
}) {
  if (isLoading) {
    return <>{skeleton}</>;
  }
  return <>{children}</>;
}

// Auth loading screen
export function AuthLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}