import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';

interface UserRole {
  name: string;
  displayName: string;
}

export function useUserRoles() {
  const { data: session } = useSession();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserRoles() {
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        const response = await fetch(`/api/user/profile?userId=${session.user.id}`);
        const result = await response.json();

        if (result.success && result.data.roles) {
          setRoles(result.data.roles);
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
  }, [session?.user?.id]);

  // Get the primary role to display (prefer mentor over mentee)
  const primaryRole = roles.find(role => role.name === 'mentor') || 
                     roles.find(role => role.name === 'mentee') || 
                     roles.find(role => role.name === 'admin') || 
                     null;

  return {
    roles,
    primaryRole,
    isLoading,
    error
  };
} 