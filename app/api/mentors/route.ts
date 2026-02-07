import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentors, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin, requireMentee } from '@/lib/api/guards';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireMentee(request, true);
    if ('error' in guard) {
      return guard.error;
    }

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
        profileImageUrl: mentors.profileImageUrl,
        bannerImageUrl: mentors.bannerImageUrl,
        // Mentor profile fullName (set during mentor application)
        fullName: mentors.fullName,
        // User info (fallback)
        userName: users.name,
        email: users.email,
        userImage: users.image,
      })
      .from(mentors)
      .innerJoin(users, eq(mentors.userId, users.id))
      .where(eq(mentors.verificationStatus, 'VERIFIED'))
      .orderBy(mentors.createdAt);

    // Map the results to handle name and image fallback priority
    const mappedMentors = mentosList.map((mentor: typeof mentosList[number]) => ({
      ...mentor,
      // Use mentor's fullName if available, otherwise fallback to user's name
      name: mentor.fullName || mentor.userName,
      // Use mentor's profileImageUrl if available, otherwise fallback to user's image
      image: mentor.profileImageUrl || mentor.userImage
    }));

    return NextResponse.json({
      success: true,
      data: mappedMentors
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
    const guard = await requireAdmin(request);
    if ('error' in guard) {
      return guard.error;
    }

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
