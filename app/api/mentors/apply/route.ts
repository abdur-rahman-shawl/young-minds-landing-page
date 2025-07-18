import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, mentors, userRoles, roles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  console.log('🚀 === MENTOR APPLICATION API CALLED ===');
  
  try {
    const body = await request.json();
    console.log('📋 Request body received:', JSON.stringify(body, null, 2));
    
    const { 
      userId, 
      title, 
      company, 
      industry, 
      expertise, 
      experience, 
      hourlyRate, 
      currency, 
      headline, 
      about, 
      linkedinUrl, 
      githubUrl, 
      websiteUrl, 
      isAvailable 
    } = body;

    console.log('👤 Extracted userId:', userId);

    if (!userId) {
      console.error('❌ VALIDATION FAILED: No user ID provided');
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
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

    // Check if mentor profile already exists
    console.log('🔍 Step 2: Checking if mentor profile already exists...');
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
      experience: experience || null,
      hourlyRate: hourlyRate || '50.00',
      currency: currency || 'USD',
      headline: headline || null,
      about: about || null,
      linkedinUrl: linkedinUrl || null,
      githubUrl: githubUrl || null,
      websiteUrl: websiteUrl || null,
      verificationStatus: 'IN_PROGRESS' as const,
      isAvailable: isAvailable !== false
    };
    
    console.log('📝 Step 3: Creating mentor profile with data:', JSON.stringify(mentorProfileData, null, 2));
    
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
    console.log('👤 Step 4: Assigning mentor role to user...');
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