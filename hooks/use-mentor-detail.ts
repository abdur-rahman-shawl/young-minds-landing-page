/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { useState, useEffect } from 'react';

interface MentorDetail {
  id: string;
  userId: string;
  title: string | null;
  company: string | null;
  industry: string | null;
  expertise: string | null;
  expertiseArray: string[];
  experience: number | null;
  hourlyRate: string | null;
  currency: string | null;
  availability: string | null;
  availabilityParsed: any;
  maxMentees: number | null;
  headline: string | null;
  about: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  profileImageUrl: string | null;
  resumeUrl: string | null;
  verificationStatus: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
  // User info
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  // Computed fields
  name: string | null;
  image: string | null;
}

interface UseMentorDetailReturn {
  mentor: MentorDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMentorDetail(mentorId: string | null): UseMentorDetailReturn {
  const [mentor, setMentor] = useState<MentorDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMentorDetail = async () => {
    if (!mentorId) {
      setMentor(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/mentors/${mentorId}`);
      const result = await response.json();
      
      if (result.success) {
        setMentor(result.data);
      } else {
        setError(result.error || 'Failed to fetch mentor details');
        setMentor(null);
      }
    } catch (err) {
      setError('Network error occurred while fetching mentor details');
      setMentor(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentorDetail();
  }, [mentorId]);

  return {
    mentor,
    loading,
    error,
    refetch: fetchMentorDetail
  };
}
