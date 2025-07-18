import { db } from './index';
import { roles } from './schema/roles';

async function seedRoles() {
  console.log('🌱 Seeding roles...');
  
  const initialRoles = [
    {
      name: 'admin',
      displayName: 'Admin',
      description: 'Platform administrator with full access to all features and user management'
    },
    {
      name: 'mentor',
      displayName: 'Mentor',
      description: 'Experienced professional who provides guidance and knowledge to mentees'
    },
    {
      name: 'mentee',
      displayName: 'Mentee',
      description: 'Individual seeking guidance and learning from experienced mentors'
    }
  ];

  try {
    // Check if roles already exist
    const existingRoles = await db.select().from(roles);
    
    if (existingRoles.length > 0) {
      console.log('✅ Roles already exist, skipping seed...');
      return;
    }

    // Insert initial roles
    const insertedRoles = await db.insert(roles).values(initialRoles).returning();
    
    console.log('✅ Successfully seeded roles:');
    insertedRoles.forEach(role => {
      console.log(`   - ${role.displayName} (${role.name})`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting database seeding...\n');
    
    await seedRoles();
    
    console.log('\n🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  main();
}

export { seedRoles, main as runSeed }; 