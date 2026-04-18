import { describe, expect, it } from 'vitest';

import {
  canAccessMentorOperations,
  canBrowseMentorDirectory,
  sanitizeMentorDetailForViewer,
} from '@/lib/mentor/access';

describe('mentor access helpers', () => {
  it('allows mentees and admins to browse the mentor directory', () => {
    expect(canBrowseMentorDirectory(['mentee'])).toBe(true);
    expect(canBrowseMentorDirectory(['admin'])).toBe(true);
    expect(canBrowseMentorDirectory(['mentor'])).toBe(false);
  });

  it('allows mentors and admins to access mentor operations', () => {
    expect(canAccessMentorOperations(['mentor'])).toBe(true);
    expect(canAccessMentorOperations(['admin'])).toBe(true);
    expect(canAccessMentorOperations(['mentee'])).toBe(false);
  });

  it('removes sensitive fields for non-admin mentor detail viewers', () => {
    expect(
      sanitizeMentorDetailForViewer(
        {
          email: 'mentor@example.com',
          phone: '123',
          resumeUrl: '/resume.pdf',
          userEmail: 'user@example.com',
        },
        false
      )
    ).toEqual({
      email: null,
      phone: null,
      resumeUrl: null,
      userEmail: null,
    });
  });
});
