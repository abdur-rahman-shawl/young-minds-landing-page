import { db } from '../lib/db';
import { mentors, users } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function setupTestMentor() {
  console.log('🧪 Setting up test mentor for availability testing...\n');

  try {
    // Find the first user who is a mentor
    const mentorRecords = await db
      .select({
        mentor: mentors,
        user: users
      })
      .from(mentors)
      .innerJoin(users, eq(mentors.userId, users.id))
      .limit(1);

    if (mentorRecords.length === 0) {
      console.log('❌ No mentors found in database');
      console.log('\nPlease create a mentor account first by:');
      console.log('1. Registering a new account');
      console.log('2. Going to /become-expert');
      console.log('3. Completing the mentor application');
      return;
    }

    const testMentor = mentorRecords[0];
    console.log(`Found mentor: ${testMentor.mentor.fullName || testMentor.user.name}`);
    console.log(`Email: ${testMentor.user.email}`);
    console.log(`Current status: ${testMentor.mentor.verificationStatus}`);

    // Update mentor to VERIFIED status if not already
    if (testMentor.mentor.verificationStatus !== 'VERIFIED') {
      await db
        .update(mentors)
        .set({ 
          verificationStatus: 'VERIFIED',
          updatedAt: new Date()
        })
        .where(eq(mentors.id, testMentor.mentor.id));

      console.log('\n✅ Mentor verification status updated to VERIFIED');
    } else {
      console.log('\n✅ Mentor is already verified');
    }

    // Output testing instructions
    console.log('\n' + '='.repeat(60));
    console.log('📋 TESTING INSTRUCTIONS');
    console.log('='.repeat(60));
    
    console.log('\n1. Start the development server:');
    console.log('   npm run dev');
    
    console.log('\n2. Login with this account:');
    console.log(`   Email: ${testMentor.user.email}`);
    console.log('   Password: [use the password you set]');
    
    console.log('\n3. Navigate to availability management:');
    console.log('   http://localhost:3000/mentor/availability');
    console.log('   OR click "Availability" in the mentor sidebar');
    
    console.log('\n4. Test the following features:');
    console.log('   ✓ Set weekly schedule (Schedule tab)');
    console.log('   ✓ Configure settings (Settings tab)');
    console.log('   ✓ Add vacation/holidays (Exceptions tab)');
    console.log('   ✓ Apply templates (Templates tab)');
    console.log('   ✓ Save your changes');
    
    console.log('\n5. Test booking as a mentee:');
    console.log('   - Login with a different account (mentee)');
    console.log('   - Find this mentor and click "Book Session"');
    console.log('   - Verify only available slots are shown');
    
    console.log('\n' + '='.repeat(60));
    console.log('💡 QUICK TEST SCENARIOS');
    console.log('='.repeat(60));
    
    console.log('\nScenario 1: Basic Setup');
    console.log('- Click "Weekdays 9-5" template');
    console.log('- Save changes');
    console.log('- Refresh page to verify persistence');
    
    console.log('\nScenario 2: Custom Schedule');
    console.log('- Enable Monday only');
    console.log('- Add time block 2PM-5PM');
    console.log('- Save and test booking');
    
    console.log('\nScenario 3: Exceptions');
    console.log('- Add a vacation next week');
    console.log('- Verify those dates are blocked in booking');
    
    console.log('\n✨ Test mentor is ready for availability testing!');

  } catch (error) {
    console.error('❌ Error setting up test mentor:', error);
  }
}

// Run the setup
setupTestMentor()
  .then(() => {
    console.log('\n✅ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });