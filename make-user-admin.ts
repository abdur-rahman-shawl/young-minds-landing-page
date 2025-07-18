import { db } from './lib/db/index';
import { users, roles, userRoles } from './lib/db/schema';
import { eq } from 'drizzle-orm';

const email = process.argv[2];

if (!email) {
  console.error('Usage: tsx make-user-admin.ts user@example.com');
  process.exit(1);
}

async function makeAdmin() {
  try {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      console.error('User not found:', email);
      process.exit(1);
    }

    const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);
    if (!adminRole) {
      console.error('Admin role not found, seed roles first');
      process.exit(1);
    }

    await db.insert(userRoles).values({
      userId: user.id,
      roleId: adminRole.id,
      assignedBy: user.id,
    }).onConflictDoNothing();

    console.log(`🎉 User ${email} is now an admin`);
  } catch (error) {
    console.error('Error making admin:', error);
  }
}

makeAdmin();