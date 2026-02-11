import { db } from '@/lib/db';
import { mentorContent, mentors } from '@/lib/db/schema';
import { eq, isNull, or } from 'drizzle-orm';

export async function getMentorForContent(userId: string) {
  const existing = await db
    .select()
    .from(mentors)
    .where(eq(mentors.userId, userId))
    .limit(1);

  return existing[0] || null;
}

export function getMentorContentOwnershipCondition(mentorId: string | null, isAdmin: boolean) {
  if (isAdmin) {
    if (mentorId) {
      return or(eq(mentorContent.mentorId, mentorId), isNull(mentorContent.mentorId));
    }
    return isNull(mentorContent.mentorId);
  }

  if (!mentorId) {
    return null;
  }

  return eq(mentorContent.mentorId, mentorId);
}
