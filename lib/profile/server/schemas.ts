import { z } from 'zod';

export const menteeLearningStyleSchema = z.enum([
  'visual',
  'hands-on',
  'theoretical',
  'interactive',
  '',
]);

export const menteeMeetingFrequencySchema = z.enum([
  'weekly',
  'bi-weekly',
  'monthly',
  'as-needed',
  '',
]);

export const upsertMenteeProfileInputSchema = z.object({
  currentRole: z.string().trim().max(100),
  currentCompany: z.string().trim().max(120),
  education: z.string().trim().max(1000),
  careerGoals: z.string().trim().max(1000),
  currentSkills: z.string().trim().max(500),
  skillsToLearn: z.string().trim().max(500),
  interests: z.string().trim().max(500),
  learningStyle: menteeLearningStyleSchema,
  preferredMeetingFrequency: menteeMeetingFrequencySchema,
});

export type UpsertMenteeProfileInput = z.infer<
  typeof upsertMenteeProfileInputSchema
>;
