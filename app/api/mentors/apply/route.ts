import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, mentors, userRoles, roles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { uploadProfilePicture, uploadResume } from '@/lib/storage';

export async function POST(request: NextRequest) {
  console.log('🚀 === MENTOR APPLICATION API CALLED ===');
  
  try {
    const formData = await request.formData();
    console.log('📋 FormData received with entries:', Array.from(formData.entries()));
    
    const userId = formData.get('userId') as string;
    const title = formData.get('title') as string;
    const company = formData.get('company') as string;
    const industry = formData.get('industry') as string;
    const expertise = formData.get('expertise') as string;
    const experience = formData.get('experience') as string;
    const hourlyRate = formData.get('hourlyRate') as string;
    const currency = formData.get('currency') as string;
    const headline = formData.get('headline') as string;
    const about = formData.get('about') as string;
    const linkedinUrl = formData.get('linkedinUrl') as string;
    const githubUrl = formData.get('githubUrl') as string;
    const websiteUrl = formData.get('websiteUrl') as string;
    const isAvailable = formData.get('isAvailable') as string;
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const city = formData.get('city') as string;
    const country = formData.get('country') as string;
    const state = formData.get('state') as string;
    const availability = formData.get('availability') as string;
    const profilePicture = formData.get('profilePicture') as File;
    const resume = formData.get('resume') as File;

    console.log('👤 Extracted userId:', userId);

    if (!userId) {
      console.error('❌ VALIDATION FAILED: No user ID provided');
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!resume || resume.size === 0) {
      console.error('❌ VALIDATION FAILED: No resume file provided');
      return NextResponse.json(
        { success: false, error: 'Resume file is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    console.log('🔍 Step 1: Checking if user exists in database...');
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      console.error('❌ USER NOT FOUND in users table for ID:', userId);
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ User found:', { id: user.id, name: user.name, email: user.email });

    // Upload profile picture and resume
    console.log('🖼️  Step 2: Uploading profile picture and resume...');
    let profileImageUrl = null;
    let resumeUrl = null;
    
    if (profilePicture && profilePicture.size > 0) {
      try {
        const uploadResult = await uploadProfilePicture(profilePicture, userId);
        profileImageUrl = uploadResult.url;
        console.log('✅ Profile picture uploaded:', profileImageUrl);
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
        const uploadResult = await uploadResume(resume, userId);
        resumeUrl = uploadResult.url;
        console.log('✅ Resume uploaded successfully');
      } catch (uploadError) {
        console.error('❌ Resume upload failed:', uploadError);
        return NextResponse.json(
          { success: false, error: `Failed to upload resume: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}` },
          { status: 400 }
        );
      }
    }

    // Check if mentor profile already exists
    console.log('🔍 Step 3: Checking if mentor profile already exists...');
    const [existingMentor] = await db
      .select()
      .from(mentors)
      .where(eq(mentors.userId, userId))
      .limit(1);

    if (existingMentor) {
      console.error('❌ MENTOR ALREADY EXISTS for user:', userId);
      return NextResponse.json(
        { success: false, error: 'Mentor profile already exists' },
        { status: 400 }
      );
    }
    
    console.log('✅ No existing mentor profile found, proceeding...');

    // Create mentor profile data
    const mentorId = randomUUID();
    console.log('🆔 Generated mentor ID:', mentorId);
    
    const mentorProfileData = {
      id: mentorId,
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
      verificationStatus: 'IN_PROGRESS' as const,
      isAvailable: isAvailable !== 'false',
      fullName: fullName || null,
      email: email || null,
      phone: phone || null,
      city: city || null,
      country: country || null,
      state: state || null,
      availability: availability || null,
      profileImageUrl: profileImageUrl,
      resumeUrl: resumeUrl
    };
    
    console.log('📝 Step 4: Creating mentor profile with data:', JSON.stringify(mentorProfileData, null, 2));
    
    try {
      const [newMentor] = await db
        .insert(mentors)
        .values(mentorProfileData)
        .returning();
        
      console.log('🎉 SUCCESS: Mentor profile created in database:', newMentor);
    } catch (insertError) {
      console.error('❌ DATABASE INSERT ERROR:', insertError);
      throw insertError;
    }

    // Assign mentor role to user
    console.log('👤 Step 5: Assigning mentor role to user...');
    try {
      const [mentorRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, 'mentor'))
        .limit(1);

      if (mentorRole) {
        console.log('📋 Found mentor role in database:', mentorRole);
        
        const roleAssignment = {
          userId,
          roleId: mentorRole.id,
          assignedBy: userId
        };
        
        console.log('👤 Assigning role with data:', roleAssignment);
        
        await db
          .insert(userRoles)
          .values(roleAssignment)
          .onConflictDoNothing();
          
        console.log('✅ Mentor role successfully assigned');
      } else {
        console.error('❌ Mentor role NOT FOUND in roles table');
      }
    } catch (roleError) {
      console.error('❌ Error during role assignment:', roleError);
    }

    console.log('🎉 === MENTOR APPLICATION COMPLETED SUCCESSFULLY ===');
    
    return NextResponse.json({
      success: true,
      message: 'Mentor application submitted successfully',
      data: { id: mentorId, userId, status: 'IN_PROGRESS' }
    });

  } catch (error) {
    console.error('❌ === FATAL ERROR IN MENTOR APPLICATION ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { success: false, error: 'Failed to process mentor application: ' + errorMessage },
      { status: 500 }
    );
  }
} 