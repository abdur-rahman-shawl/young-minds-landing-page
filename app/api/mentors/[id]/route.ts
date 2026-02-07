import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentors, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireMentee } from '@/lib/api/guards';
import { resolveStorageUrl } from '@/lib/storage';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await requireMentee(request, true);
    if ('error' in guard) {
      return guard.error;
    }
    const isAdmin = guard.user.roles.some((role) => role.name === 'admin');

    const { id } = await params;
    console.log('🚀 Fetching mentor details for ID:', id);

    if (!id) {
      console.error('❌ No mentor ID provided');
      return NextResponse.json(
        { success: false, error: 'Mentor ID is required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.error('❌ Invalid UUID format:', id);
      return NextResponse.json(
        { success: false, error: 'Invalid mentor ID format' },
        { status: 400 }
      );
    }

    // Fetch mentor with user details
    console.log('🚀 Querying database for mentor:', id);
    const mentorDetails = await db
      .select({
        // Mentor info
        id: mentors.id,
        userId: mentors.userId,
        title: mentors.title,
        company: mentors.company,
        industry: mentors.industry,
        expertise: mentors.expertise,
        experience: mentors.experience,
        hourlyRate: mentors.hourlyRate,
        currency: mentors.currency,
        availability: mentors.availability,
        maxMentees: mentors.maxMentees,
        headline: mentors.headline,
        about: mentors.about,
        linkedinUrl: mentors.linkedinUrl,
        githubUrl: mentors.githubUrl,
        websiteUrl: mentors.websiteUrl,
        fullName: mentors.fullName,
        email: mentors.email,
        phone: mentors.phone,
        city: mentors.city,
        country: mentors.country,
        profileImageUrl: mentors.profileImageUrl,
        bannerImageUrl: mentors.bannerImageUrl,
        resumeUrl: mentors.resumeUrl,
        verificationStatus: mentors.verificationStatus,
        isAvailable: mentors.isAvailable,
        createdAt: mentors.createdAt,
        updatedAt: mentors.updatedAt,
        // User info
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(mentors)
      .innerJoin(users, eq(mentors.userId, users.id))
      .where(
        and(
          eq(mentors.id, id),
          eq(mentors.verificationStatus, 'VERIFIED'),
          eq(mentors.isAvailable, true)
        )
      )
      .limit(1);

    console.log('🚀 Database query completed, found records:', mentorDetails.length);

    if (mentorDetails.length === 0) {
      console.log('❌ No mentor found with ID:', id);
      return NextResponse.json(
        { success: false, error: 'Mentor not found or not available' },
        { status: 404 }
      );
    }

    const mentor = mentorDetails[0];
    const signedProfileImageUrl = await resolveStorageUrl(mentor.profileImageUrl);
    const signedBannerImageUrl = await resolveStorageUrl(mentor.bannerImageUrl);
    const signedResumeUrl = await resolveStorageUrl(mentor.resumeUrl);
    console.log('🚀 Mentor found:', mentor.userName || mentor.fullName, 'Company:', mentor.company);

    // Format the response
    const formattedMentor = {
      ...mentor,
      profileImageUrl: signedProfileImageUrl,
      bannerImageUrl: signedBannerImageUrl,
      resumeUrl: signedResumeUrl,
      // Use fullName if available, otherwise fallback to userName
      name: mentor.fullName || mentor.userName,
      // Use mentor's email if available, otherwise fallback to user email
      email: mentor.email || mentor.userEmail,
      // Use profileImageUrl if available, otherwise fallback to userImage
      image: signedProfileImageUrl || mentor.userImage,
      // Parse expertise if it's a string
      expertiseArray: mentor.expertise ? mentor.expertise.split(',').map((s: string) => s.trim()) : [],
      // Parse availability if it's JSON, otherwise keep as string
      availabilityParsed: mentor.availability ?
        (typeof mentor.availability === 'string' ?
          (() => {
            try {
              return JSON.parse(mentor.availability);
            } catch (e) {
              // If it's not valid JSON, return the string as-is
              console.log('Availability is not JSON, treating as string:', mentor.availability);
              return mentor.availability;
            }
          })() :
          mentor.availability
        ) : null,
    };

    const responseMentor = isAdmin
      ? formattedMentor
      : {
          ...formattedMentor,
          email: null,
          phone: null,
          resumeUrl: null,
          userEmail: null,
        };

    return NextResponse.json({
      success: true,
      data: responseMentor
    });

  } catch (error) {
    console.error('❌ Error fetching mentor details:', error);

    // More specific error handling
    if (error instanceof Error) {
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);

      // Handle specific database errors
      if (error.message.includes('invalid input syntax for type uuid')) {
        return NextResponse.json(
          { success: false, error: 'Invalid mentor ID format' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch mentor details' },
      { status: 500 }
    );
  }
}
