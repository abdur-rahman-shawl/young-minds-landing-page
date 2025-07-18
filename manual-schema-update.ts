import { db } from './lib/db/index';

async function updateMentorsSchema() {
  try {
    console.log('🔄 Updating mentors table schema...\n');

    // Create the enum type first
    await db.execute(`
      DO $$ BEGIN
        CREATE TYPE verification_status AS ENUM ('YET_TO_APPLY', 'IN_PROGRESS', 'VERIFIED', 'REJECTED', 'REVERIFICATION');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ Created verification_status enum');

    // Add verification_status column
    await db.execute(`
      ALTER TABLE mentors 
      ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'YET_TO_APPLY' NOT NULL;
    `);
    console.log('✅ Added verification_status column');

    // Add verification_notes column
    await db.execute(`
      ALTER TABLE mentors 
      ADD COLUMN IF NOT EXISTS verification_notes text;
    `);
    console.log('✅ Added verification_notes column');

    // Update existing mentors that have isVerified = true to VERIFIED status
    await db.execute(`
      UPDATE mentors 
      SET verification_status = 'VERIFIED' 
      WHERE is_verified = true;
    `);
    console.log('✅ Updated existing verified mentors');

    // Update existing mentors that have isVerified = false to IN_PROGRESS status
    await db.execute(`
      UPDATE mentors 
      SET verification_status = 'IN_PROGRESS' 
      WHERE is_verified = false;
    `);
    console.log('✅ Updated existing unverified mentors');

    console.log('\n🎉 Schema update completed successfully!');

  } catch (error) {
    console.error('❌ Error updating schema:', error);
  }
}

updateMentorsSchema().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 