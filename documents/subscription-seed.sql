-- Seed data for subscription plans, prices, and features
-- Currency: INR (Indian Rupee)

INSERT INTO "subscription_plans" ("plan_key", "audience", "name", "description", "status", "sort_order")
VALUES
  ('mentor_silver', 'mentor', 'Silver', 'Entry plan for mentors', 'active', 1),
  ('mentor_gold', 'mentor', 'Gold', 'Growth plan for mentors', 'active', 2),
  ('mentor_platinum', 'mentor', 'Platinum', 'Advanced plan for mentors', 'active', 3),
  ('mentor_diamond', 'mentor', 'Diamond', 'Premium plan for mentors', 'active', 4),
  ('mentor_consulting_org', 'mentor', 'Consulting Org', 'Organization plan for mentor teams', 'active', 5),
  ('mentee_intro', 'mentee', 'Introduction Plan', 'Free trial for everyone', 'active', 1),
  ('mentee_youth', 'mentee', 'Youth', 'Students plan', 'active', 2),
  ('mentee_professionals', 'mentee', 'Professionals', 'Working individuals/startups/business owners', 'active', 3),
  ('mentee_corporates', 'mentee', 'Corporates', 'Max 5-member team', 'active', 4);

INSERT INTO "subscription_plan_prices" (
  "plan_id",
  "price_type",
  "billing_interval",
  "billing_interval_count",
  "amount",
  "currency",
  "intro_duration_intervals",
  "is_active"
)
VALUES
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_silver'), 'standard', 'month', 1, 999, 'INR', NULL, true),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_silver'), 'introductory', 'month', 1, 0, 'INR', 1, true),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_gold'), 'standard', 'month', 1, 2999, 'INR', NULL, true),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_gold'), 'introductory', 'month', 1, 999, 'INR', 1, true),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_platinum'), 'standard', 'month', 1, 4999, 'INR', NULL, true),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_platinum'), 'introductory', 'month', 1, 1999, 'INR', 1, true),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_diamond'), 'standard', 'month', 1, 9999, 'INR', NULL, true),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_diamond'), 'introductory', 'month', 1, 2999, 'INR', 1, true),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_consulting_org'), 'standard', 'month', 1, 19999, 'INR', NULL, true),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_consulting_org'), 'introductory', 'month', 1, 9999, 'INR', 1, true),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_intro'), 'standard', 'month', 1, 0, 'INR', NULL, true),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_intro'), 'introductory', 'month', 1, 0, 'INR', 1, true),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_youth'), 'standard', 'month', 1, 1999, 'INR', NULL, true),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_youth'), 'introductory', 'month', 1, 499, 'INR', 1, true),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_professionals'), 'standard', 'month', 1, 4999, 'INR', NULL, true),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_professionals'), 'introductory', 'month', 1, 999, 'INR', 1, true),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_corporates'), 'standard', 'month', 1, 23999, 'INR', NULL, true),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_corporates'), 'introductory', 'month', 1, 9999, 'INR', 1, true);

INSERT INTO "subscription_features" ("feature_key", "name", "description", "value_type", "unit")
VALUES
  ('mentor_profile', 'Mentor Profile', 'Mentor profile page', 'boolean', NULL),
  ('individual_profile_page', 'Individual Profile Page', 'Individual profile page', 'boolean', NULL),
  ('company_page', 'Company Page', 'Company page', 'boolean', NULL),
  ('ai_visibility', 'AI Push Visibility', 'AI push search, appearance & visibility', 'count', 'appearances'),
  ('ai_search_sessions', 'AI Search', 'AI search sessions', 'count', 'sessions'),
  ('lead_qualifying_session', 'Lead Qualifying Session', 'Free lead qualifying session', 'minutes', 'minutes'),
  ('free_video_call', 'Free 1:1 Video Call', 'Free 1:1 video call', 'minutes', 'minutes'),
  ('paid_video_sessions', 'Paid 1:1 Video Sessions', 'Paid 1:1 video sessions', 'count', 'sessions'),
  ('paid_video_calls', 'Paid 1:1 Video Calls', 'Paid 1:1 video calls', 'count', 'sessions'),
  ('counseling_sessions', 'Counseling Sessions', 'Career and studies counseling sessions', 'count', 'sessions'),
  ('create_post_content', 'Create & Post Content', 'Create and post content/videos', 'text', NULL),
  ('roadmap_upload', 'Roadmap / Whitepaper Upload', 'Roadmap/whitepaper upload', 'text', NULL),
  ('roadmap_download', 'Roadmap / Whitepaper Download', 'Roadmap/whitepaper download', 'text', NULL),
  ('knowledge_hub_access', 'Knowledge Hub Access', 'Knowledge hub access', 'text', NULL),
  ('industry_expert_listing', 'Industry Expert Listing', 'Industry expert listing', 'text', NULL),
  ('industry_expert_access', 'Industry Expert Access', 'Industry expert access', 'text', NULL),
  ('live_sessions', 'Live Sessions', 'Live sessions', 'minutes', 'minutes'),
  ('courses_pre_recorded', 'Courses / Pre-recorded', 'Courses / pre-recorded videos', 'text', NULL),
  ('analytics_dashboard', 'Analytics Dashboard', 'Analytics dashboard access', 'text', NULL),
  ('priority_support', 'Priority Support', 'Priority support', 'text', NULL),
  ('exclusive_partner_offers', 'Exclusive Partner Offers', 'Exclusive partner offers', 'boolean', NULL),
  ('early_access_new_features', 'Early Access to New Features', 'Early access to new features', 'boolean', NULL);

-- Mentor plan features
INSERT INTO "subscription_plan_features" (
  "plan_id",
  "feature_id",
  "is_included",
  "limit_count",
  "limit_minutes",
  "limit_text",
  "limit_interval",
  "limit_interval_count",
  "price_amount",
  "price_currency",
  "notes"
)
VALUES
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_silver'), (SELECT id FROM "subscription_features" WHERE feature_key = 'mentor_profile'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_gold'), (SELECT id FROM "subscription_features" WHERE feature_key = 'mentor_profile'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_platinum'), (SELECT id FROM "subscription_features" WHERE feature_key = 'mentor_profile'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_diamond'), (SELECT id FROM "subscription_features" WHERE feature_key = 'mentor_profile'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_consulting_org'), (SELECT id FROM "subscription_features" WHERE feature_key = 'mentor_profile'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_silver'), (SELECT id FROM "subscription_features" WHERE feature_key = 'company_page'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_gold'), (SELECT id FROM "subscription_features" WHERE feature_key = 'company_page'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_platinum'), (SELECT id FROM "subscription_features" WHERE feature_key = 'company_page'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_diamond'), (SELECT id FROM "subscription_features" WHERE feature_key = 'company_page'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_consulting_org'), (SELECT id FROM "subscription_features" WHERE feature_key = 'company_page'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_silver'), (SELECT id FROM "subscription_features" WHERE feature_key = 'ai_visibility'), true, NULL, NULL, 'Limited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_gold'), (SELECT id FROM "subscription_features" WHERE feature_key = 'ai_visibility'), true, 25, NULL, NULL, 'month', 1, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_platinum'), (SELECT id FROM "subscription_features" WHERE feature_key = 'ai_visibility'), true, 100, NULL, NULL, 'month', 1, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_diamond'), (SELECT id FROM "subscription_features" WHERE feature_key = 'ai_visibility'), true, NULL, NULL, 'Unlimited (Trending Profile)', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_consulting_org'), (SELECT id FROM "subscription_features" WHERE feature_key = 'ai_visibility'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_silver'), (SELECT id FROM "subscription_features" WHERE feature_key = 'lead_qualifying_session'), true, 1, 30, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_gold'), (SELECT id FROM "subscription_features" WHERE feature_key = 'lead_qualifying_session'), true, 1, 30, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_platinum'), (SELECT id FROM "subscription_features" WHERE feature_key = 'lead_qualifying_session'), true, 1, 30, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_diamond'), (SELECT id FROM "subscription_features" WHERE feature_key = 'lead_qualifying_session'), true, 1, 30, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_consulting_org'), (SELECT id FROM "subscription_features" WHERE feature_key = 'lead_qualifying_session'), true, 1, 30, NULL, NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_silver'), (SELECT id FROM "subscription_features" WHERE feature_key = 'paid_video_sessions'), true, 1, 45, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_gold'), (SELECT id FROM "subscription_features" WHERE feature_key = 'paid_video_sessions'), true, NULL, 45, '5-10 sessions', 'month', 1, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_platinum'), (SELECT id FROM "subscription_features" WHERE feature_key = 'paid_video_sessions'), true, NULL, 45, '10-20 sessions', 'month', 1, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_diamond'), (SELECT id FROM "subscription_features" WHERE feature_key = 'paid_video_sessions'), true, NULL, 45, '20-30 sessions', 'month', 1, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_consulting_org'), (SELECT id FROM "subscription_features" WHERE feature_key = 'paid_video_sessions'), true, 25, 60, NULL, 'month', 1, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_silver'), (SELECT id FROM "subscription_features" WHERE feature_key = 'create_post_content'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_gold'), (SELECT id FROM "subscription_features" WHERE feature_key = 'create_post_content'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_platinum'), (SELECT id FROM "subscription_features" WHERE feature_key = 'create_post_content'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_diamond'), (SELECT id FROM "subscription_features" WHERE feature_key = 'create_post_content'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_consulting_org'), (SELECT id FROM "subscription_features" WHERE feature_key = 'create_post_content'), true, NULL, NULL, 'Full personalized team roadmap', NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_silver'), (SELECT id FROM "subscription_features" WHERE feature_key = 'roadmap_upload'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_gold'), (SELECT id FROM "subscription_features" WHERE feature_key = 'roadmap_upload'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_platinum'), (SELECT id FROM "subscription_features" WHERE feature_key = 'roadmap_upload'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_diamond'), (SELECT id FROM "subscription_features" WHERE feature_key = 'roadmap_upload'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_consulting_org'), (SELECT id FROM "subscription_features" WHERE feature_key = 'roadmap_upload'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_silver'), (SELECT id FROM "subscription_features" WHERE feature_key = 'knowledge_hub_access'), true, NULL, NULL, 'Limited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_gold'), (SELECT id FROM "subscription_features" WHERE feature_key = 'knowledge_hub_access'), true, NULL, NULL, 'Limited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_platinum'), (SELECT id FROM "subscription_features" WHERE feature_key = 'knowledge_hub_access'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_diamond'), (SELECT id FROM "subscription_features" WHERE feature_key = 'knowledge_hub_access'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_consulting_org'), (SELECT id FROM "subscription_features" WHERE feature_key = 'knowledge_hub_access'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_silver'), (SELECT id FROM "subscription_features" WHERE feature_key = 'industry_expert_listing'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_gold'), (SELECT id FROM "subscription_features" WHERE feature_key = 'industry_expert_listing'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_platinum'), (SELECT id FROM "subscription_features" WHERE feature_key = 'industry_expert_listing'), true, 1, NULL, '1 category', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_diamond'), (SELECT id FROM "subscription_features" WHERE feature_key = 'industry_expert_listing'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_consulting_org'), (SELECT id FROM "subscription_features" WHERE feature_key = 'industry_expert_listing'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_silver'), (SELECT id FROM "subscription_features" WHERE feature_key = 'roadmap_download'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_gold'), (SELECT id FROM "subscription_features" WHERE feature_key = 'roadmap_download'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_platinum'), (SELECT id FROM "subscription_features" WHERE feature_key = 'roadmap_download'), true, 1, NULL, '1 category', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_diamond'), (SELECT id FROM "subscription_features" WHERE feature_key = 'roadmap_download'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_consulting_org'), (SELECT id FROM "subscription_features" WHERE feature_key = 'roadmap_download'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_silver'), (SELECT id FROM "subscription_features" WHERE feature_key = 'live_sessions'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_gold'), (SELECT id FROM "subscription_features" WHERE feature_key = 'live_sessions'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_platinum'), (SELECT id FROM "subscription_features" WHERE feature_key = 'live_sessions'), true, NULL, 120, NULL, 'month', 1, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_diamond'), (SELECT id FROM "subscription_features" WHERE feature_key = 'live_sessions'), true, NULL, 240, NULL, 'month', 1, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_consulting_org'), (SELECT id FROM "subscription_features" WHERE feature_key = 'live_sessions'), true, NULL, 240, NULL, 'month', 1, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_silver'), (SELECT id FROM "subscription_features" WHERE feature_key = 'courses_pre_recorded'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_gold'), (SELECT id FROM "subscription_features" WHERE feature_key = 'courses_pre_recorded'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_platinum'), (SELECT id FROM "subscription_features" WHERE feature_key = 'courses_pre_recorded'), true, NULL, NULL, '2 videos/month (1 hr each)', 'month', 1, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_diamond'), (SELECT id FROM "subscription_features" WHERE feature_key = 'courses_pre_recorded'), true, NULL, NULL, '5 videos/month (1 hr each)', 'month', 1, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_consulting_org'), (SELECT id FROM "subscription_features" WHERE feature_key = 'courses_pre_recorded'), true, NULL, NULL, '5 videos/month (1 hr each)', 'month', 1, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_silver'), (SELECT id FROM "subscription_features" WHERE feature_key = 'analytics_dashboard'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_gold'), (SELECT id FROM "subscription_features" WHERE feature_key = 'analytics_dashboard'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_platinum'), (SELECT id FROM "subscription_features" WHERE feature_key = 'analytics_dashboard'), true, NULL, NULL, 'Real-time analytics', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_diamond'), (SELECT id FROM "subscription_features" WHERE feature_key = 'analytics_dashboard'), true, NULL, NULL, 'Deep analytics', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_consulting_org'), (SELECT id FROM "subscription_features" WHERE feature_key = 'analytics_dashboard'), true, NULL, NULL, 'Deep analytics', NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_silver'), (SELECT id FROM "subscription_features" WHERE feature_key = 'priority_support'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_gold'), (SELECT id FROM "subscription_features" WHERE feature_key = 'priority_support'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_platinum'), (SELECT id FROM "subscription_features" WHERE feature_key = 'priority_support'), true, NULL, NULL, 'Chatbot', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_diamond'), (SELECT id FROM "subscription_features" WHERE feature_key = 'priority_support'), true, NULL, NULL, 'Chatbot', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_consulting_org'), (SELECT id FROM "subscription_features" WHERE feature_key = 'priority_support'), true, NULL, NULL, 'Chatbot', NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_silver'), (SELECT id FROM "subscription_features" WHERE feature_key = 'exclusive_partner_offers'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_gold'), (SELECT id FROM "subscription_features" WHERE feature_key = 'exclusive_partner_offers'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_platinum'), (SELECT id FROM "subscription_features" WHERE feature_key = 'exclusive_partner_offers'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_diamond'), (SELECT id FROM "subscription_features" WHERE feature_key = 'exclusive_partner_offers'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_consulting_org'), (SELECT id FROM "subscription_features" WHERE feature_key = 'exclusive_partner_offers'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_silver'), (SELECT id FROM "subscription_features" WHERE feature_key = 'early_access_new_features'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_gold'), (SELECT id FROM "subscription_features" WHERE feature_key = 'early_access_new_features'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_platinum'), (SELECT id FROM "subscription_features" WHERE feature_key = 'early_access_new_features'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_diamond'), (SELECT id FROM "subscription_features" WHERE feature_key = 'early_access_new_features'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentor_consulting_org'), (SELECT id FROM "subscription_features" WHERE feature_key = 'early_access_new_features'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- Mentee plan features
INSERT INTO "subscription_plan_features" (
  "plan_id",
  "feature_id",
  "is_included",
  "limit_count",
  "limit_minutes",
  "limit_text",
  "limit_interval",
  "limit_interval_count",
  "price_amount",
  "price_currency",
  "notes"
)
VALUES
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_intro'), (SELECT id FROM "subscription_features" WHERE feature_key = 'individual_profile_page'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_youth'), (SELECT id FROM "subscription_features" WHERE feature_key = 'individual_profile_page'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_professionals'), (SELECT id FROM "subscription_features" WHERE feature_key = 'individual_profile_page'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_corporates'), (SELECT id FROM "subscription_features" WHERE feature_key = 'individual_profile_page'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_intro'), (SELECT id FROM "subscription_features" WHERE feature_key = 'company_page'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_youth'), (SELECT id FROM "subscription_features" WHERE feature_key = 'company_page'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_professionals'), (SELECT id FROM "subscription_features" WHERE feature_key = 'company_page'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_corporates'), (SELECT id FROM "subscription_features" WHERE feature_key = 'company_page'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_intro'), (SELECT id FROM "subscription_features" WHERE feature_key = 'ai_search_sessions'), true, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Limited'),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_youth'), (SELECT id FROM "subscription_features" WHERE feature_key = 'ai_search_sessions'), true, 10, NULL, NULL, 'month', 1, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_professionals'), (SELECT id FROM "subscription_features" WHERE feature_key = 'ai_search_sessions'), true, 20, NULL, NULL, 'month', 1, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_corporates'), (SELECT id FROM "subscription_features" WHERE feature_key = 'ai_search_sessions'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_intro'), (SELECT id FROM "subscription_features" WHERE feature_key = 'free_video_call'), true, 1, 30, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_youth'), (SELECT id FROM "subscription_features" WHERE feature_key = 'free_video_call'), true, 1, 30, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_professionals'), (SELECT id FROM "subscription_features" WHERE feature_key = 'free_video_call'), true, 1, 30, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_corporates'), (SELECT id FROM "subscription_features" WHERE feature_key = 'free_video_call'), true, 1, 30, 'For 1 member only', NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_intro'), (SELECT id FROM "subscription_features" WHERE feature_key = 'paid_video_calls'), true, 1, 45, NULL, NULL, NULL, 4999, 'INR', NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_youth'), (SELECT id FROM "subscription_features" WHERE feature_key = 'paid_video_calls'), true, 5, 45, NULL, 'month', 1, 1499, 'INR', NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_professionals'), (SELECT id FROM "subscription_features" WHERE feature_key = 'paid_video_calls'), true, 8, 45, NULL, 'month', 1, 1499, 'INR', NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_corporates'), (SELECT id FROM "subscription_features" WHERE feature_key = 'paid_video_calls'), true, 10, 45, NULL, 'month', 1, 4999, 'INR', NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_intro'), (SELECT id FROM "subscription_features" WHERE feature_key = 'counseling_sessions'), true, NULL, NULL, 'Limited', NULL, NULL, 1999, 'INR', NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_youth'), (SELECT id FROM "subscription_features" WHERE feature_key = 'counseling_sessions'), true, 5, NULL, NULL, 'month', 1, 599, 'INR', NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_professionals'), (SELECT id FROM "subscription_features" WHERE feature_key = 'counseling_sessions'), true, 10, NULL, NULL, 'month', 1, 999, 'INR', NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_corporates'), (SELECT id FROM "subscription_features" WHERE feature_key = 'counseling_sessions'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_intro'), (SELECT id FROM "subscription_features" WHERE feature_key = 'create_post_content'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_youth'), (SELECT id FROM "subscription_features" WHERE feature_key = 'create_post_content'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_professionals'), (SELECT id FROM "subscription_features" WHERE feature_key = 'create_post_content'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_corporates'), (SELECT id FROM "subscription_features" WHERE feature_key = 'create_post_content'), true, NULL, NULL, 'Full personalized team roadmap', NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_intro'), (SELECT id FROM "subscription_features" WHERE feature_key = 'roadmap_download'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_youth'), (SELECT id FROM "subscription_features" WHERE feature_key = 'roadmap_download'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_professionals'), (SELECT id FROM "subscription_features" WHERE feature_key = 'roadmap_download'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_corporates'), (SELECT id FROM "subscription_features" WHERE feature_key = 'roadmap_download'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_intro'), (SELECT id FROM "subscription_features" WHERE feature_key = 'knowledge_hub_access'), true, NULL, NULL, 'Limited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_youth'), (SELECT id FROM "subscription_features" WHERE feature_key = 'knowledge_hub_access'), true, NULL, NULL, 'Limited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_professionals'), (SELECT id FROM "subscription_features" WHERE feature_key = 'knowledge_hub_access'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_corporates'), (SELECT id FROM "subscription_features" WHERE feature_key = 'knowledge_hub_access'), true, NULL, NULL, 'Unlimited', NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_intro'), (SELECT id FROM "subscription_features" WHERE feature_key = 'industry_expert_access'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_youth'), (SELECT id FROM "subscription_features" WHERE feature_key = 'industry_expert_access'), true, NULL, NULL, 'Limited', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_professionals'), (SELECT id FROM "subscription_features" WHERE feature_key = 'industry_expert_access'), true, NULL, NULL, 'Unlimited access (rates as per expert profile)', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_corporates'), (SELECT id FROM "subscription_features" WHERE feature_key = 'industry_expert_access'), true, NULL, NULL, 'Unlimited calls (rates as per expert profile)', NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_intro'), (SELECT id FROM "subscription_features" WHERE feature_key = 'live_sessions'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_youth'), (SELECT id FROM "subscription_features" WHERE feature_key = 'live_sessions'), true, 1, 60, NULL, 'month', 1, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_professionals'), (SELECT id FROM "subscription_features" WHERE feature_key = 'live_sessions'), true, 2, 60, NULL, 'month', 1, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_corporates'), (SELECT id FROM "subscription_features" WHERE feature_key = 'live_sessions'), true, 2, 60, NULL, 'month', 1, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_intro'), (SELECT id FROM "subscription_features" WHERE feature_key = 'courses_pre_recorded'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_youth'), (SELECT id FROM "subscription_features" WHERE feature_key = 'courses_pre_recorded'), true, NULL, NULL, 'Limited access + 30% discount', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_professionals'), (SELECT id FROM "subscription_features" WHERE feature_key = 'courses_pre_recorded'), true, NULL, NULL, 'Unlimited access + 20% discount', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_corporates'), (SELECT id FROM "subscription_features" WHERE feature_key = 'courses_pre_recorded'), true, NULL, NULL, '10% discount for registered org members', NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_intro'), (SELECT id FROM "subscription_features" WHERE feature_key = 'analytics_dashboard'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_youth'), (SELECT id FROM "subscription_features" WHERE feature_key = 'analytics_dashboard'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_professionals'), (SELECT id FROM "subscription_features" WHERE feature_key = 'analytics_dashboard'), true, NULL, NULL, 'Real-time analytics', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_corporates'), (SELECT id FROM "subscription_features" WHERE feature_key = 'analytics_dashboard'), true, NULL, NULL, 'Deep analytics', NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_intro'), (SELECT id FROM "subscription_features" WHERE feature_key = 'priority_support'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_youth'), (SELECT id FROM "subscription_features" WHERE feature_key = 'priority_support'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_professionals'), (SELECT id FROM "subscription_features" WHERE feature_key = 'priority_support'), true, NULL, NULL, 'Chatbot', NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_corporates'), (SELECT id FROM "subscription_features" WHERE feature_key = 'priority_support'), true, NULL, NULL, 'Chatbot', NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_intro'), (SELECT id FROM "subscription_features" WHERE feature_key = 'exclusive_partner_offers'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_youth'), (SELECT id FROM "subscription_features" WHERE feature_key = 'exclusive_partner_offers'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_professionals'), (SELECT id FROM "subscription_features" WHERE feature_key = 'exclusive_partner_offers'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_corporates'), (SELECT id FROM "subscription_features" WHERE feature_key = 'exclusive_partner_offers'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_intro'), (SELECT id FROM "subscription_features" WHERE feature_key = 'early_access_new_features'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_youth'), (SELECT id FROM "subscription_features" WHERE feature_key = 'early_access_new_features'), false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_professionals'), (SELECT id FROM "subscription_features" WHERE feature_key = 'early_access_new_features'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM "subscription_plans" WHERE plan_key = 'mentee_corporates'), (SELECT id FROM "subscription_features" WHERE feature_key = 'early_access_new_features'), true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
