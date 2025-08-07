#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(connectionString);
const db = drizzle(client);

async function createEnrollmentTables() {
  console.log('🚀 Creating course enrollment tables...');

  try {
    // Create enums first
    console.log('📝 Creating enums...');
    
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE enrollment_status AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED', 'PAUSED', 'EXPIRED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE certificate_status AS ENUM ('NOT_EARNED', 'EARNED', 'ISSUED', 'REVOKED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE progress_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create course_categories table
    console.log('📚 Creating course_categories table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS course_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        slug text NOT NULL UNIQUE,
        description text,
        icon_url text,
        color text,
        parent_category_id uuid REFERENCES course_categories(id),
        order_index integer DEFAULT 0 NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);

    // Create course_enrollments table
    console.log('🎓 Creating course_enrollments table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS course_enrollments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        mentee_id uuid NOT NULL REFERENCES mentees(id) ON DELETE CASCADE,
        status enrollment_status DEFAULT 'ACTIVE' NOT NULL,
        enrolled_at timestamp DEFAULT now() NOT NULL,
        last_accessed_at timestamp,
        completed_at timestamp,
        expires_at timestamp,
        overall_progress decimal(5,2) DEFAULT 0.00 NOT NULL,
        time_spent_minutes integer DEFAULT 0 NOT NULL,
        current_module_id uuid,
        current_section_id uuid,
        payment_status payment_status DEFAULT 'PENDING' NOT NULL,
        paid_amount decimal(10,2),
        currency text DEFAULT 'USD',
        payment_intent_id text,
        enrollment_notes text,
        is_gift boolean DEFAULT false,
        gift_from_user_id text REFERENCES users(id),
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        UNIQUE(course_id, mentee_id)
      );
    `);

    // Create course_progress table
    console.log('📊 Creating course_progress table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS course_progress (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        enrollment_id uuid NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
        content_item_id uuid NOT NULL REFERENCES section_content_items(id) ON DELETE CASCADE,
        status progress_status DEFAULT 'NOT_STARTED' NOT NULL,
        progress_percentage decimal(5,2) DEFAULT 0.00 NOT NULL,
        time_spent_seconds integer DEFAULT 0 NOT NULL,
        last_watched_position_seconds integer DEFAULT 0,
        watch_count integer DEFAULT 0 NOT NULL,
        first_started_at timestamp,
        last_accessed_at timestamp,
        completed_at timestamp,
        student_notes text,
        bookmarked_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        UNIQUE(enrollment_id, content_item_id)
      );
    `);

    // Create course_category_relations table
    console.log('🔗 Creating course_category_relations table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS course_category_relations (
        course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        category_id uuid NOT NULL REFERENCES course_categories(id) ON DELETE CASCADE,
        created_at timestamp DEFAULT now() NOT NULL,
        PRIMARY KEY (course_id, category_id)
      );
    `);

    // Create course_reviews table
    console.log('⭐ Creating course_reviews table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS course_reviews (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        mentee_id uuid NOT NULL REFERENCES mentees(id) ON DELETE CASCADE,
        enrollment_id uuid NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
        rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title text,
        review text,
        is_verified_purchase boolean DEFAULT true NOT NULL,
        is_published boolean DEFAULT true NOT NULL,
        helpful_votes integer DEFAULT 0 NOT NULL,
        report_count integer DEFAULT 0 NOT NULL,
        instructor_response text,
        instructor_responded_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);

    // Create course_certificates table
    console.log('🏆 Creating course_certificates table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS course_certificates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        enrollment_id uuid NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE UNIQUE,
        certificate_number text NOT NULL UNIQUE,
        status certificate_status DEFAULT 'NOT_EARNED' NOT NULL,
        earned_at timestamp,
        issued_at timestamp,
        expires_at timestamp,
        final_score decimal(5,2),
        certificate_url text,
        verification_code text,
        template_id text,
        custom_data text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);

    // Create course_wishlist table
    console.log('❤️ Creating course_wishlist table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS course_wishlist (
        course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        mentee_id uuid NOT NULL REFERENCES mentees(id) ON DELETE CASCADE,
        added_at timestamp DEFAULT now() NOT NULL,
        priority integer DEFAULT 1 NOT NULL,
        notes text,
        notify_on_discount boolean DEFAULT true NOT NULL,
        notify_on_update boolean DEFAULT false NOT NULL,
        PRIMARY KEY (course_id, mentee_id)
      );
    `);

    // Create payment_transactions table
    console.log('💳 Creating payment_transactions table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        enrollment_id uuid NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
        transaction_id text NOT NULL UNIQUE,
        payment_provider text DEFAULT 'stripe' NOT NULL,
        payment_method text,
        amount decimal(10,2) NOT NULL,
        currency text DEFAULT 'USD' NOT NULL,
        original_amount decimal(10,2),
        discount_amount decimal(10,2) DEFAULT 0.00,
        tax_amount decimal(10,2) DEFAULT 0.00,
        status payment_status NOT NULL,
        failure_reason text,
        payment_intent_id text,
        receipt_url text,
        invoice_id text,
        processed_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);

    // Create course_analytics table
    console.log('📈 Creating course_analytics table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS course_analytics (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        enrollment_id uuid NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
        content_item_id uuid REFERENCES section_content_items(id) ON DELETE CASCADE,
        event_type text NOT NULL,
        event_data text,
        session_id text NOT NULL,
        device_type text,
        browser_info text,
        ip_address text,
        duration_seconds integer,
        timestamp timestamp DEFAULT now() NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `);

    // Create indexes for better performance
    console.log('🔍 Creating indexes...');
    
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_course_enrollments_mentee_id ON course_enrollments(mentee_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON course_enrollments(status);`);
    
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_course_progress_enrollment_id ON course_progress(enrollment_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_course_progress_content_item_id ON course_progress(content_item_id);`);
    
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_course_reviews_course_id ON course_reviews(course_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_course_reviews_rating ON course_reviews(rating);`);
    
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_course_categories_slug ON course_categories(slug);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_course_categories_parent ON course_categories(parent_category_id);`);
    
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_course_analytics_enrollment_id ON course_analytics(enrollment_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_course_analytics_event_type ON course_analytics(event_type);`);

    // Insert some default categories
    console.log('📂 Inserting default categories...');
    await db.execute(sql`
      INSERT INTO course_categories (name, slug, description, color, order_index) VALUES
      ('Programming', 'programming', 'Learn programming languages and software development', '#3B82F6', 1),
      ('Web Development', 'web-development', 'Frontend and backend web development', '#10B981', 2),
      ('Data Science', 'data-science', 'Data analysis, machine learning, and AI', '#8B5CF6', 3),
      ('Mobile Development', 'mobile-development', 'iOS and Android app development', '#F59E0B', 4),
      ('DevOps', 'devops', 'Infrastructure, deployment, and operations', '#EF4444', 5),
      ('Design', 'design', 'UI/UX design and graphic design', '#EC4899', 6),
      ('Business', 'business', 'Entrepreneurship and business skills', '#06B6D4', 7),
      ('Career Development', 'career-development', 'Professional growth and soft skills', '#84CC16', 8)
      ON CONFLICT (slug) DO NOTHING;
    `);

    console.log('✅ All course enrollment tables created successfully!');
    
    // Verify tables exist
    console.log('🔍 Verifying table creation...');
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'course_%'
      ORDER BY table_name;
    `);
    
    console.log('📋 Created tables:');
    tables.forEach((table: any) => {
      console.log(`  ✓ ${table.table_name}`);
    });

  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the script
createEnrollmentTables()
  .then(() => {
    console.log('🎉 Database setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database setup failed:', error);
    process.exit(1);
  });