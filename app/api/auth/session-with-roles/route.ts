import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import { db } from '@/lib/db';
import { mentors } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get the session from better-auth
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({
        success: true,
        data: {
          session: null,
          user: null,
          roles: [],
          mentorProfile: null,
        }
      });
    }

    // Get user with roles in a single optimized query
    const userWithRoles = await getUserWithRoles(session.user.id);

    if (!userWithRoles) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Get mentor profile if user is a mentor (optimized)
    let mentorProfile = null;
    const isMentor = userWithRoles.roles.some(role => role.name === 'mentor');
    
    if (isMentor) {
      const [mentor] = await db
        .select({
          id: mentors.id,
          verificationStatus: mentors.verificationStatus,
          fullName: mentors.fullName,
          email: mentors.email,
          phone: mentors.phone,
          title: mentors.title,
          company: mentors.company,
          city: mentors.city,
          country: mentors.country,
          industry: mentors.industry,
          expertise: mentors.expertise,
          experience: mentors.experience,
          about: mentors.about,
          linkedinUrl: mentors.linkedinUrl,
          githubUrl: mentors.githubUrl,
          websiteUrl: mentors.websiteUrl,
          hourlyRate: mentors.hourlyRate,
          currency: mentors.currency,
          availability: mentors.availability,
          headline: mentors.headline,
          maxMentees: mentors.maxMentees,
          profileImageUrl: mentors.profileImageUrl,
          resumeUrl: mentors.resumeUrl,
          paymentStatus: mentors.paymentStatus,
          couponCode: mentors.couponCode,
          isCouponCodeEnabled: mentors.isCouponCodeEnabled,
        })
        .from(mentors)
        .where(eq(mentors.userId, session.user.id))
        .limit(1);
      
      mentorProfile = mentor || null;
    }

    // Return optimized response with all data in single request
    return NextResponse.json({
      success: true,
      data: {
        session: {
          ...session,
          user: {
            ...session.user,
            ...userWithRoles
          }
        },
        user: userWithRoles,
        roles: userWithRoles.roles,
        mentorProfile,
        // Computed flags for easy access
        isAdmin: userWithRoles.roles.some(r => r.name === 'admin'),
        isMentor: userWithRoles.roles.some(r => r.name === 'mentor'),
        isMentee: userWithRoles.roles.some(r => r.name === 'mentee'),
        isMentorWithIncompleteProfile: isMentor && mentorProfile?.verificationStatus === 'IN_PROGRESS',
      }
    });

  } catch (error) {
    console.error('Error fetching session with roles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
