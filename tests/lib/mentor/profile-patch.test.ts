import { describe, expect, it } from 'vitest';

import { buildMentorProfileUpdate } from '@/lib/mentor/profile-patch';

describe('buildMentorProfileUpdate', () => {
  it('marks the profile for re-verification while preserving admin-owned notes', () => {
    const result = buildMentorProfileUpdate(
      {
        fullName: 'Existing Mentor',
        email: 'mentor@example.com',
        phone: '+1-555-0101',
        title: 'Engineer',
        company: 'YoungMinds',
        city: 'London',
        state: null,
        country: 'United Kingdom',
        industry: 'Technology',
        expertise: 'AI, Product',
        experience: 8,
        about: 'Existing bio',
        linkedinUrl: 'https://linkedin.com/in/existing',
        githubUrl: null,
        websiteUrl: null,
        hourlyRate: '120.00',
        currency: 'USD',
        availability: 'Weekly',
        headline: 'Existing headline',
        maxMentees: 10,
        profileImageUrl: 'profiles/existing.png',
        bannerImageUrl: 'banners/existing.png',
        resumeUrl: 'mentors/resumes/existing.pdf',
        verificationStatus: 'VERIFIED',
        verificationNotes: 'Please keep this note',
        isAvailable: true,
        searchMode: 'AI_SEARCH',
      },
      {
        fullName: ' Updated Mentor ',
        experience: 11,
        maxMentees: 15,
        profileImageUrl:
          'https://example.com/storage/v1/object/public/public/profiles/new.png',
        isAvailable: false,
        searchMode: 'EXCLUSIVE_SEARCH',
      }
    );

    expect(result.fullName).toBe('Updated Mentor');
    expect(result.experience).toBe(11);
    expect(result.maxMentees).toBe(15);
    expect(result.profileImageUrl).toBe('profiles/new.png');
    expect(result.verificationStatus).toBe('UPDATED_PROFILE');
    expect(result.verificationNotes).toBe('Please keep this note');
    expect(result.isAvailable).toBe(false);
    expect(result.searchMode).toBe('EXCLUSIVE_SEARCH');
  });

  it('preserves existing values when a field is omitted from the patch', () => {
    const result = buildMentorProfileUpdate(
      {
        fullName: 'Existing Mentor',
        email: 'mentor@example.com',
        phone: null,
        title: 'Engineer',
        company: 'YoungMinds',
        city: null,
        state: null,
        country: null,
        industry: null,
        expertise: null,
        experience: null,
        about: null,
        linkedinUrl: null,
        githubUrl: null,
        websiteUrl: null,
        hourlyRate: '120.00',
        currency: 'USD',
        availability: null,
        headline: null,
        maxMentees: 10,
        profileImageUrl: null,
        bannerImageUrl: null,
        resumeUrl: null,
        verificationStatus: 'VERIFIED',
        verificationNotes: null,
        isAvailable: true,
        searchMode: 'AI_SEARCH',
      },
      {
        company: 'Updated Company',
      }
    );

    expect(result.fullName).toBe('Existing Mentor');
    expect(result.company).toBe('Updated Company');
    expect(result.hourlyRate).toBe('120.00');
    expect(result.searchMode).toBe('AI_SEARCH');
  });

  it('keeps in-progress applications in progress on profile edits', () => {
    const result = buildMentorProfileUpdate(
      {
        fullName: 'Existing Mentor',
        email: 'mentor@example.com',
        phone: null,
        title: 'Engineer',
        company: 'YoungMinds',
        city: null,
        state: null,
        country: null,
        industry: null,
        expertise: null,
        experience: null,
        about: null,
        linkedinUrl: null,
        githubUrl: null,
        websiteUrl: null,
        hourlyRate: '120.00',
        currency: 'USD',
        availability: null,
        headline: null,
        maxMentees: 10,
        profileImageUrl: null,
        bannerImageUrl: null,
        resumeUrl: null,
        verificationStatus: 'IN_PROGRESS',
        verificationNotes: 'Still under review',
        isAvailable: true,
        searchMode: 'AI_SEARCH',
      },
      {
        company: 'Updated Company',
      }
    );

    expect(result.verificationStatus).toBe('IN_PROGRESS');
    expect(result.verificationNotes).toBe('Still under review');
  });
});
