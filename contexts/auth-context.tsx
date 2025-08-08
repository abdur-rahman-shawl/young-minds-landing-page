"use client";

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useSessionWithRolesQuery, useSignOutMutation, useRefreshSessionMutation } from '@/hooks/queries/use-session-query';
import { AuthErrorBoundary, useErrorHandler } from '@/components/common/error-boundary';

interface UserRole {
  name: string;
  displayName: string;
}

interface MentorProfile {
  verificationStatus: string;
  id: string;
  profileImageUrl?: string;
  resumeUrl?: string;
  fullName?: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  industry?: string;
  expertise?: string;
  experience?: number;
  about?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  hourlyRate?: string;
  currency?: string;
  availability?: string;
  headline?: string;
  maxMentees?: number;
}

interface AuthState {
  // Session data
  session: any;
  isSessionLoading: boolean;
  
  // Role data  
  roles: UserRole[];
  primaryRole: UserRole | null;
  mentorProfile: MentorProfile | null;
  isRolesLoading: boolean;
  
  // Computed states
  isAuthenticated: boolean;
  isLoading: boolean;
  isMentorWithIncompleteProfile: boolean;
  isAdmin: boolean;
  isMentor: boolean;
  isMentee: boolean;
  
  // Actions
  refreshUserData: () => Promise<void>;
  signOut: () => Promise<void>;
  
  // Error states
  error: string | null;
}

const AuthContext = createContext<AuthState | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

function AuthProviderInner({ children }: AuthProviderProps) {
  const { handleError } = useErrorHandler();
  
  // Use React Query for session management
  const { 
    data: sessionData, 
    isLoading, 
    error: sessionError, 
  } = useSessionWithRolesQuery();

  const signOutMutation = useSignOutMutation();
  const refreshSessionMutation = useRefreshSessionMutation();

  // Extract data from React Query response
  const session = sessionData?.session || null;
  const roles = sessionData?.roles || [];
  const mentorProfile = sessionData?.mentorProfile || null;
  const error = sessionError?.message || null;

  // Computed states from optimized response
  const isAuthenticated = Boolean(session?.user);
  const isAdmin = sessionData?.isAdmin || false;
  const isMentor = sessionData?.isMentor || false;
  const isMentee = sessionData?.isMentee || false;
  const isMentorWithIncompleteProfile = sessionData?.isMentorWithIncompleteProfile || false;
  
  const primaryRole = roles.find(role => role.name === 'mentor') || 
                     roles.find(role => role.name === 'mentee') || 
                     roles.find(role => role.name === 'admin') || 
                     null;

  // Refresh function using React Query
  const refreshUserData = useCallback(async () => {
    await refreshSessionMutation.mutateAsync();
  }, [refreshSessionMutation]);

  // Set or remove userId in localStorage on login/logout
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (session?.user?.id) {
      localStorage.setItem('userId', session.user.id);
    } else {
      localStorage.removeItem('userId');
    }
  }, [session?.user?.id]);

  // Patch sign out to also clear userId
  const handleSignOut = useCallback(async () => {
    try {
      await signOutMutation.mutateAsync();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userId');
      }
    } catch (err) {
      const error = err as Error;
      handleError(error, 'signOut');
      throw error; // Re-throw to be handled by error boundary
    }
  }, [signOutMutation, handleError]);


  const value: AuthState = {
    session,
    isSessionLoading: isLoading,
    roles,
    primaryRole,
    mentorProfile,
    isRolesLoading: isLoading,
    isAuthenticated,
    isLoading: isLoading || signOutMutation.isPending || refreshSessionMutation.isPending,
    isMentorWithIncompleteProfile,
    isAdmin,
    isMentor,
    isMentee,
    refreshUserData,
    signOut: handleSignOut,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <AuthErrorBoundary>
      <AuthProviderInner>
        {children}
      </AuthProviderInner>
    </AuthErrorBoundary>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Legacy hook for backwards compatibility - can be removed after migration
export function useUserRoles() {
  const auth = useAuth();
  return {
    roles: auth.roles,
    primaryRole: auth.primaryRole,
    mentorProfile: auth.mentorProfile,
    isMentorWithIncompleteProfile: auth.isMentorWithIncompleteProfile,
    isLoading: auth.isRolesLoading,
    error: auth.error,
    refresh: auth.refreshUserData,
  };
}