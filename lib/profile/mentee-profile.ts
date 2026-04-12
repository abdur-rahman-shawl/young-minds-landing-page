import type { MenteeProfile } from '@/components/shared/profile/profile-types';

export interface MenteeProfileRecordLike {
  currentRole?: string | null;
  currentCompany?: string | null;
  education?: string | null;
  careerGoals?: string | null;
  currentSkills?: string | null;
  skillsToLearn?: string | null;
  interests?: string | null;
  learningStyle?: string | null;
  preferredMeetingFrequency?: string | null;
}

export function mapMenteeProfileToFormData(
  profile: MenteeProfileRecordLike | null | undefined
): MenteeProfile {
  return {
    currentRole: profile?.currentRole || '',
    currentCompany: profile?.currentCompany || '',
    education: profile?.education || '',
    careerGoals: profile?.careerGoals || '',
    currentSkills: profile?.currentSkills || '',
    skillsToLearn: profile?.skillsToLearn || '',
    interests: profile?.interests || '',
    learningStyle:
      profile?.learningStyle === 'visual' ||
      profile?.learningStyle === 'hands-on' ||
      profile?.learningStyle === 'theoretical' ||
      profile?.learningStyle === 'interactive'
        ? profile.learningStyle
        : '',
    preferredMeetingFrequency:
      profile?.preferredMeetingFrequency === 'weekly' ||
      profile?.preferredMeetingFrequency === 'bi-weekly' ||
      profile?.preferredMeetingFrequency === 'monthly' ||
      profile?.preferredMeetingFrequency === 'as-needed'
        ? profile.preferredMeetingFrequency
        : '',
  };
}

export function buildMenteeProfilePatch(
  profile: MenteeProfile,
  updatedAt: Date = new Date()
) {
  return {
    currentRole: profile.currentRole || null,
    currentCompany: profile.currentCompany || null,
    education: profile.education || null,
    careerGoals: profile.careerGoals || null,
    interests: profile.interests || null,
    skillsToLearn: profile.skillsToLearn || null,
    currentSkills: profile.currentSkills || null,
    learningStyle: profile.learningStyle || null,
    preferredMeetingFrequency: profile.preferredMeetingFrequency || null,
    updatedAt,
  };
}
