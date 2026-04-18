import { describe, expect, it } from 'vitest';

import {
  buildMenteeProfilePatch,
  mapMenteeProfileToFormData,
} from '@/lib/profile/mentee-profile';

describe('mentee profile helpers', () => {
  it('maps nullable database values into stable form defaults', () => {
    expect(
      mapMenteeProfileToFormData({
        currentRole: null,
        currentCompany: 'Acme',
        learningStyle: 'unknown',
        preferredMeetingFrequency: 'weekly',
      })
    ).toEqual({
      currentRole: '',
      currentCompany: 'Acme',
      education: '',
      careerGoals: '',
      currentSkills: '',
      skillsToLearn: '',
      interests: '',
      learningStyle: '',
      preferredMeetingFrequency: 'weekly',
    });
  });

  it('builds a nullable persistence patch from form data', () => {
    const updatedAt = new Date('2026-04-06T00:00:00.000Z');

    expect(
      buildMenteeProfilePatch(
        {
          currentRole: 'Engineer',
          currentCompany: '',
          education: '',
          careerGoals: 'Grow',
          currentSkills: '',
          skillsToLearn: '',
          interests: '',
          learningStyle: '',
          preferredMeetingFrequency: '',
        },
        updatedAt
      )
    ).toEqual({
      currentRole: 'Engineer',
      currentCompany: null,
      education: null,
      careerGoals: 'Grow',
      currentSkills: null,
      skillsToLearn: null,
      interests: null,
      learningStyle: null,
      preferredMeetingFrequency: null,
      updatedAt,
    });
  });
});
