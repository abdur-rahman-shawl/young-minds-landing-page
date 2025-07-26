import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';

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

export function useUserRoles() {
  const { data: session } = useSession();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {
    async function fetchUserRoles() {
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        const response = await fetch(`/api/user/profile?userId=${session.user.id}&_t=${Date.now()}`);
        const result = await response.json();

        if (result.success && result.data.roles) {
          setRoles(result.data.roles);
          // Check if user has mentor profile
          if (result.data.mentorProfile) {
            setMentorProfile(result.data.mentorProfile);
          }
        } else {
          setRoles([]);
        }
      } catch (err) {
        setError('Failed to fetch user roles');
        console.error('Error fetching user roles:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserRoles();
  }, [session?.user?.id, refreshTrigger]);

  // Get the primary role to display (prefer mentor over mentee)
  const primaryRole = roles.find(role => role.name === 'mentor') || 
                     roles.find(role => role.name === 'mentee') || 
                     roles.find(role => role.name === 'admin') || 
                     null;

  // Check if mentor needs to complete profile
  const isMentorWithIncompleteProfile = roles.some(role => role.name === 'mentor') && 
                                       mentorProfile?.verificationStatus === 'IN_PROGRESS';

  return {
    roles,
    primaryRole,
    mentorProfile,
    isMentorWithIncompleteProfile,
    isLoading,
    error,
    refresh
  };
} 