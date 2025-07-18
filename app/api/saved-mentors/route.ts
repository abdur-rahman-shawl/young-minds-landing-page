import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mentors, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// Note: saved_mentors table would need to be added to schema
// For now using mock data, but structure would be:
// CREATE TABLE saved_mentors (
//   id TEXT PRIMARY KEY,
//   user_id TEXT REFERENCES users(id),
//   mentor_id TEXT REFERENCES mentors(id),
//   saved_at TIMESTAMP DEFAULT NOW()
// )

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Mock data for now - in production would query actual saved_mentors table
    const mockSavedMentors = [
      {
        id: '1',
        mentorId: 'mentor-1',
        savedAt: new Date().toISOString(),
        mentor: {
          id: 'mentor-1',
          name: 'Sarah Chen',
          title: 'Senior Product Manager',
          company: 'Google',
          expertise: 'Product Strategy, User Research, Agile',
          hourlyRate: '150',
        }
      }
    ];

    return NextResponse.json({
      success: true,
      data: mockSavedMentors
    });

  } catch (error) {
    console.error('Error fetching saved mentors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch saved mentors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, mentorId, action } = body;

    if (!userId || !mentorId) {
      return NextResponse.json(
        { success: false, error: 'User ID and Mentor ID are required' },
        { status: 400 }
      );
    }

    if (action === 'save') {
      // Mock save functionality - in production would insert into saved_mentors table
      const savedMentor = {
        id: crypto.randomUUID(),
        userId,
        mentorId,
        savedAt: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        data: savedMentor,
        message: 'Mentor saved successfully'
      });
    }

    if (action === 'unsave') {
      // Mock unsave functionality
      return NextResponse.json({
        success: true,
        message: 'Mentor removed from saved list'
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error managing saved mentors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to manage saved mentors' },
      { status: 500 }
    );
  }
} 