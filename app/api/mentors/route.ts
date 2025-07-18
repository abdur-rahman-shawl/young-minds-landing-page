import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentors, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Fetch all verified and available mentors with their user info
    const mentosList = await db
      .select({
        id: mentors.id,
        userId: mentors.userId,
        title: mentors.title,
        company: mentors.company,
        industry: mentors.industry,
        expertise: mentors.expertise,
        experience: mentors.experience,
        hourlyRate: mentors.hourlyRate,
        currency: mentors.currency,
        headline: mentors.headline,
        about: mentors.about,
        linkedinUrl: mentors.linkedinUrl,
        verificationStatus: mentors.verificationStatus,
        isAvailable: mentors.isAvailable,
        // User info
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(mentors)
      .innerJoin(users, eq(mentors.userId, users.id))
      .where(eq(mentors.verificationStatus, 'VERIFIED'))
      .orderBy(mentors.createdAt);

    return NextResponse.json({ 
      success: true, 
      data: mentosList 
    });

  } catch (error) {
    console.error('Error fetching mentors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch mentors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      title, 
      company, 
      industry, 
      expertise, 
      experience, 
      hourlyRate,
      headline,
      about,
      linkedinUrl 
    } = body;

    // Create new mentor profile with generated ID
    const [newMentor] = await db
      .insert(mentors)
      .values({
        id: crypto.randomUUID(),
        userId,
        title,
        company,
        industry,
        expertise,
        experience: parseInt(experience),
        hourlyRate: hourlyRate ? parseFloat(hourlyRate).toString() : null,
        currency: 'USD',
        headline,
        about,
        linkedinUrl,
        verificationStatus: 'IN_PROGRESS' as const, // Needs admin approval
        isAvailable: false, // Not available until verified
      })
      .returning();

    return NextResponse.json({ 
      success: true, 
      data: newMentor 
    });

  } catch (error) {
    console.error('Error creating mentor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create mentor profile' },
      { status: 500 }
    );
  }
} 