import type { Mentor } from '@/lib/db/schema';
import { resolveMentorVerificationTransition } from '@/lib/mentor/verification-state-machine';

export interface MentorProfilePatchInput {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  company?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  industry?: string | null;
  expertise?: string | null;
  experience?: number | string | null;
  about?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
  hourlyRate?: number | string | null;
  currency?: string | null;
  availability?: string | null;
  headline?: string | null;
  maxMentees?: number | string | null;
  profileImageUrl?: string | null;
  bannerImageUrl?: string | null;
  resumeUrl?: string | null;
  isAvailable?: boolean | string | null;
  searchMode?: 'AI_SEARCH' | 'EXCLUSIVE_SEARCH' | null;
}

function toNullableNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveBooleanFlag(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return fallback;
}

function normalizeMentorStorageValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (!value.startsWith('http')) {
    return value;
  }

  try {
    const url = new URL(value);
    const marker = '/storage/v1/object/';
    const index = url.pathname.indexOf(marker);
    if (index === -1) {
      return value;
    }

    let tail = url.pathname.slice(index + marker.length);
    if (tail.startsWith('public/')) {
      tail = tail.slice('public/'.length);
    }
    if (tail.startsWith('sign/')) {
      tail = tail.slice('sign/'.length);
    }

    const parts = tail.split('/').filter(Boolean);
    if (parts.length < 2) {
      return value;
    }

    return parts.slice(1).join('/');
  } catch (_error) {
    return value;
  }
}

export function buildMentorProfileUpdate(
  existingMentor: Pick<
    Mentor,
    | 'fullName'
    | 'email'
    | 'phone'
    | 'title'
    | 'company'
    | 'city'
    | 'state'
    | 'country'
    | 'industry'
    | 'expertise'
    | 'experience'
    | 'about'
    | 'linkedinUrl'
    | 'githubUrl'
    | 'websiteUrl'
    | 'hourlyRate'
    | 'currency'
    | 'availability'
    | 'headline'
    | 'maxMentees'
    | 'profileImageUrl'
    | 'bannerImageUrl'
    | 'resumeUrl'
    | 'verificationStatus'
    | 'verificationNotes'
    | 'isAvailable'
    | 'searchMode'
  >,
  input: MentorProfilePatchInput
) {
  const fallbackAvailability = existingMentor.isAvailable !== false;
  const nextSearchMode =
    input.searchMode === 'AI_SEARCH' || input.searchMode === 'EXCLUSIVE_SEARCH'
      ? input.searchMode
      : existingMentor.searchMode || 'AI_SEARCH';

  const nextProfileImageUrl =
      input.profileImageUrl === undefined
        ? existingMentor.profileImageUrl
      : normalizeMentorStorageValue(input.profileImageUrl);
  const nextBannerImageUrl =
    input.bannerImageUrl === undefined
      ? existingMentor.bannerImageUrl
      : normalizeMentorStorageValue(input.bannerImageUrl);
  const nextResumeUrl =
    input.resumeUrl === undefined
      ? existingMentor.resumeUrl
      : normalizeMentorStorageValue(input.resumeUrl);

  return {
    fullName:
      input.fullName === undefined
        ? existingMentor.fullName
        : toNullableString(input.fullName),
    email:
      input.email === undefined
        ? existingMentor.email
        : toNullableString(input.email),
    phone:
      input.phone === undefined
        ? existingMentor.phone
        : toNullableString(input.phone),
    title:
      input.title === undefined
        ? existingMentor.title
        : toNullableString(input.title),
    company:
      input.company === undefined
        ? existingMentor.company
        : toNullableString(input.company),
    city:
      input.city === undefined ? existingMentor.city : toNullableString(input.city),
    state:
      input.state === undefined
        ? existingMentor.state
        : toNullableString(input.state),
    country:
      input.country === undefined
        ? existingMentor.country
        : toNullableString(input.country),
    industry:
      input.industry === undefined
        ? existingMentor.industry
        : toNullableString(input.industry),
    expertise:
      input.expertise === undefined
        ? existingMentor.expertise
        : toNullableString(input.expertise),
    experience:
      input.experience === undefined
        ? existingMentor.experience
        : toNullableNumber(input.experience),
    about:
      input.about === undefined
        ? existingMentor.about
        : toNullableString(input.about),
    linkedinUrl:
      input.linkedinUrl === undefined
        ? existingMentor.linkedinUrl
        : toNullableString(input.linkedinUrl),
    githubUrl:
      input.githubUrl === undefined
        ? existingMentor.githubUrl
        : toNullableString(input.githubUrl),
    websiteUrl:
      input.websiteUrl === undefined
        ? existingMentor.websiteUrl
        : toNullableString(input.websiteUrl),
    hourlyRate:
      input.hourlyRate === undefined
        ? existingMentor.hourlyRate
        : toNullableString(input.hourlyRate),
    currency:
      input.currency === undefined
        ? existingMentor.currency || 'USD'
        : toNullableString(input.currency) || 'USD',
    availability:
      input.availability === undefined
        ? existingMentor.availability
        : toNullableString(input.availability),
    headline:
      input.headline === undefined
        ? existingMentor.headline
        : toNullableString(input.headline),
    maxMentees:
      input.maxMentees === undefined
        ? existingMentor.maxMentees
        : toNullableNumber(input.maxMentees),
    profileImageUrl: nextProfileImageUrl,
    bannerImageUrl: nextBannerImageUrl,
    resumeUrl: nextResumeUrl,
    verificationStatus: resolveMentorVerificationTransition(
      existingMentor.verificationStatus,
      'profile_updated'
    ),
    verificationNotes: existingMentor.verificationNotes,
    isAvailable: resolveBooleanFlag(input.isAvailable, fallbackAvailability),
    searchMode: nextSearchMode,
  };
}
