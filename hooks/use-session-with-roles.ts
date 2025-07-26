import { useState, useEffect, useCallback } from 'react';

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

interface SessionWithRolesData {
  session: any;
  user: any;
  roles: UserRole[];
  mentorProfile: MentorProfile | null;
  isAdmin: boolean;
  isMentor: boolean;
  isMentee: boolean;
  isMentorWithIncompleteProfile: boolean;
}

interface UseSessionWithRolesReturn {
  data: SessionWithRolesData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Cache for request deduplication
let cachedPromise: Promise<SessionWithRolesData | null> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5000; // 5 seconds

export function useSessionWithRoles(): UseSessionWithRolesReturn {
  const [data, setData] = useState<SessionWithRolesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessionWithRoles = useCallback(async (): Promise<SessionWithRolesData | null> => {
    const now = Date.now();
    
    // Return cached promise if available and fresh
    if (cachedPromise && (now - cacheTimestamp) < CACHE_DURATION) {
      return cachedPromise;
    }

    // Create new promise and cache it
    cachedPromise = (async () => {
      try {
        const response = await fetch('/api/auth/session-with-roles', {
          credentials: 'include',
          cache: 'no-cache',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          return result.data;
        } else {
          throw new Error(result.error || 'Failed to fetch session');
        }
      } catch (error) {
        console.error('Error fetching session with roles:', error);
        throw error;
      }
    })();

    cacheTimestamp = now;
    return cachedPromise;
  }, []);

  const refresh = useCallback(async () => {
    // Clear cache to force fresh request
    cachedPromise = null;
    cacheTimestamp = 0;
    
    setIsLoading(true);
    setError(null);

    try {
      const sessionData = await fetchSessionWithRoles();
      setData(sessionData);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchSessionWithRoles]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}

// Clear cache when needed (e.g., after sign out)
export function clearSessionCache() {
  cachedPromise = null;
  cacheTimestamp = 0;
}