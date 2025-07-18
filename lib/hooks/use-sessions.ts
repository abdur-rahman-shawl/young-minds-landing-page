import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';

interface Session {
  id: string;
  mentorId: string;
  menteeId: string;
  scheduledAt: string;
  duration: number;
  status: string;
  topic: string | null;
  notes: string | null;
  rating: number | null;
  feedback: string | null;
  mentorName: string;
  mentorTitle: string;
  mentorCompany: string;
}

interface UseSessionsReturn {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  bookSession: (sessionData: any) => Promise<boolean>;
  cancelSession: (sessionId: string) => Promise<boolean>;
}

export function useSessions(type: 'upcoming' | 'past' | 'all' = 'all'): UseSessionsReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  const fetchSessions = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/sessions?userId=${session.user.id}&type=${type}`);
      const result = await response.json();
      
      if (result.success) {
        setSessions(result.data);
      } else {
        setError(result.error || 'Failed to fetch sessions');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const bookSession = async (sessionData: any): Promise<boolean> => {
    if (!session?.user?.id) return false;

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sessionData,
          menteeId: session.user.id,
          action: 'book'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        await fetchSessions(); // Refresh the list
        return true;
      } else {
        setError(result.error || 'Failed to book session');
        return false;
      }
    } catch (err) {
      setError('Network error occurred');
      return false;
    }
  };

  const cancelSession = async (sessionId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'cancel'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        await fetchSessions(); // Refresh the list
        return true;
      } else {
        setError(result.error || 'Failed to cancel session');
        return false;
      }
    } catch (err) {
      setError('Network error occurred');
      return false;
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [session?.user?.id, type]);

  return {
    sessions,
    loading,
    error,
    refetch: fetchSessions,
    bookSession,
    cancelSession
  };
} 