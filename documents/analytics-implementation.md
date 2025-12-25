# Analytics Implementation

This document explains how analytics are implemented for the admin and mentor dashboards, including the data sources, API endpoints, and the exact analytical queries in use.

## Data Sources
- `users`, `user_roles`, `roles`: identify mentors vs mentees and block status.
- `sessions`: all mentorship sessions with status, scheduling, rate, and timestamps.
- `reviews`: mentee-submitted scores/feedback against mentors.
- `messages`: used to count unread items for mentors.
- `ai_chatbot_messages`: raw chat messages (and `metadata.eventType` for mentor exposure logging).
- `ai_chatbot_message_insights`: normalized questions/university searches extracted from chatbot messages.

## Admin Analytics
- **Client**: `app/admins/analytics/page.tsx` fetches `/api/analytics/admin` with a date range (default last 30 days).
- **Endpoint**: `app/api/analytics/admin/route.ts` orchestrates all queries and computes pct deltas vs the previous window.
- **KPI query** (`getAdminDashboardKpis` in `lib/db/queries/analytics.queries.ts`):
  - Builds `currentActiveMentees` / `previousActiveMentees` via a union of:
    1) mentees registered or updated in window,
    2) mentees who chatted with the AI (`ai_chatbot_messages` sender_type `user`),
    3) mentees who scheduled/in-progress/completed a session in window.
  - Sessions: counts created sessions in current vs previous window (mentor/mentee must not be blocked).
  - Average rating: AVG of mentee `reviews.final_score` for sessions created in window.
  - Paid conversion: uses mentor exposure/conversion helper:
    - Exposure = distinct users with `ai_chatbot_messages.metadata.eventType = 'mentors_shown'` in window.
    - Conversion = distinct `sessions.mentee_id` among exposed users with session status in (`scheduled`,`in_progress`,`completed`) in window.
    - Conversion rate = conversions / exposures.
- **Time series** (`getAdminSessionsOverTime`): groups session counts by `DATE(sessions.created_at)` within range; filters out blocked mentors/mentees.
- **Leaderboard** (`getAdminMentorLeaderboard`): mentors ordered by distinct completed session count desc, then AVG mentee rating desc; joins `user_roles`/`roles` to scope to mentors; excludes blocked users.
- **Top mentee questions** (`getTopMenteeQuestions`): aggregates `ai_chatbot_message_insights` rows where `is_question = true`, groups by `question_hash`/`question_text`, sums `frequency`, orders desc, limited (default 5).
- **Top universities** (`getTopUniversitiesSearched`): unnests `universities` arrays in `ai_chatbot_message_insights`, sums `frequency`, orders desc, limited (default 5).
- **Response shape**: KPIs (active mentees, sessions, paidConversionRate, averageSessionRating) plus `sessionsOverTime`, `mentorLeaderboard`, `topMenteeQuestions`, `topUniversities`, and a synthetic `conversionFunnell` block used by the client.

## Mentor Analytics
- **Client**: `components/mentor/dashboard/mentor-analytics-section.tsx` uses `useMentorAnalytics` hook to fetch `/api/analytics/mentor` with a date range (default last 90 days) and renders KPIs + charts.
- **Endpoint**: `app/api/analytics/mentor/route.ts` authenticates via `auth.api.getSession` (mentor inferred from server session, not the query string), then fans out queries.
- **KPI query** (`getMentorDashboardStats`):
  - Completed sessions: COUNT of mentor’s sessions with status `completed` (all time).
  - Upcoming sessions: COUNT of mentor’s sessions with status `scheduled` and `scheduled_at > now()`.
  - Total earnings: SUM of `rate` for mentor’s completed sessions (all time).
  - Period earnings: SUM of `rate` for mentor’s completed sessions whose `ended_at` falls inside the requested window.
  - Average rating / total reviews: AVG and COUNT of mentee reviews where `reviewee_id = mentor`.
  - Unread messages: COUNT of `messages` where `receiver_id = mentor` and `is_read = false`.
- **Earnings over time** (`getMentorEarningsOverTime`): groups completed sessions by `to_char(ended_at, 'YYYY-MM')`, summing `rate` inside the requested window for charting.
- **Upcoming/Recent sessions** (`getMentorRecentSessions`): latest sessions for the mentor (ordered by `scheduled_at` desc, limited to 5) with mentee name/avatar for the sidebar list.
- **Recent reviews** (`getMentorRecentReviews`): latest mentee reviews for the mentor (limit 5), returning rating, feedback, and timestamp.
- **Response shape**: KPIs (completed sessions, total/period earnings, averageRating, unreadMessages) plus `earningsOverTime`, normalized `upcomingSessions`, and `recentReviews`.

## Chatbot Insight Pipeline (feeds admin analytics)
- When a user sends a chatbot message, `/api/ai-chatbot-messages` persists it and calls `recordChatInsight` (`lib/chatbot/insights.ts`).
- `recordChatInsight`:
  - Runs heuristic extraction, optionally escalates to LLM classification (`@ai-sdk/google`) when heuristics are weak.
  - Persists only questions or university searches (`shouldPersist`), normalizing question text, hashing (for dedup), and storing any detected universities.
  - On duplicate hash, increments `frequency` and updates stored text/universities; otherwise inserts a new `ai_chatbot_message_insights` row.
- The admin queries (`getTopMenteeQuestions`, `getTopUniversitiesSearched`) operate directly on these aggregated insight rows.

## Additional Notes
- Date handling: all analytics queries convert request dates to ISO strings before embedding in raw SQL to avoid timezone drift.
- Mentor exposure tracking: the landing page logs `mentors_shown` exposures via `components/landing/hero-section.tsx`, which feed the paid conversion rate metric.
