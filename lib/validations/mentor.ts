import { z } from 'zod';

export const mentorApplicationSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  title: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company is required'),
  industry: z.string().min(1, 'Industry is required'),
  experience: z.string().min(1, 'Experience is required'),
  expertise: z.string().min(100, 'Expertise must be at least 100 characters').max(500, 'Expertise must not exceed 500 characters'),
  about: z.string().min(1, 'About section is required'),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').min(1, 'LinkedIn URL is required'),
  availability: z.string().min(1, 'Availability is required'),
  profilePicture: z.any().refine(file => file, 'Profile picture is required'),
  resume: z.any().refine(file => file, 'Resume is required'),
  termsAccepted: z.boolean().refine(value => value, 'You must accept the terms and conditions'),
});
