import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentees, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const list = await db
      .select({
        id: mentees.id,
        userId: mentees.userId,
        currentRole: mentees.currentRole,
        education: mentees.education,
        careerGoals: mentees.careerGoals,
        currentSkills: mentees.currentSkills,
        skillsToLearn: mentees.skillsToLearn,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(mentees)
      .innerJoin(users, eq(mentees.userId, users.id));

    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error('Admin mentees GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
} 