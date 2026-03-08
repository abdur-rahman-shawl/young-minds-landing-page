import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, mentors, userRoles, roles, mentorsFormAuditTrail } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { uploadProfilePicture, uploadResume, normalizeStorageValue } from '@/lib/storage';
import { sendApplicationReceivedEmail } from '@/lib/email';

const MAX_RESUME_SIZE = 5 * 1024 * 1024; // 5MB

async function getAdminUserId() {
  const [adminUser] = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(userRoles, eq(users.id, userRoles.userId))
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(roles.name, 'admin'))
    .limit(1);
  return adminUser?.id;
}

async function sendNotification(userId: string, type: string, title: string, message: string, actionUrl?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  await fetch(`${baseUrl}/api/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, type, title, message, actionUrl }),
  });
}

export async function POST(request: NextRequest) {
  console.log('ðŸš€ === MENTOR APPLICATION API CALLED ===');
  
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const sessionUserId = session?.user?.id;

    if (!sessionUserId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const submittedFormData = await request.formData();
    console.log('ðŸ“‹ FormData received with entries:', Array.from(submittedFormData.entries()));
    const rawFormSnapshot: Record<string, unknown> = {};
    for (const [key, value] of submittedFormData.entries()) {
      rawFormSnapshot[key] = value instanceof File
        ? (value.size > 0 ? { name: value.name, size: value.size, type: value.type } : null)
        : value;
    }
    
    const userId = submittedFormData.get('userId') as string;
    const title = submittedFormData.get('title') as string;
    const company = submittedFormData.get('company') as string;
    const industry = submittedFormData.get('industry') as string;
    const expertise = submittedFormData.get('expertise') as string;
    const experience = submittedFormData.get('experience') as string;
    const hourlyRate = submittedFormData.get('hourlyRate') as string;
    const currency = submittedFormData.get('currency') as string;
    const headline = submittedFormData.get('headline') as string;
    const about = submittedFormData.get('about') as string;
    const linkedinUrl = submittedFormData.get('linkedinUrl') as string;
    const githubUrl = submittedFormData.get('githubUrl') as string;
    const websiteUrl = submittedFormData.get('websiteUrl') as string;
    const isAvailable = submittedFormData.get('isAvailable') as string;
    const fullName = submittedFormData.get('fullName') as string;
    const email = submittedFormData.get('email') as string;
    const phone = submittedFormData.get('phone') as string;
    const city = submittedFormData.get('city') as string;
    const country = submittedFormData.get('country') as string;
    const state = submittedFormData.get('state') as string;
    const availability = submittedFormData.get('availability') as string;
    const profilePicture = submittedFormData.get('profilePicture') as File | null;
    const resume = submittedFormData.get('resume') as File | null;

    console.log('ðŸ‘¤ Extracted userId:', userId);

    if (!userId) {
      console.error('âŒ VALIDATION FAILED: No user ID provided');
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (userId !== sessionUserId) {
      return NextResponse.json(
        { success: false, error: 'You can only submit your own application' },
        { status: 403 }
      );
    }

    if (resume && resume.size > MAX_RESUME_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Resume file size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Check if user exists
    console.log('ðŸ” Step 1: Checking if user exists in database...');
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      console.error('âŒ USER NOT FOUND in users table for ID:', userId);
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log('âœ… User found:', { id: user.id, name: user.name, email: user.email });

    // Upload profile picture and resume
    console.log('ðŸ–¼ï¸  Step 2: Uploading profile picture and resume...');
    let profileImageUrl = null;
    let resumeUrl = null;
    
    if (profilePicture instanceof File && profilePicture.size > 0) {
      try {
        const uploadResult = await uploadProfilePicture(profilePicture, userId);
        profileImageUrl = uploadResult.path;
        console.log('âœ… Profile picture uploaded:', profileImageUrl);
      } catch (uploadError) {
        console.error('âŒ Profile picture upload failed:', uploadError);
        return NextResponse.json(
          { success: false, error: 'Failed to upload profile picture' },
          { status: 400 }
        );
      }
    }
    
    if (resume instanceof File && resume.size > 0) {
      try {
        const uploadResult = await uploadResume(resume, userId);
        resumeUrl = uploadResult.path;
        console.log('âœ… Resume uploaded successfully');
      } catch (uploadError) {
        console.error('âŒ Resume upload failed:', uploadError);
        return NextResponse.json(
          { success: false, error: `Failed to upload resume: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}` },
          { status: 400 }
        );
      }
    }

    // Check if mentor profile already exists
    console.log('ðŸ” Step 3: Checking if mentor profile already exists...');
    const [existingMentor] = await db
      .select()
      .from(mentors)
      .where(eq(mentors.userId, userId))
      .limit(1);

    const mentorProfileData = {
      userId,
      title: title || null,
      company: company || null,
      industry: industry || null,
      expertise: expertise || null,
      experience: experience ? parseInt(experience) : null,
      hourlyRate: hourlyRate || '50.00',
      currency: currency || 'USD',
      headline: headline || null,
      about: about || null,
      linkedinUrl: linkedinUrl || null,
      githubUrl: githubUrl || null,
      websiteUrl: websiteUrl || null,
      verificationStatus: existingMentor ? 'RESUBMITTED' : 'IN_PROGRESS' as const,
      isAvailable: isAvailable !== 'false',
      fullName: fullName || null,
      email: email || null,
      phone: phone || null,
      city: city || null,
      country: country || null,
      state: state || null,
      availability: availability || null,
      profileImageUrl: normalizeStorageValue(profileImageUrl) ?? existingMentor?.profileImageUrl ?? null,
      resumeUrl: normalizeStorageValue(resumeUrl) ?? existingMentor?.resumeUrl ?? null,
      updatedAt: new Date(),
    };

    const sanitizedAuditProfile = {
      ...mentorProfileData,
      updatedAt: mentorProfileData.updatedAt.toISOString(),
    };

    const recordAuditEntry = async (mentorRecordId: string, submissionType: 'CREATE' | 'UPDATE') => {
      try {
        await db.insert(mentorsFormAuditTrail).values({
          mentorId: mentorRecordId,
          userId,
          submissionType,
          verificationStatus: mentorProfileData.verificationStatus,
          formData: {
            sanitized: sanitizedAuditProfile,
            raw: rawFormSnapshot,
          },
        });
      } catch (auditError) {
        console.error('Failed to record mentor form audit trail:', auditError);
      }
    };

    if (existingMentor) {
      console.log('âœ… Existing mentor profile found, updating...');
      const [updatedMentor] = await db
        .update(mentors)
        .set(mentorProfileData)
        .where(eq(mentors.id, existingMentor.id))
        .returning({ id: mentors.id });

      await recordAuditEntry(existingMentor.id, 'UPDATE');

      const adminId = await getAdminUserId();
      if (adminId) {
        await sendNotification(
          adminId,
          'MENTOR_APPLICATION_UPDATE_REQUESTED',
          'Mentor Application Updated',
          `${fullName} has updated their mentor application.`,
          `/admin/dashboard?section=mentors&mentorId=${existingMentor.id}`
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Mentor application updated successfully',
        data: { id: updatedMentor.id, userId, status: 'RESUBMITTED' }
      });
    } else {
      console.log('âœ… No existing mentor profile found, creating new one...');
      const mentorId = randomUUID();
      const [newMentor] = await db
        .insert(mentors)
        .values({ ...mentorProfileData, id: mentorId, verificationStatus: 'IN_PROGRESS' })
        .returning();

      await recordAuditEntry(newMentor.id, 'CREATE');

      // Assign mentor role to user
      console.log('ðŸ‘¤ Step 5: Assigning mentor role to user...');
      try {
        const [mentorRole] = await db
          .select()
          .from(roles)
          .where(eq(roles.name, 'mentor'))
          .limit(1);

        if (mentorRole) {
          console.log('ðŸ“‹ Found mentor role in database:', mentorRole);
          
          const roleAssignment = {
            userId,
            roleId: mentorRole.id,
            assignedBy: userId
          };
          
          console.log('ðŸ‘¤ Assigning role with data:', roleAssignment);
          
          await db
            .insert(userRoles)
            .values(roleAssignment)
            .onConflictDoNothing();
            
          console.log('âœ… Mentor role successfully assigned');
        } else {
          console.error('âŒ Mentor role NOT FOUND in roles table');
        }
      } catch (roleError) {
        console.error('âŒ Error during role assignment:', roleError);
      }

      await sendApplicationReceivedEmail(email, fullName);

      console.log('ðŸŽ‰ === MENTOR APPLICATION COMPLETED SUCCESSFULLY ===');
      
      return NextResponse.json({
        success: true,
        message: 'Mentor application submitted successfully',
        data: { id: newMentor.id, userId, status: 'IN_PROGRESS' }
      });
    }

  } catch (error) {
    console.error('âŒ === FATAL ERROR IN MENTOR APPLICATION ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { success: false, error: 'Failed to process mentor application: ' + errorMessage },
      { status: 500 }
    );
  }
}


