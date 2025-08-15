import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function applyAvailabilityTables() {
  console.log('🚀 Creating availability tables...\n');

  try {
    // Create enum types
    console.log('Creating enum types...');
    
    try {
      await db.execute(sql`
        CREATE TYPE availability_type AS ENUM('AVAILABLE', 'BREAK', 'BUFFER', 'BLOCKED')
      `);
      console.log('✅ Created availability_type enum');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  availability_type enum already exists');
      } else throw error;
    }

    try {
      await db.execute(sql`
        CREATE TYPE recurrence_pattern AS ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM')
      `);
      console.log('✅ Created recurrence_pattern enum');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  recurrence_pattern enum already exists');
      } else throw error;
    }

    // Create mentor_availability_schedules table
    console.log('\nCreating mentor_availability_schedules table...');
    try {
      await db.execute(sql`
        CREATE TABLE mentor_availability_schedules (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          mentor_id uuid NOT NULL UNIQUE REFERENCES mentors(id) ON DELETE CASCADE,
          timezone text DEFAULT 'UTC' NOT NULL,
          default_session_duration integer DEFAULT 60 NOT NULL,
          buffer_time integer DEFAULT 15 NOT NULL,
          min_advance_booking_hours integer DEFAULT 24 NOT NULL,
          max_advance_booking_days integer DEFAULT 90 NOT NULL,
          default_start_time time DEFAULT '09:00:00',
          default_end_time time DEFAULT '17:00:00',
          is_active boolean DEFAULT true NOT NULL,
          allow_instant_booking boolean DEFAULT true NOT NULL,
          require_confirmation boolean DEFAULT false NOT NULL,
          created_at timestamp DEFAULT now() NOT NULL,
          updated_at timestamp DEFAULT now() NOT NULL
        )
      `);
      console.log('✅ Created mentor_availability_schedules table');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  mentor_availability_schedules table already exists');
      } else throw error;
    }

    // Create mentor_weekly_patterns table
    console.log('\nCreating mentor_weekly_patterns table...');
    try {
      await db.execute(sql`
        CREATE TABLE mentor_weekly_patterns (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          schedule_id uuid NOT NULL REFERENCES mentor_availability_schedules(id) ON DELETE CASCADE,
          day_of_week integer NOT NULL,
          is_enabled boolean DEFAULT true NOT NULL,
          time_blocks jsonb DEFAULT '[]'::jsonb NOT NULL,
          created_at timestamp DEFAULT now() NOT NULL,
          updated_at timestamp DEFAULT now() NOT NULL
        )
      `);
      console.log('✅ Created mentor_weekly_patterns table');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  mentor_weekly_patterns table already exists');
      } else throw error;
    }

    // Create mentor_availability_exceptions table
    console.log('\nCreating mentor_availability_exceptions table...');
    try {
      await db.execute(sql`
        CREATE TABLE mentor_availability_exceptions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          schedule_id uuid NOT NULL REFERENCES mentor_availability_schedules(id) ON DELETE CASCADE,
          start_date timestamp NOT NULL,
          end_date timestamp NOT NULL,
          type availability_type DEFAULT 'BLOCKED' NOT NULL,
          reason text,
          is_full_day boolean DEFAULT true NOT NULL,
          time_blocks jsonb,
          created_at timestamp DEFAULT now() NOT NULL,
          updated_at timestamp DEFAULT now() NOT NULL
        )
      `);
      console.log('✅ Created mentor_availability_exceptions table');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  mentor_availability_exceptions table already exists');
      } else throw error;
    }

    // Create availability_templates table
    console.log('\nCreating availability_templates table...');
    try {
      await db.execute(sql`
        CREATE TABLE availability_templates (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          mentor_id uuid REFERENCES mentors(id) ON DELETE CASCADE,
          name text NOT NULL,
          description text,
          is_global boolean DEFAULT false NOT NULL,
          configuration jsonb NOT NULL,
          usage_count integer DEFAULT 0 NOT NULL,
          last_used_at timestamp,
          created_at timestamp DEFAULT now() NOT NULL,
          updated_at timestamp DEFAULT now() NOT NULL
        )
      `);
      console.log('✅ Created availability_templates table');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  availability_templates table already exists');
      } else throw error;
    }

    // Create mentor_availability_rules table
    console.log('\nCreating mentor_availability_rules table...');
    try {
      await db.execute(sql`
        CREATE TABLE mentor_availability_rules (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          schedule_id uuid NOT NULL REFERENCES mentor_availability_schedules(id) ON DELETE CASCADE,
          name text NOT NULL,
          description text,
          conditions jsonb NOT NULL,
          actions jsonb NOT NULL,
          priority integer DEFAULT 0 NOT NULL,
          is_active boolean DEFAULT true NOT NULL,
          created_at timestamp DEFAULT now() NOT NULL,
          updated_at timestamp DEFAULT now() NOT NULL
        )
      `);
      console.log('✅ Created mentor_availability_rules table');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  mentor_availability_rules table already exists');
      } else throw error;
    }

    // Create indexes
    console.log('\nCreating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_mentor_weekly_patterns_schedule_id ON mentor_weekly_patterns(schedule_id)',
      'CREATE INDEX IF NOT EXISTS idx_mentor_weekly_patterns_day_of_week ON mentor_weekly_patterns(day_of_week)',
      'CREATE INDEX IF NOT EXISTS idx_mentor_availability_exceptions_schedule_id ON mentor_availability_exceptions(schedule_id)',
      'CREATE INDEX IF NOT EXISTS idx_mentor_availability_exceptions_dates ON mentor_availability_exceptions(start_date, end_date)',
      'CREATE INDEX IF NOT EXISTS idx_availability_templates_mentor_id ON availability_templates(mentor_id)',
      'CREATE INDEX IF NOT EXISTS idx_mentor_availability_rules_schedule_id ON mentor_availability_rules(schedule_id)'
    ];

    for (const index of indexes) {
      await db.execute(sql.raw(index));
    }
    console.log('✅ Created all indexes');

    console.log('\n🎉 Availability tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

// Run the script
applyAvailabilityTables()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });