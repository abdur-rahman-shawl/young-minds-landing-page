import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, mentees, mentors, userRoles, roles } from '@/lib/db/schema';
import { menteesProfileAudit } from '@/lib/db/schema/mentee-profile-audit';
import { eq } from 'drizzle-orm';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import { resolveStorageUrl } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user with roles
    const userWithRoles = await getUserWithRoles(userId);

    if (!userWithRoles) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get mentee profile if exists
    let menteeProfile = null;
    if (userWithRoles.roles.some(role => role.name === 'mentee')) {
      const [mentee] = await db
        .select()
        .from(mentees)
        .where(eq(mentees.userId, userId))
        .limit(1);
      
      menteeProfile = mentee || null;
    }

    // Get mentor profile if exists
    let mentorProfile = null;
    if (userWithRoles.roles.some(role => role.name === 'mentor')) {
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
          resumeUrl: mentors.resumeUrl
        })
        .from(mentors)
        .where(eq(mentors.userId, userId))
        .limit(1);
      
      mentorProfile = mentor
        ? {
            ...mentor,
            profileImageUrl: await resolveStorageUrl(mentor.profileImageUrl),
            resumeUrl: await resolveStorageUrl(mentor.resumeUrl),
          }
        : null;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: userWithRoles.id,
        email: userWithRoles.email,
        name: userWithRoles.name,
        image: userWithRoles.image,
        isActive: userWithRoles.isActive,
        roles: userWithRoles.roles,
        menteeProfile,
        mentorProfile
      }
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user?.id;
    const body = await request.json();
    const { action, profileData } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (action === 'create-mentee-profile') {
      // Check if mentee profile already exists
      const [existingMentee] = await db
        .select()
        .from(mentees)
        .where(eq(mentees.userId, userId))
        .limit(1);

      let result;

      if (existingMentee) {
        // Update existing mentee profile
        const [updatedMentee] = await db
          .update(mentees)
          .set({
            currentRole: profileData.currentRole || null,
            currentCompany: profileData.currentCompany || null,
            education: profileData.education || null,
            careerGoals: profileData.careerGoals || null,
            interests: profileData.interests || null,
            skillsToLearn: profileData.skillsToLearn || null,
            currentSkills: profileData.currentSkills || null,
            learningStyle: profileData.learningStyle || null,
            preferredMeetingFrequency: profileData.preferredMeetingFrequency || null,
            updatedAt: new Date()
          })
          .where(eq(mentees.userId, userId))
          .returning();
        
        result = updatedMentee;

        // Add to audit trail
        await db.insert(menteesProfileAudit).values({
          menteeId: existingMentee.id,
          userId: userId,
          oldProfileData: existingMentee,
          newProfileData: updatedMentee,
          sourceOfChange: 'mentee-profile-update',
        });

      } else {
        // Create new mentee profile
        const [newMentee] = await db
          .insert(mentees)
          .values({
            userId,
            currentRole: profileData.currentRole || null,
            currentCompany: profileData.currentCompany || null,
            education: profileData.education || null,
            careerGoals: profileData.careerGoals || null,
            interests: profileData.interests || null,
            skillsToLearn: profileData.skillsToLearn || null,
            currentSkills: profileData.currentSkills || null,
            learningStyle: profileData.learningStyle || null,
            preferredMeetingFrequency: profileData.preferredMeetingFrequency || null,
          })
          .returning();

        result = newMentee;

        // Add to audit trail
        await db.insert(menteesProfileAudit).values({
          menteeId: newMentee.id,
          userId: userId,
          newProfileData: newMentee,
          sourceOfChange: 'mentee-profile-create',
        });

        // Create mentee role if not exists (only for new profiles)
        try {
          const [menteeRole] = await db
            .select()
            .from(roles)
            .where(eq(roles.name, 'mentee'))
            .limit(1);

          if (menteeRole) {
            await db
              .insert(userRoles)
              .values({
                userId,
                roleId: menteeRole.id,
                assignedBy: userId
              })
              .onConflictDoNothing();
          }
        } catch (error) {
          console.log('Role assignment note:', error);
        }
      }

      return NextResponse.json({
        success: true,
        data: result
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
} 
