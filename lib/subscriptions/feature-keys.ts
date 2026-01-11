export const FEATURE_KEYS = {
    MENTOR_SESSIONS_MONTHLY: 'mentor_sessions_monthly',
    SESSION_DURATION_MINUTES: 'session_duration_minutes',
    DIRECT_MESSAGES_DAILY: 'direct_messages_daily',
    MESSAGE_REQUESTS_DAILY: 'message_requests_daily',
    AI_HELPER_CHAT_ACCESS: 'ai_helper_chat_access',
    AI_HELPER_MESSAGES_LIMIT: 'ai_helper_messages_limit',
    FREE_COURSES_LIMIT: 'free_courses_limit',
    SESSION_RECORDINGS_ACCESS: 'session_recordings_access',
    // Admin/System features
    PLATFORM_FEE_PERCENTAGE: 'platform_fee_percentage',
    MAX_MENTEES_LIMIT: 'max_mentees_limit',
    PROFILE_VERIFICATION_PRIORITY: 'profile_verification_priority',
    FEATURED_MENTOR_LISTING: 'featured_mentor_listing',
    ANALYTICS_ACCESS_LEVEL: 'analytics_access_level',
    CUSTOM_BRANDING: 'custom_branding',
    PRIORITY_SUPPORT: 'priority_support',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];
