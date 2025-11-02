import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentors, mentorsProfileAudit, type Mentor } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { uploadProfilePicture, uploadResume, storage } from '@/lib/storage';

export async function POST(request: NextRequest) {
  console.log('🚀 === MENTOR PROFILE UPDATE API CALLED ===');
  
  try {
    // Try to get FormData first, fall back to JSON for backward compatibility
    let userId: string;
    let updateData: any = {};
    let profilePicture: File | null = null;
    let resume: File | null = null;
    
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData (with file uploads)
      const formData = await request.formData();
      console.log('📋 FormData received with entries:', Array.from(formData.entries()));
      
      userId = formData.get('userId') as string;
      profilePicture = formData.get('profilePicture') as File;
      resume = formData.get('resume') as File;
      
      // Extract all other form fields
      for (const [key, value] of formData.entries()) {
        if (key !== 'userId' && key !== 'profilePicture' && key !== 'resume') {
          updateData[key] = value;
        }
      }
    } else {
      // Handle JSON (backward compatibility)
      const data = await request.json();
      console.log('📋 JSON data received:', JSON.stringify(data, null, 2));
      ({ userId, ...updateData } = data);
    }

    if (!userId) {
      console.error('❌ VALIDATION FAILED: No user ID provided');
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if mentor profile exists
    console.log('🔍 Step 1: Checking if mentor profile exists...');
    const [existingMentor] = await db
      .select()
      .from(mentors)
      .where(eq(mentors.userId, userId))
      .limit(1);

    if (!existingMentor) {
      console.error('❌ MENTOR PROFILE NOT FOUND for user:', userId);
      return NextResponse.json(
        { success: false, error: 'Mentor profile not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ Existing mentor profile found:', existingMentor.id);

    const serializeMentorRecord = (record: Mentor) => ({
      ...record,
      createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
      updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : record.updatedAt,
    });

    const previousProfileSnapshot = serializeMentorRecord(existingMentor);

    // Handle file uploads
    let newProfileImageUrl = existingMentor.profileImageUrl;
    let newResumeUrl = existingMentor.resumeUrl;
    
    if (profilePicture && profilePicture.size > 0) {
      try {
        // Delete old profile picture if it exists
        if (existingMentor.profileImageUrl) {
          try {
            const oldPath = existingMentor.profileImageUrl.split('/').pop();
            if (oldPath) {
              await storage.delete(`profiles/${oldPath}`);
            }
          } catch (deleteError) {
            console.warn('⚠️ Could not delete old profile picture:', deleteError);
          }
        }
        
        const uploadResult = await uploadProfilePicture(profilePicture, userId);
        newProfileImageUrl = uploadResult.url;
        console.log('✅ New profile picture uploaded:', newProfileImageUrl);
      } catch (uploadError) {
        console.error('❌ Profile picture upload failed:', uploadError);
        return NextResponse.json(
          { success: false, error: 'Failed to upload profile picture' },
          { status: 400 }
        );
      }
    }
    
    if (resume && resume.size > 0) {
      try {
        console.log('📤 Processing resume upload in update-profile API...');
        console.log('📄 Resume file details:', { name: resume.name, size: resume.size, type: resume.type });
        
        // Delete old resume if it exists
        if (existingMentor.resumeUrl) {
          try {
            const oldPath = existingMentor.resumeUrl.split('/').slice(-2).join('/'); // mentors/resumes/filename
            console.log('🗑️ Deleting old resume:', oldPath);
            await storage.delete(oldPath);
          } catch (deleteError) {
            console.warn('⚠️ Could not delete old resume:', deleteError);
          }
        }
        
        const uploadResult = await uploadResume(resume, userId);
        newResumeUrl = uploadResult.url;
        console.log('✅ New resume uploaded successfully:', newResumeUrl);
      } catch (uploadError) {
        console.error('❌ Resume upload failed in update-profile:', uploadError);
        return NextResponse.json(
          { success: false, error: 'Failed to upload resume' },
          { status: 400 }
        );
      }
    } else {
      console.log('📄 No resume file provided for update');
    }

    // If profileImageUrl is provided in JSON and no new profilePicture file uploaded, use it
    if (!profilePicture && updateData.profileImageUrl) {
      newProfileImageUrl = updateData.profileImageUrl as string
    }

    // If resumeUrl is provided in JSON and no resume file uploaded, use it
    if (!resume && updateData.resumeUrl) {
      newResumeUrl = updateData.resumeUrl as string
    }

    // Prepare update data
    const toNullableNumber = (value: unknown) => {
      if (value === undefined || value === null || value === '') return null;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const toNullableString = (value: unknown) => {
      if (value === undefined || value === null) return null;
      const str = String(value).trim();
      return str.length === 0 ? null : str;
    };

    const parsedExperience = toNullableNumber(updateData.experience);
    const parsedHourlyRate = toNullableString(updateData.hourlyRate);
    const parsedMaxMentees = toNullableNumber(updateData.maxMentees);
    const parsedAvailability = toNullableString(updateData.availability);
    const parsedState = toNullableString(updateData.state);
    const parsedCountry = toNullableString(updateData.country);
    const parsedCity = toNullableString(updateData.city);
    const parsedVerificationNotes = toNullableString(updateData.verificationNotes);
    const parseBooleanFlag = (value: unknown, fallback: boolean) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lowered = value.toLowerCase();
        if (lowered === 'true') return true;
        if (lowered === 'false') return false;
      }
      return fallback;
    };
    const parsedIsAvailable = parseBooleanFlag(updateData.isAvailable, existingMentor.isAvailable !== false);

    const mentorUpdateData = {
      fullName: toNullableString(updateData.fullName),
      email: toNullableString(updateData.email),
      phone: toNullableString(updateData.phone),
      title: toNullableString(updateData.title),
      company: toNullableString(updateData.company),
      city: parsedCity,
      state: parsedState,
      country: parsedCountry,
      industry: toNullableString(updateData.industry),
      expertise: toNullableString(updateData.expertise),
      experience: parsedExperience,
      about: toNullableString(updateData.about),
      linkedinUrl: toNullableString(updateData.linkedinUrl),
      githubUrl: toNullableString(updateData.githubUrl),
      websiteUrl: toNullableString(updateData.websiteUrl),
      hourlyRate: parsedHourlyRate,
      currency: toNullableString(updateData.currency) || existingMentor.currency || 'USD',
      availability: parsedAvailability,
      headline: toNullableString(updateData.headline),
      maxMentees: parsedMaxMentees,
      profileImageUrl: newProfileImageUrl,
      resumeUrl: newResumeUrl,
      verificationStatus: 'UPDATED_PROFILE',
      verificationNotes: parsedVerificationNotes,
      isAvailable: parsedIsAvailable
    };
    
    console.log('📝 Step 2: Updating mentor profile with data:', JSON.stringify(mentorUpdateData, null, 2));
    
    try {
      const [updatedMentor] = await db
        .update(mentors)
        .set(mentorUpdateData)
        .where(eq(mentors.userId, userId))
        .returning();
        
      try {
        await db.insert(mentorsProfileAudit).values({
          mentorId: updatedMentor.id,
          userId,
          previousData: previousProfileSnapshot,
          updatedData: serializeMentorRecord(updatedMentor),
          changedAt: new Date(),
        });
      } catch (auditError) {
        console.error('Failed to record mentor profile audit:', auditError);
      }

      console.log('🎉 SUCCESS: Mentor profile updated in database:', updatedMentor);
      
      return NextResponse.json({
        success: true,
        message: 'Mentor profile updated successfully',
        data: updatedMentor
      });
      
    } catch (updateError) {
      console.error('❌ DATABASE UPDATE ERROR:', updateError);
      throw updateError;
    }

  } catch (error) {
    console.error('❌ === FATAL ERROR IN MENTOR PROFILE UPDATE ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { success: false, error: 'Failed to update mentor profile: ' + errorMessage },
      { status: 500 }
    );
  }
}