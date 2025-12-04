'use client';

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useSessionWithRolesQuery, useSignOutMutation, useRefreshSessionMutation } from '@/hooks/queries/use-session-query';
import { AuthErrorBoundary, useErrorHandler } from '@/components/common/error-boundary';
import { signIn as betterAuthSignIn } from '@/lib/auth-client';

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
  paymentStatus?: 'PENDING' | 'COMPLETED' | 'FAILED';
  couponCode?: string | null;
  isCouponCodeEnabled?: boolean;
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
  signIn: (provider: string, credentials: any) => Promise<any>;
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
    refetch,
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
    await refetch();
  }, [refetch]);

  // Set or remove userId in localStorage on login/logout
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (session?.user?.id) {
      localStorage.setItem('userId', session.user.id);
    } else {
      localStorage.removeItem('userId');
    }
  }, [session?.user?.id]);

  const handleSignIn = useCallback(async (provider: string, credentials: any) => {
    try {
      let result: any;
      if (provider === 'email') {
        // Email/password sign in
        result = await (betterAuthSignIn as any).email(credentials);
      } else if (provider === 'social') {
        // Social provider sign in (e.g., Google)
        result = await (betterAuthSignIn as any).social(credentials);
      } else {
        throw new Error(`Unsupported sign-in provider: ${provider}`);
      }

      // Normalize BetterAuth error shape: throw to let callers show inline errors
      if (result?.error) {
        const message = (result.error as any)?.message || 'Invalid credentials';
        throw new Error(message);
      }

      // Ensure session/react-query state updates
      await refreshUserData();
      return result;
    } catch (err) {
      const error = err as Error;
      handleError(error, 'signIn');
      throw error;
    }
  }, [refreshUserData, handleError]);

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
    signIn: handleSignIn,
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
