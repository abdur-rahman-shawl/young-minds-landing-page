import { z } from 'zod';

const MAX_RESUME_SIZE = 5 * 1024 * 1024; // 5MB

export const mentorApplicationSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+\d{1,4}-\d{6,15}$/, 'Invalid phone number format. Expected +countrycode-number'),
  country: z.string().min(1, 'Country is required'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  title: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company is required'),
  industry: z.string().min(1, 'Industry is required'),
  otherIndustry: z.string().optional(), // New field for specifying 'Other' industry
  experience: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().min(2, 'Minimum 2 years of experience is required')
  ),
  expertise: z.string()
    .min(1, 'Expertise is required')
    .max(500, 'Expertise must not exceed 500 characters')
    .refine(value => value.split(',').length >= 5, 'Please list at least 5 areas of expertise, separated by commas.'),
  about: z.string().optional(),
  linkedinUrl: z.string().url('Invalid URL').regex(/^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/, 'Invalid LinkedIn profile URL'),
  availability: z.string().min(1, 'Availability is required'),
  profilePicture: z.any().refine(file => file, 'Profile picture is required'),
  resume: z.any()
    .refine(file => !file || file.size <= MAX_RESUME_SIZE, `Resume must be less than 5MB`)
    .optional(),
  termsAccepted: z.boolean().refine(value => value, 'You must accept the terms and conditions'),
}).superRefine((data, ctx) => {
  if (data.industry === 'Other' && (!data.otherIndustry || data.otherIndustry.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please specify your industry',
      path: ['otherIndustry'],
    });
  }
});
