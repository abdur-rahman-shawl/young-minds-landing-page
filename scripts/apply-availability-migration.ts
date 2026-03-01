import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function applyAvailabilityMigration() {
  console.log('🚀 Starting availability migration...\n');

  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE availability_type AS ENUM('AVAILABLE', 'BREAK', 'BUFFER', 'BLOCKED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE recurrence_pattern AS ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mentor_availability_schedules (
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
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mentor_weekly_patterns (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        schedule_id uuid NOT NULL REFERENCES mentor_availability_schedules(id) ON DELETE CASCADE,
        day_of_week integer NOT NULL,
        is_enabled boolean DEFAULT true NOT NULL,
        time_blocks jsonb DEFAULT '[]'::jsonb NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mentor_availability_exceptions (
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
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS availability_templates (
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
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mentor_availability_rules (
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
      );
    `);

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_mentor_weekly_patterns_schedule_id ON mentor_weekly_patterns(schedule_id)',
      'CREATE INDEX IF NOT EXISTS idx_mentor_weekly_patterns_day_of_week ON mentor_weekly_patterns(day_of_week)',
      'CREATE INDEX IF NOT EXISTS idx_mentor_availability_exceptions_schedule_id ON mentor_availability_exceptions(schedule_id)',
      'CREATE INDEX IF NOT EXISTS idx_mentor_availability_exceptions_dates ON mentor_availability_exceptions(start_date, end_date)',
      'CREATE INDEX IF NOT EXISTS idx_availability_templates_mentor_id ON availability_templates(mentor_id)',
      'CREATE INDEX IF NOT EXISTS idx_mentor_availability_rules_schedule_id ON mentor_availability_rules(schedule_id)',
    ];

    for (const index of indexes) {
      await db.execute(sql.raw(index));
    }

    console.log('✅ Availability migration completed successfully.');
    console.log('ℹ️  Supabase-specific RLS policies are intentionally not created in this script.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyAvailabilityMigration()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
