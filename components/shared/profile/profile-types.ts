/**
 * Production-grade TypeScript interfaces for profile components
 * Ensures type safety and prevents runtime errors
 */

export interface BaseUser {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly image?: string
}

export interface MenteeProfile {
  readonly currentRole: string
  readonly currentCompany: string
  readonly education: string
  readonly careerGoals: string
  readonly currentSkills: string
  readonly skillsToLearn: string
  readonly interests: string
  readonly learningStyle: 'visual' | 'hands-on' | 'theoretical' | 'interactive' | ''
  readonly preferredMeetingFrequency: 'weekly' | 'bi-weekly' | 'monthly' | 'as-needed' | ''
}

export interface MentorProfile {
  readonly fullName: string
  readonly email: string
  readonly phone: string
  readonly title: string
  readonly company: string
  readonly city: string
  readonly country: string
  readonly industry: string
  readonly expertise: string
  readonly experience: string
  readonly about: string
  readonly linkedinUrl: string
  readonly githubUrl: string
  readonly websiteUrl: string
  readonly hourlyRate: string
  readonly availability: string
  readonly profileImageUrl: string
}

export interface ProfileState<T> {
  data: T
  isLoading: boolean
  isEditing: boolean
  isSaving: boolean
  error: string | null
  success: string | null
}

export interface ProfileActions<T> {
  setData: (data: T | ((prev: T) => T)) => void
  setIsLoading: (loading: boolean) => void
  setIsEditing: (editing: boolean) => void
  setIsSaving: (saving: boolean) => void
  setError: (error: string | null) => void
  setSuccess: (success: string | null) => void
}

export interface ApiResponse<T = unknown> {
  readonly success: boolean
  readonly data?: T
  readonly error?: string
}

export interface ProfileApiData {
  readonly menteeProfile?: MenteeProfile
  readonly mentorProfile?: MentorProfile
}

// Utility types for form handling
export type MenteeProfileFields = keyof MenteeProfile
export type MentorProfileFields = keyof MentorProfile

// Constants for validation
export const LEARNING_STYLES = ['visual', 'hands-on', 'theoretical', 'interactive'] as const
export const MEETING_FREQUENCIES = ['weekly', 'bi-weekly', 'monthly', 'as-needed'] as const