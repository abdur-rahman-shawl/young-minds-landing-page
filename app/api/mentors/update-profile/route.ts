import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentors, mentorsProfileAudit, type Mentor } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  uploadProfilePicture,
  uploadResume,
  uploadBannerImage,
  storage,
  extractStoragePath,
  normalizeStorageValue,
  resolveStorageUrl,
} from '@/lib/storage';
import { requireMentor } from '@/lib/api/guards';

export async function POST(request: NextRequest) {
  console.log('🚀 === MENTOR PROFILE UPDATE API CALLED ===');

  try {
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }
    const sessionUserId = guard.session.user.id;

    // Try to get FormData first, fall back to JSON for backward compatibility
    let userId: string;
    let updateData: any = {};
    let profilePicture: File | null = null;
    let bannerImage: File | null = null;
    let resume: File | null = null;

    const contentType = request.headers.get('content-type');

    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData (with file uploads)
      const formData = await request.formData();
      console.log('📋 FormData received with entries:', Array.from(formData.entries()));

      userId = formData.get('userId') as string;
      profilePicture = formData.get('profilePicture') as File;
      bannerImage = formData.get('bannerImage') as File;
      resume = formData.get('resume') as File;

      // Extract all other form fields
      for (const [key, value] of formData.entries()) {
        if (key !== 'userId' && key !== 'profilePicture' && key !== 'bannerImage' && key !== 'resume') {
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

    if (userId !== sessionUserId) {
      return NextResponse.json(
        { success: false, error: 'You can only update your own mentor profile' },
        { status: 403 }
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
            const oldPath = extractStoragePath(existingMentor.profileImageUrl);
            if (oldPath) await storage.delete(oldPath);
          } catch (deleteError) {
            console.warn('⚠️ Could not delete old profile picture:', deleteError);
          }
        }

        const uploadResult = await uploadProfilePicture(profilePicture, userId);
        newProfileImageUrl = uploadResult.path;
        console.log('✅ New profile picture uploaded:', newProfileImageUrl);
      } catch (uploadError) {
        console.error('❌ Profile picture upload failed:', uploadError);
        return NextResponse.json(
          { success: false, error: 'Failed to upload profile picture' },
          { status: 400 }
        );
      }
    }

    // Handle Banner Image Upload (similar to profile picture)
    let newBannerImageUrl = existingMentor.bannerImageUrl;

    if (bannerImage && bannerImage.size > 0) {
      try {
        // Delete old banner if it exists
        if (existingMentor.bannerImageUrl) {
          try {
            const oldPath = extractStoragePath(existingMentor.bannerImageUrl);
            if (oldPath) await storage.delete(oldPath);
          } catch (deleteError) {
            console.warn('⚠️ Could not delete old banner image:', deleteError);
          }
        }

        const uploadResult = await uploadBannerImage(bannerImage, userId);
        newBannerImageUrl = uploadResult.path;
        console.log('✅ New banner image uploaded:', newBannerImageUrl);
      } catch (uploadError) {
        console.error('❌ Banner image upload failed:', uploadError);
        return NextResponse.json(
          { success: false, error: 'Failed to upload banner image' },
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
            const oldPath = extractStoragePath(existingMentor.resumeUrl);
            if (oldPath) {
              console.log('🗑️ Deleting old resume:', oldPath);
              await storage.delete(oldPath);
            }
          } catch (deleteError) {
            console.warn('⚠️ Could not delete old resume:', deleteError);
          }
        }

        const uploadResult = await uploadResume(resume, userId);
        newResumeUrl = uploadResult.path;
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
      newProfileImageUrl = normalizeStorageValue(updateData.profileImageUrl as string)
    }

    // If bannerImageUrl is provided in JSON and no new bannerImage file uploaded, use it
    if (!bannerImage && updateData.bannerImageUrl) {
      newBannerImageUrl = normalizeStorageValue(updateData.bannerImageUrl as string)
    }

    // If resumeUrl is provided in JSON and no resume file uploaded, use it
    if (!resume && updateData.resumeUrl) {
      newResumeUrl = normalizeStorageValue(updateData.resumeUrl as string)
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
      bannerImageUrl: newBannerImageUrl,
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

      const responseMentor = {
        ...updatedMentor,
        profileImageUrl: await resolveStorageUrl(updatedMentor.profileImageUrl),
        bannerImageUrl: await resolveStorageUrl(updatedMentor.bannerImageUrl),
        resumeUrl: await resolveStorageUrl(updatedMentor.resumeUrl),
      };

      return NextResponse.json({
        success: true,
        message: 'Mentor profile updated successfully',
        data: responseMentor
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
