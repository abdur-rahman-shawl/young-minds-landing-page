import { db } from './lib/db/index';
import { users, mentors, mentees, userRoles, sessions, messages, mentoringRelationships } from './lib/db/schema';
import { eq } from 'drizzle-orm';

async function clearUsers() {
  try {
    console.log('🔄 Clearing user accounts from database...\n');

    // First, list all users
    const allUsers = await db.select().from(users);
    
    if (allUsers.length === 0) {
      console.log('✅ No users found in database');
      return;
    }

    console.log('📋 Current users in database:');
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email}) - ID: ${user.id}`);
    });

    console.log('\n🗑️  Deleting all user data...');

    // Delete in correct order due to foreign key constraints
    
    // 1. Delete mentoring relationships
    await db.delete(mentoringRelationships);
    console.log('✅ Deleted mentoring relationships');

    // 2. Delete messages  
    await db.delete(messages);
    console.log('✅ Deleted messages');

    // 3. Delete sessions
    await db.delete(sessions);
    console.log('✅ Deleted sessions');

    // 4. Delete mentors
    await db.delete(mentors);
    console.log('✅ Deleted mentor profiles');

    // 5. Delete mentees
    await db.delete(mentees);
    console.log('✅ Deleted mentee profiles');

    // 6. Delete user roles
    await db.delete(userRoles);
    console.log('✅ Deleted user roles');

    // 7. Delete auth tables (BetterAuth)
    try {
      await db.execute('DELETE FROM auth_sessions');
      console.log('✅ Deleted auth sessions');
    } catch (error) {
      console.log('⚠️  Auth sessions table might not exist or already empty');
    }

    try {
      await db.execute('DELETE FROM auth_accounts');
      console.log('✅ Deleted auth accounts');
    } catch (error) {
      console.log('⚠️  Auth accounts table might not exist or already empty');
    }

    try {
      await db.execute('DELETE FROM auth_verifications');
      console.log('✅ Deleted auth verifications');
    } catch (error) {
      console.log('⚠️  Auth verifications table might not exist or already empty');
    }

    // 8. Finally delete users
    await db.delete(users);
    console.log('✅ Deleted users');

    console.log('\n🎉 All user data cleared successfully!');
    console.log('📝 You can now test mentor signup with fresh accounts');
    console.log('🔄 Please restart your development server to clear any cached sessions');

  } catch (error) {
    console.error('❌ Error clearing users:', error);
  }
}

clearUsers().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 