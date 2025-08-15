import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyAvailabilityMigration() {
  console.log('🚀 Starting availability migration...\n');

  try {
    // Create enum types
    console.log('Creating enum types...');
    
    const enumQueries = [
      `CREATE TYPE IF NOT EXISTS availability_type AS ENUM('AVAILABLE', 'BREAK', 'BUFFER', 'BLOCKED');`,
      `CREATE TYPE IF NOT EXISTS recurrence_pattern AS ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');`
    ];

    for (const query of enumQueries) {
      const { error } = await supabase.rpc('exec_sql', { query });
      if (error && !error.message.includes('already exists')) {
        console.error('Error creating enum:', error);
      }
    }

    console.log('✅ Enum types created\n');

    // Create tables
    console.log('Creating availability tables...');
    
    const tableQueries = [
      // mentor_availability_schedules table
      `CREATE TABLE IF NOT EXISTS mentor_availability_schedules (
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
      );`,

      // mentor_weekly_patterns table
      `CREATE TABLE IF NOT EXISTS mentor_weekly_patterns (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        schedule_id uuid NOT NULL REFERENCES mentor_availability_schedules(id) ON DELETE CASCADE,
        day_of_week integer NOT NULL,
        is_enabled boolean DEFAULT true NOT NULL,
        time_blocks jsonb DEFAULT '[]' NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );`,

      // mentor_availability_exceptions table
      `CREATE TABLE IF NOT EXISTS mentor_availability_exceptions (
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
      );`,

      // availability_templates table
      `CREATE TABLE IF NOT EXISTS availability_templates (
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
      );`,

      // mentor_availability_rules table
      `CREATE TABLE IF NOT EXISTS mentor_availability_rules (
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
      );`
    ];

    for (const query of tableQueries) {
      const { error } = await supabase.rpc('exec_sql', { query });
      if (error && !error.message.includes('already exists')) {
        console.error('Error creating table:', error);
      }
    }

    console.log('✅ All availability tables created\n');

    // Create indexes for better performance
    console.log('Creating indexes...');
    
    const indexQueries = [
      `CREATE INDEX IF NOT EXISTS idx_mentor_weekly_patterns_schedule_id ON mentor_weekly_patterns(schedule_id);`,
      `CREATE INDEX IF NOT EXISTS idx_mentor_weekly_patterns_day_of_week ON mentor_weekly_patterns(day_of_week);`,
      `CREATE INDEX IF NOT EXISTS idx_mentor_availability_exceptions_schedule_id ON mentor_availability_exceptions(schedule_id);`,
      `CREATE INDEX IF NOT EXISTS idx_mentor_availability_exceptions_dates ON mentor_availability_exceptions(start_date, end_date);`,
      `CREATE INDEX IF NOT EXISTS idx_availability_templates_mentor_id ON availability_templates(mentor_id);`,
      `CREATE INDEX IF NOT EXISTS idx_mentor_availability_rules_schedule_id ON mentor_availability_rules(schedule_id);`
    ];

    for (const query of indexQueries) {
      const { error } = await supabase.rpc('exec_sql', { query });
      if (error) {
        console.error('Error creating index:', error);
      }
    }

    console.log('✅ Indexes created\n');

    // Enable RLS (Row Level Security)
    console.log('Enabling Row Level Security...');
    
    const rlsQueries = [
      `ALTER TABLE mentor_availability_schedules ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE mentor_weekly_patterns ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE mentor_availability_exceptions ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE availability_templates ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE mentor_availability_rules ENABLE ROW LEVEL SECURITY;`
    ];

    for (const query of rlsQueries) {
      const { error } = await supabase.rpc('exec_sql', { query });
      if (error && !error.message.includes('already enabled')) {
        console.error('Error enabling RLS:', error);
      }
    }

    console.log('✅ Row Level Security enabled\n');

    // Create RLS policies
    console.log('Creating RLS policies...');
    
    const policyQueries = [
      // Policies for mentor_availability_schedules
      `CREATE POLICY IF NOT EXISTS "Mentors can view their own schedule" 
        ON mentor_availability_schedules FOR SELECT 
        USING (true);`,
      
      `CREATE POLICY IF NOT EXISTS "Mentors can update their own schedule" 
        ON mentor_availability_schedules FOR ALL 
        USING (mentor_id IN (SELECT id FROM mentors WHERE user_id = auth.uid()));`,

      // Policies for mentor_weekly_patterns
      `CREATE POLICY IF NOT EXISTS "Users can view weekly patterns" 
        ON mentor_weekly_patterns FOR SELECT 
        USING (true);`,
      
      `CREATE POLICY IF NOT EXISTS "Mentors can manage their weekly patterns" 
        ON mentor_weekly_patterns FOR ALL 
        USING (schedule_id IN (
          SELECT id FROM mentor_availability_schedules 
          WHERE mentor_id IN (SELECT id FROM mentors WHERE user_id = auth.uid())
        ));`,

      // Policies for mentor_availability_exceptions
      `CREATE POLICY IF NOT EXISTS "Users can view exceptions" 
        ON mentor_availability_exceptions FOR SELECT 
        USING (true);`,
      
      `CREATE POLICY IF NOT EXISTS "Mentors can manage their exceptions" 
        ON mentor_availability_exceptions FOR ALL 
        USING (schedule_id IN (
          SELECT id FROM mentor_availability_schedules 
          WHERE mentor_id IN (SELECT id FROM mentors WHERE user_id = auth.uid())
        ));`,

      // Policies for availability_templates
      `CREATE POLICY IF NOT EXISTS "Users can view global templates" 
        ON availability_templates FOR SELECT 
        USING (is_global = true OR mentor_id IN (SELECT id FROM mentors WHERE user_id = auth.uid()));`,
      
      `CREATE POLICY IF NOT EXISTS "Mentors can manage their templates" 
        ON availability_templates FOR ALL 
        USING (mentor_id IN (SELECT id FROM mentors WHERE user_id = auth.uid()));`,

      // Policies for mentor_availability_rules
      `CREATE POLICY IF NOT EXISTS "Users can view rules" 
        ON mentor_availability_rules FOR SELECT 
        USING (true);`,
      
      `CREATE POLICY IF NOT EXISTS "Mentors can manage their rules" 
        ON mentor_availability_rules FOR ALL 
        USING (schedule_id IN (
          SELECT id FROM mentor_availability_schedules 
          WHERE mentor_id IN (SELECT id FROM mentors WHERE user_id = auth.uid())
        ));`
    ];

    for (const query of policyQueries) {
      const { error } = await supabase.rpc('exec_sql', { query });
      if (error && !error.message.includes('already exists')) {
        console.error('Error creating policy:', error);
      }
    }

    console.log('✅ RLS policies created\n');

    console.log('🎉 Availability migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
applyAvailabilityMigration().then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});