import { db } from './lib/db/index';
import { users, userRoles, roles } from './lib/db/schema';
import { eq, and } from 'drizzle-orm';

async function makeMentorOnly() {
  try {
    console.log('🚀 Converting user to mentor-only...\n');

    // Find the user (get the first user from the database for testing)
    const [user] = await db.select().from(users).limit(1);
    
    if (!user) {
      console.log('❌ No user found in database');
      return;
    }

    console.log(`👤 Found user: ${user.name} (${user.email})`);

    // Get mentee role
    const [menteeRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, 'mentee'))
      .limit(1);

    if (!menteeRole) {
      console.log('❌ Mentee role not found');
      return;
    }

    // Remove mentee role from user
    const deletedRoles = await db
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.userId, user.id),
          eq(userRoles.roleId, menteeRole.id)
        )
      )
      .returning();

    if (deletedRoles.length > 0) {
      console.log('✅ Mentee role removed from user');
    } else {
      console.log('⚠️  User might not have had mentee role');
    }

    // Verify current roles
    const currentRoles = await db
      .select({
        roleName: roles.name,
        roleDisplayName: roles.displayName
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));

    console.log('\n📋 Current user roles:');
    if (currentRoles.length === 0) {
      console.log('   - No roles assigned');
    } else {
      currentRoles.forEach(role => {
        console.log(`   - ${role.roleDisplayName} (${role.roleName})`);
      });
    }

    console.log('\n🎉 User is now mentor-only!');
    console.log('📝 Note: Restart your development server and refresh the page to see changes');

  } catch (error) {
    console.error('❌ Error making user mentor-only:', error);
  }
}

makeMentorOnly().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 