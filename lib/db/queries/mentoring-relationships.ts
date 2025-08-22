import { db } from '@/lib/db';
import { mentoringRelationships, users } from '@/lib/db/schema';
import { eq, and, or, desc, asc } from 'drizzle-orm';

export interface MenteeWithRelationship {
  id: string;
  menteeId: string;
  mentorId: string;
  status: string;
  goals: string | null;
  duration: string | null;
  frequency: string | null;
  rate: string | null;
  currency: string | null;
  billingType: string | null;
  progress: string | null;
  milestones: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  pausedAt: Date | null;
  approvedByMentor: boolean | null;
  approvedByMentee: boolean | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  mentee: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    bio: string | null;
    timezone: string | null;
  };
}

export async function getMentorMentees(
  mentorId: string,
  status?: string | string[]
): Promise<MenteeWithRelationship[]> {
  try {
    const statusFilter = status
      ? Array.isArray(status)
        ? or(...status.map(s => eq(mentoringRelationships.status, s)))
        : eq(mentoringRelationships.status, status)
      : undefined;

    const conditions = statusFilter
      ? and(eq(mentoringRelationships.mentorId, mentorId), statusFilter)
      : eq(mentoringRelationships.mentorId, mentorId);

    const results = await db
      .select({
        relationship: mentoringRelationships,
        mentee: {
          id: users.id,
          email: users.email,
          name: users.name,
          image: users.image,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
          bio: users.bio,
          timezone: users.timezone,
        },
      })
      .from(mentoringRelationships)
      .leftJoin(users, eq(mentoringRelationships.menteeId, users.id))
      .where(conditions)
      .orderBy(desc(mentoringRelationships.createdAt));

    return results.map((row) => ({
      id: row.relationship.id,
      menteeId: row.relationship.menteeId,
      mentorId: row.relationship.mentorId,
      status: row.relationship.status,
      goals: row.relationship.goals,
      duration: row.relationship.duration,
      frequency: row.relationship.frequency,
      rate: row.relationship.rate,
      currency: row.relationship.currency,
      billingType: row.relationship.billingType,
      progress: row.relationship.progress,
      milestones: row.relationship.milestones,
      startedAt: row.relationship.startedAt,
      endedAt: row.relationship.endedAt,
      pausedAt: row.relationship.pausedAt,
      approvedByMentor: row.relationship.approvedByMentor,
      approvedByMentee: row.relationship.approvedByMentee,
      approvedAt: row.relationship.approvedAt,
      createdAt: row.relationship.createdAt,
      updatedAt: row.relationship.updatedAt,
      mentee: row.mentee || {
        id: row.relationship.menteeId,
        email: 'Unknown',
        name: null,
        image: null,
        firstName: null,
        lastName: null,
        phone: null,
        bio: null,
        timezone: null,
      },
    }));
  } catch (error) {
    console.error('Error fetching mentor mentees:', error);
    throw new Error('Failed to fetch mentees');
  }
}

export async function updateMentoringRelationshipStatus(
  relationshipId: string,
  mentorId: string,
  updates: {
    status?: string;
    approvedByMentor?: boolean;
    approvedAt?: Date;
    startedAt?: Date;
    pausedAt?: Date;
    endedAt?: Date;
  }
): Promise<boolean> {
  try {
    const result = await db
      .update(mentoringRelationships)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(mentoringRelationships.id, relationshipId),
          eq(mentoringRelationships.mentorId, mentorId)
        )
      );

    return true;
  } catch (error) {
    console.error('Error updating mentoring relationship:', error);
    return false;
  }
}

export async function getMentoringRelationshipById(
  relationshipId: string,
  mentorId: string
): Promise<MenteeWithRelationship | null> {
  try {
    const results = await db
      .select({
        relationship: mentoringRelationships,
        mentee: {
          id: users.id,
          email: users.email,
          name: users.name,
          image: users.image,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
          bio: users.bio,
          timezone: users.timezone,
        },
      })
      .from(mentoringRelationships)
      .leftJoin(users, eq(mentoringRelationships.menteeId, users.id))
      .where(
        and(
          eq(mentoringRelationships.id, relationshipId),
          eq(mentoringRelationships.mentorId, mentorId)
        )
      )
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const row = results[0];
    return {
      id: row.relationship.id,
      menteeId: row.relationship.menteeId,
      mentorId: row.relationship.mentorId,
      status: row.relationship.status,
      goals: row.relationship.goals,
      duration: row.relationship.duration,
      frequency: row.relationship.frequency,
      rate: row.relationship.rate,
      currency: row.relationship.currency,
      billingType: row.relationship.billingType,
      progress: row.relationship.progress,
      milestones: row.relationship.milestones,
      startedAt: row.relationship.startedAt,
      endedAt: row.relationship.endedAt,
      pausedAt: row.relationship.pausedAt,
      approvedByMentor: row.relationship.approvedByMentor,
      approvedByMentee: row.relationship.approvedByMentee,
      approvedAt: row.relationship.approvedAt,
      createdAt: row.relationship.createdAt,
      updatedAt: row.relationship.updatedAt,
      mentee: row.mentee || {
        id: row.relationship.menteeId,
        email: 'Unknown',
        name: null,
        image: null,
        firstName: null,
        lastName: null,
        phone: null,
        bio: null,
        timezone: null,
      },
    };
  } catch (error) {
    console.error('Error fetching mentoring relationship:', error);
    return null;
  }
}

export async function getMentorStats(mentorId: string) {
  try {
    const relationships = await db
      .select({
        status: mentoringRelationships.status,
      })
      .from(mentoringRelationships)
      .where(eq(mentoringRelationships.mentorId, mentorId));

    const stats = {
      total: relationships.length,
      active: relationships.filter(r => r.status === 'active').length,
      pending: relationships.filter(r => r.status === 'pending').length,
      paused: relationships.filter(r => r.status === 'paused').length,
      completed: relationships.filter(r => r.status === 'completed').length,
      cancelled: relationships.filter(r => r.status === 'cancelled').length,
    };

    return stats;
  } catch (error) {
    console.error('Error fetching mentor stats:', error);
    return {
      total: 0,
      active: 0,
      pending: 0,
      paused: 0,
      completed: 0,
      cancelled: 0,
    };
  }
}