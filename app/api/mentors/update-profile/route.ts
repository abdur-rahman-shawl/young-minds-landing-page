import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentors } from '@/lib/db/schema';
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
    const mentorUpdateData = {
      fullName: updateData.fullName || null,
      email: updateData.email || null,
      phone: updateData.phone || null,
      title: updateData.title || null,
      company: updateData.company || null,
      city: updateData.city || null,
      country: updateData.country || null,
      industry: updateData.industry || null,
      expertise: updateData.expertise || null,
      experience: updateData.experience || null,
      about: updateData.about || null,
      linkedinUrl: updateData.linkedinUrl || null,
      githubUrl: updateData.githubUrl || null,
      websiteUrl: updateData.websiteUrl || null,
      hourlyRate: updateData.hourlyRate?.toString() || null,
      currency: updateData.currency || 'USD',
      availability: updateData.availability || null,
      headline: updateData.headline || null,
      maxMentees: updateData.maxMentees || null,
      profileImageUrl: newProfileImageUrl,
      resumeUrl: newResumeUrl
    };
    
    console.log('📝 Step 2: Updating mentor profile with data:', JSON.stringify(mentorUpdateData, null, 2));
    
    try {
      const [updatedMentor] = await db
        .update(mentors)
        .set(mentorUpdateData)
        .where(eq(mentors.userId, userId))
        .returning();
        
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