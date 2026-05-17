import type { AdminCreateMentorUserInput } from './server/schemas';

interface BuildAdminCreatedMentorProfileValuesInput {
  userId: string;
  adminId: string;
  input: Omit<AdminCreateMentorUserInput, 'initialPassword'>;
  now?: Date;
}

export function splitAdminCreatedMentorName(fullName: string) {
  const [firstName, ...remainingNameParts] = fullName.trim().split(/\s+/);

  return {
    firstName,
    lastName: remainingNameParts.length
      ? remainingNameParts.join(' ')
      : null,
  };
}

export function buildAdminCreatedMentorProfileValues({
  userId,
  adminId,
  input,
  now = new Date(),
}: BuildAdminCreatedMentorProfileValuesInput) {
  return {
    userId,
    title: input.title ?? null,
    company: input.company ?? null,
    industry: input.industry ?? null,
    expertise: input.expertise?.length
      ? JSON.stringify(input.expertise)
      : null,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone ?? null,
    verificationStatus: 'VERIFIED' as const,
    isVerified: true,
    creationSource: 'ADMIN_CREATED' as const,
    createdByAdminId: adminId,
    updatedAt: now,
  };
}
