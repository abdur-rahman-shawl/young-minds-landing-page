import { describe, expect, it } from 'vitest';

import { adminCreateMentorUserInputSchema } from '@/lib/admin/server/schemas';

const VALID_INPUT = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  initialPassword: 'mentor123',
  phone: '+91-9999999999',
  title: 'Chief Scientist',
  company: 'Analytical Engines',
  industry: 'ITSoftware',
  experience: 12,
  expertise: [
    'Mathematics',
    'Programming',
    'Algorithms',
    'Leadership',
    'Research',
  ],
  about: 'Builds analytical engines.',
  linkedinUrl: 'https://www.linkedin.com/in/ada-lovelace',
  country: 'India',
  state: 'Karnataka',
  city: 'Bengaluru',
  availability: 'Weekly',
  profileImageUrl: 'profiles/ada.png',
};

describe('adminCreateMentorUserInputSchema', () => {
  it('accepts the full mentor application profile while keeping resume optional', () => {
    expect(adminCreateMentorUserInputSchema.parse(VALID_INPUT)).toMatchObject(
      VALID_INPUT
    );
  });

  it('requires the same core mentor profile fields as the public application form', () => {
    const result = adminCreateMentorUserInputSchema.safeParse({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      initialPassword: 'mentor123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toMatchObject({
        phone: expect.any(Array),
        title: expect.any(Array),
        company: expect.any(Array),
        industry: expect.any(Array),
        experience: expect.any(Array),
        expertise: expect.any(Array),
        linkedinUrl: expect.any(Array),
        country: expect.any(Array),
        state: expect.any(Array),
        city: expect.any(Array),
        availability: expect.any(Array),
      });
    }
  });

  it('requires at least five expertise areas', () => {
    const result = adminCreateMentorUserInputSchema.safeParse({
      ...VALID_INPUT,
      expertise: ['Mathematics', 'Programming'],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.expertise).toContain(
        'Please list at least 5 areas of expertise'
      );
    }
  });
});
