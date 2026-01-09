import { useState, useEffect } from 'react';

interface Mentor {
  id: string;
  userId: string;
  title: string;
  company: string;
  industry: string;
  expertise: string;
  experience: number;
  hourlyRate: number | null;
  currency: string;
  headline: string;
  about: string;
  linkedinUrl: string | null;
  isVerified: boolean;
  isAvailable: boolean;
  // User info
  name: string;
  email: string;
  image: string | null;
  bannerImageUrl?: string | null;
}

interface UseMentorsReturn {
  mentors: Mentor[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMentors(): UseMentorsReturn {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMentors = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/mentors');
      const result = await response.json();

      if (result.success) {
        setMentors(result.data);
      } else {
        setError(result.error || 'Failed to fetch mentors');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentors();
  }, []);

  return {
    mentors,
    loading,
    error,
    refetch: fetchMentors
  };
} 