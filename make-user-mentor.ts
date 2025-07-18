import { db } from './lib/db/index';
import { users, mentors, userRoles, roles } from './lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function makeUserMentor() {
  try {
    console.log('🚀 Adding mentor role and profile...\n');

    // Find the user (get the first user from the database for testing)
    const [user] = await db.select().from(users).limit(1);
    
    if (!user) {
      console.log('❌ No user found in database');
      return;
    }

    console.log(`👤 Found user: ${user.name} (${user.email})`);

    // Get mentor role
    const [mentorRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, 'mentor'))
      .limit(1);

    if (!mentorRole) {
      console.log('❌ Mentor role not found');
      return;
    }

    // Add mentor role to user (if not already exists)
    try {
      await db
        .insert(userRoles)
        .values({
          userId: user.id,
          roleId: mentorRole.id,
          assignedBy: user.id
        })
        .onConflictDoNothing();
      
      console.log('✅ Mentor role added to user');
    } catch (error) {
      console.log('⚠️  User might already have mentor role');
    }

    // Check if mentor profile already exists
    const [existingMentor] = await db
      .select()
      .from(mentors)
      .where(eq(mentors.userId, user.id))
      .limit(1);

    if (existingMentor) {
      console.log('✅ Mentor profile already exists');
      return;
    }

    // Create mentor profile
    const [newMentor] = await db
      .insert(mentors)
      .values({
        id: randomUUID(),
        userId: user.id,
        title: 'Senior Software Engineer',
        company: 'Tech Corp',
        industry: 'Technology',
        expertise: JSON.stringify(['JavaScript', 'React', 'Node.js', 'TypeScript']),
        experience: 5,
        hourlyRate: '75.00',
        currency: 'USD',
        availability: JSON.stringify({
          monday: ['9:00-17:00'],
          tuesday: ['9:00-17:00'],
          wednesday: ['9:00-17:00'],
          thursday: ['9:00-17:00'],
          friday: ['9:00-17:00']
        }),
        maxMentees: 10,
        headline: 'Experienced Full-Stack Developer & Tech Lead',
        about: 'Passionate about helping developers grow their skills and advance their careers. I specialize in modern web development technologies and have experience leading technical teams.',
        linkedinUrl: 'https://linkedin.com/in/example',
        githubUrl: 'https://github.com/example',
        websiteUrl: 'https://example.com',
        isVerified: true, // Set to true for testing
        isAvailable: true
      })
      .returning();

    console.log('✅ Mentor profile created successfully!');
    console.log(`🎉 User ${user.name} is now both a mentee and mentor`);
    console.log('\n📝 Note: Restart your development server and refresh the page to see changes');

  } catch (error) {
    console.error('❌ Error making user mentor:', error);
  }
}

makeUserMentor().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 