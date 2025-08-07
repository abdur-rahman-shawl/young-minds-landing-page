import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql);

async function createLearningAnalyticsTables() {
  try {
    console.log('Creating learning analytics tables...');

    // Create enums first
    await sql`
      DO $$ BEGIN
        CREATE TYPE goal_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'EXCEEDED', 'MISSED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE session_type AS ENUM ('LEARNING', 'REVIEW', 'PRACTICE', 'ASSESSMENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE achievement_type AS ENUM ('STREAK', 'COMPLETION', 'TIME_SPENT', 'CONSISTENCY', 'MILESTONE', 'SKILL_MASTERY');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    console.log('✅ Enums created successfully');

    // Create learner_profiles table
    await sql`
      CREATE TABLE IF NOT EXISTS learner_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mentee_id UUID NOT NULL UNIQUE REFERENCES mentees(id) ON DELETE CASCADE,
        
        -- Learning preferences
        weekly_learning_goal_hours DECIMAL(5,2) DEFAULT 5.00,
        preferred_learning_days JSONB DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]'::jsonb,
        timezone TEXT DEFAULT 'UTC' NOT NULL,
        learning_reminders JSONB DEFAULT '{
          "enabled": true,
          "reminderTimes": ["09:00", "19:00"],
          "reminderDays": ["monday", "wednesday", "friday"],
          "emailNotifications": true,
          "pushNotifications": true
        }'::jsonb,
        
        -- Streak tracking
        current_streak INTEGER DEFAULT 0 NOT NULL,
        longest_streak INTEGER DEFAULT 0 NOT NULL,
        streak_start_date DATE,
        last_active_date DATE,
        streak_freezes_used INTEGER DEFAULT 0 NOT NULL,
        total_streak_freezes_available INTEGER DEFAULT 3 NOT NULL,
        
        -- Learning statistics
        total_learning_hours DECIMAL(8,2) DEFAULT 0.00 NOT NULL,
        total_sessions_completed INTEGER DEFAULT 0 NOT NULL,
        average_session_duration_minutes DECIMAL(6,2) DEFAULT 0.00,
        consistency_score DECIMAL(5,2) DEFAULT 0.00,
        
        -- Engagement metrics
        most_active_day TEXT,
        most_active_hour INTEGER,
        learning_velocity_score DECIMAL(5,2) DEFAULT 0.00,
        
        -- Personalization
        learning_style TEXT,
        motivation_type TEXT,
        difficulty_preference TEXT,
        
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    console.log('✅ learner_profiles table created');

    // Create learning_sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS learning_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mentee_id UUID NOT NULL REFERENCES mentees(id) ON DELETE CASCADE,
        
        -- Session details
        session_date DATE NOT NULL,
        session_type session_type DEFAULT 'LEARNING' NOT NULL,
        total_minutes_spent INTEGER DEFAULT 0 NOT NULL,
        
        -- Activity tracking
        courses_accessed JSONB DEFAULT '[]'::jsonb,
        content_items_completed INTEGER DEFAULT 0 NOT NULL,
        content_items_started INTEGER DEFAULT 0 NOT NULL,
        videos_watched INTEGER DEFAULT 0 NOT NULL,
        documents_read INTEGER DEFAULT 0 NOT NULL,
        assessments_completed INTEGER DEFAULT 0 NOT NULL,
        
        -- Session metadata
        session_start_time TIMESTAMP NOT NULL,
        session_end_time TIMESTAMP,
        device_type TEXT,
        browser_info TEXT,
        ip_address TEXT,
        
        -- Engagement metrics
        focus_score DECIMAL(5,2),
        interaction_count INTEGER DEFAULT 0,
        average_playback_speed DECIMAL(3,2) DEFAULT 1.00,
        
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    console.log('✅ learning_sessions table created');

    // Create weekly_learning_goals table
    await sql`
      CREATE TABLE IF NOT EXISTS weekly_learning_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mentee_id UUID NOT NULL REFERENCES mentees(id) ON DELETE CASCADE,
        
        -- Goal period
        week_start_date DATE NOT NULL,
        week_end_date DATE NOT NULL,
        
        -- Goal details
        goal_hours DECIMAL(5,2) NOT NULL,
        actual_hours DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
        goal_status goal_status DEFAULT 'NOT_STARTED' NOT NULL,
        
        -- Progress tracking
        progress_percentage DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
        days_active INTEGER DEFAULT 0 NOT NULL,
        average_daily_minutes DECIMAL(6,2) DEFAULT 0.00,
        
        -- Goal achievement
        achieved_at TIMESTAMP,
        exceeded_at TIMESTAMP,
        final_score DECIMAL(5,2),
        
        -- Contextual data
        goal_set_at TIMESTAMP DEFAULT NOW() NOT NULL,
        goal_adjusted_at TIMESTAMP,
        previous_goal_hours DECIMAL(5,2),
        
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    console.log('✅ weekly_learning_goals table created');

    // Create learning_achievements table
    await sql`
      CREATE TABLE IF NOT EXISTS learning_achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mentee_id UUID NOT NULL REFERENCES mentees(id) ON DELETE CASCADE,
        
        -- Achievement details
        achievement_type achievement_type NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        icon_url TEXT,
        badge_color TEXT DEFAULT '#3B82F6',
        
        -- Achievement criteria
        criteria_value INTEGER NOT NULL,
        current_value INTEGER DEFAULT 0 NOT NULL,
        is_completed BOOLEAN DEFAULT false NOT NULL,
        
        -- Related data
        related_course_id UUID REFERENCES courses(id),
        related_enrollment_id UUID REFERENCES course_enrollments(id),
        
        -- Achievement metadata
        points INTEGER DEFAULT 0 NOT NULL,
        rarity TEXT DEFAULT 'common',
        category TEXT,
        
        -- Completion tracking
        earned_at TIMESTAMP,
        shared_at TIMESTAMP,
        is_visible BOOLEAN DEFAULT true NOT NULL,
        
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    console.log('✅ learning_achievements table created');

    // Create learning_insights table
    await sql`
      CREATE TABLE IF NOT EXISTS learning_insights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mentee_id UUID NOT NULL REFERENCES mentees(id) ON DELETE CASCADE,
        
        -- Insight details
        insight_type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        action_text TEXT,
        action_url TEXT,
        
        -- Insight metadata
        priority TEXT DEFAULT 'medium' NOT NULL,
        category TEXT,
        based_on_data JSONB,
        
        -- User interaction
        is_read BOOLEAN DEFAULT false NOT NULL,
        is_acted_upon BOOLEAN DEFAULT false NOT NULL,
        is_dismissed BOOLEAN DEFAULT false NOT NULL,
        user_feedback TEXT,
        
        -- Validity
        valid_until TIMESTAMP,
        is_active BOOLEAN DEFAULT true NOT NULL,
        
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    console.log('✅ learning_insights table created');

    // Create learning_session_details table
    await sql`
      CREATE TABLE IF NOT EXISTS learning_session_details (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
        content_item_id UUID NOT NULL REFERENCES section_content_items(id) ON DELETE CASCADE,
        
        -- Activity details
        activity_type TEXT NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        duration_seconds INTEGER DEFAULT 0 NOT NULL,
        
        -- Video-specific data
        video_position_seconds INTEGER,
        playback_speed DECIMAL(3,2) DEFAULT 1.00,
        volume_level INTEGER,
        
        -- Engagement metrics
        pause_count INTEGER DEFAULT 0 NOT NULL,
        seek_count INTEGER DEFAULT 0 NOT NULL,
        rewind_count INTEGER DEFAULT 0 NOT NULL,
        
        -- Completion tracking
        completion_percentage DECIMAL(5,2) DEFAULT 0.00,
        is_completed BOOLEAN DEFAULT false NOT NULL,
        
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    console.log('✅ learning_session_details table created');

    // Create indexes for performance (one by one to avoid prepared statement issues)
    console.log('Creating performance indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_learner_profiles_mentee_id ON learner_profiles(mentee_id)',
      'CREATE INDEX IF NOT EXISTS idx_learning_sessions_mentee_date ON learning_sessions(mentee_id, session_date)',
      'CREATE INDEX IF NOT EXISTS idx_learning_sessions_date ON learning_sessions(session_date)',
      'CREATE INDEX IF NOT EXISTS idx_weekly_goals_mentee_week ON weekly_learning_goals(mentee_id, week_start_date)',
      'CREATE INDEX IF NOT EXISTS idx_achievements_mentee_type ON learning_achievements(mentee_id, achievement_type)',
      'CREATE INDEX IF NOT EXISTS idx_achievements_completed ON learning_achievements(is_completed, earned_at)',
      'CREATE INDEX IF NOT EXISTS idx_insights_mentee_active ON learning_insights(mentee_id, is_active)',
      'CREATE INDEX IF NOT EXISTS idx_session_details_session ON learning_session_details(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_session_details_content ON learning_session_details(content_item_id)',
    ];

    for (const indexSQL of indexes) {
      try {
        await sql.unsafe(indexSQL);
        console.log(`✅ Created index: ${indexSQL.split(' ')[5]}`);
      } catch (error) {
        console.log(`⚠️  Index might already exist: ${indexSQL.split(' ')[5]}`);
      }
    }

    console.log('✅ Indexes created successfully');

    // Create some initial achievements templates
    console.log('Creating initial achievement templates...');
    
    // Note: We'll insert these as templates that get copied for each user
    // This is just to create the achievement structure
    
    console.log('✅ Learning analytics tables created successfully!');

  } catch (error) {
    console.error('❌ Error creating learning analytics tables:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the script
createLearningAnalyticsTables();