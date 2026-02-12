# Subscription Admin UI Guide (Business Users)

This guide explains how to create and manage subscription plans and features in the Admin UI for both mentees and mentors. It is written for business users and does not require technical knowledge.

If you follow the steps below, you will be able to:
- Create new subscription plans
- Set pricing (monthly/yearly or other intervals)
- Assign features and limits to each plan
- Publish or archive plans safely

---

## 1) Key Concepts (Read This First)

### 1.1 Plan Audience
Each plan is **either** for:
- **Mentees** (people who book mentors)
- **Mentors** (people who offer sessions)

Always pick the correct audience when creating a plan.

### 1.2 Feature Types
Each feature has a type, which determines how you set limits:
- **boolean**: On/Off only (example: "Mentor Profile")
- **count**: A numeric limit (example: "5 sessions")
- **minutes**: A time limit (example: "60 minutes")
- **text**: A label like "Unlimited" or "Limited"
- **amount**: A numeric value such as price or currency amount
- **percent**: A percentage value (example: "20% discount")
- **json**: Advanced configuration (avoid unless instructed)

### 1.3 Limit Fields
For count and minutes features:
- **limit_count** or **limit_minutes** = maximum usage
- **limit_interval** = day / week / month / year
- **limit_interval_count** = how many intervals

Examples:
- "10 messages per day" = limit_count 10, interval day, interval_count 1
- "20 sessions per 2 months" = limit_count 20, interval month, interval_count 2

---

## 2) Where to Manage Subscriptions

Open the Admin Dashboard:
- `Dashboard > Subscriptions`

Tabs:
- **Plans**: Create and manage plans
- **Features**: View and edit feature definitions
- **Subscriptions**: View current user subscriptions
- **Analytics**: Placeholder (not active yet)

---

## 3) Plan Setup Workflow (Recommended Order)

1. **Confirm features exist** (Features tab)
2. **Create a plan** (Plans tab)
3. **Add pricing** (Plan Pricing Editor)
4. **Assign features and limits** (Plan Feature Editor)
5. **Set plan status to Active** when ready

---

## 4) Creating a New Plan

Go to **Plans** tab and click **Create Plan**.

Fill in:
- **Plan Key**: lowercase with underscores (example: `mentee_youth`)
- **Audience**: mentor or mentee
- **Name**: displayed to users
- **Description**: short summary
- **Status**: use `draft` until ready

Save the plan. You can edit later.

---

## 5) Adding Plan Pricing

Open the plan and go to **Pricing**.

Required fields:
- **Price Type**: standard or introductory
- **Billing Interval**: month / year / week / day
- **Interval Count**: usually 1
- **Amount**: numeric price
- **Currency**: INR or USD
- **Active**: toggle on to show this price

Examples:
- Monthly standard price: 1999 INR, interval month, count 1
- Intro offer: price_type introductory, amount 499 INR

---

## 6) Assigning Features and Limits

Open the plan and go to **Features**.

For each feature:
1. Toggle **Included** on or off
2. Set limits depending on feature type
3. Save

Use these general patterns:
- **boolean**: Included = true/false, no limits
- **count**: limit_count + interval + interval_count
- **minutes**: limit_minutes + interval + interval_count
- **text**: use for "Unlimited" or "Limited"
- **percent**: use for discounts

---

## 7) Mentee Plans (Business Definition)

**Mentee Registration: FREE**

Plans:
- **Introduction Plan** (Free Trial)
- **Youth** (Rs 1,999/month)
- **Professionals** (Rs 4,999/month)
- **Corporates** (Rs 23,999/month, max 5 members)

Introductory Offer (price_type: introductory):
- Intro: FREE
- Youth: Rs 499
- Professionals: Rs 999
- Corporates: Rs 9,999

### Mentee Feature Mapping
Use the feature keys below in the Plan Feature Editor:

| Feature | Key | Type | Limit Guidance |
|---|---|---|---|
| Individual Profile Page | `mentee_profile_access` | boolean | Included = true |
| Company Page | `company_page_access` | boolean | Included = true |
| AI Search (sessions) | `ai_search_sessions_monthly` | count | limit_count + interval month |
| Free 1:1 Video Call | `free_video_sessions_monthly` | count/minutes | limit_count + limit_minutes |
| Paid 1:1 Video Calls | `paid_video_sessions_monthly` | count | limit_count + interval month |
| Counseling Sessions | `counseling_sessions_monthly` | count | limit_count + interval month |
| Create & Post Content | `content_posting_access` | text | "Unlimited" |
| Roadmap Download | `roadmap_download_access` | text | "Unlimited" |
| Knowledge Hub Access | `knowledge_hub_access_level` | text | "Limited" or "Unlimited" |
| Industry Expert Access | `industry_expert_access_level` | text | "Limited" or "Unlimited" |
| AI Booking Special Rate | `paid_video_sessions_monthly` | amount | `limit_amount` defines the hourly price used when an AI search booking is created (only applies when `bookingSource=ai`). |
| Live Sessions | `live_sessions_count_monthly` | count | limit_count + interval month |
| Courses Access | `courses_access_level` | text | "Limited" or "Unlimited" |
| Course Discount | `course_discount_percent` | percent | 10 / 20 / 30 |
| Analytics Access | `analytics_access_level` | text | "Real-time" or "Deep" |
| Priority Support | `priority_support` | text | "Chatbot" |
| Partner Offers | `exclusive_partner_offers_access` | boolean | Included = true |
| Early Access | `early_access_features` | boolean | Included = true |
| Team Member Limit | `team_member_limit` | count | Corporates only |

### Mentee Limits (By Plan)

Use this section to fill numeric limits in the Plan Feature Editor.

**Introduction Plan**
- AI Search: 3 sessions/month
- Free Video: 1 session, 30 minutes
- Paid Video: 1 session/month
- Counseling: Limited (use text if needed)
- Live Sessions: none
- Courses: none
- Analytics: none

**Youth**
- AI Search: 10 sessions/month
- Free Video: 1 session, 30 minutes
- Paid Video: 5 sessions/month
- Counseling: 5 sessions/month
- Live Sessions: 1 session/month
- Courses: limited + 30% discount
- Analytics: none

**Professionals**
- AI Search: 20 sessions/month
- Free Video: 1 session, 30 minutes
- Paid Video: 8 sessions/month
- Counseling: 10 sessions/month
- Live Sessions: 2 sessions/month
- Courses: unlimited + 20% discount
- Analytics: Real-time

**Corporates**
- AI Search: Unlimited (use text "Unlimited")
- Free Video: 1 session for 1 member, 30 minutes
- Paid Video: 10 sessions/month
- Counseling: none
- Live Sessions: 2 sessions/month
- Courses: 10% discount
- Analytics: Deep
- Team Member Limit: 5

---

## 8) Mentor Plans (Business Definition)

**Verification & Registration: Rs 5,000**

Plans:
- **Silver** (Rs 999/month)
- **Gold** (Rs 2,999/month)
- **Platinum** (Rs 4,999/month)
- **Diamond** (Rs 9,999/month)
- **Consulting Org** (Rs 19,999/month)

Introductory Offer (price_type: introductory):
- Silver: FREE
- Gold: Rs 999
- Platinum: Rs 1,999
- Diamond: Rs 2,999
- Consulting Org: Rs 9,999

### Mentor Feature Mapping
Use the feature keys below in the Plan Feature Editor:

| Feature | Key | Type | Limit Guidance |
|---|---|---|---|
| Mentor Profile | `mentor_profile_access` | boolean | Included = true |
| Company Page | `company_page_access` | boolean | Included = true |
| AI Profile Appearances | `ai_profile_appearances_monthly` | count | limit_count + interval month |
| Lead Qualifying Session | `lead_qualifying_session_minutes` | minutes | limit_minutes |
| Paid Video Sessions | `mentor_sessions_monthly` | count | limit_count + interval month |
| Session Duration | `session_duration_minutes` | minutes | limit_minutes |
| Create & Post Content | `content_posting_access` | text | "Unlimited" |
| Roadmap Upload | `roadmap_upload_access` | text | "Unlimited" |
| Knowledge Hub Access | `knowledge_hub_access_level` | text | "Limited" or "Unlimited" |
| Industry Expert Listing | `industry_expert_listing_limit` | count | limit_count |
| Roadmap Download | `roadmap_download_access` | count/text | limit_count or "Unlimited" |
| Live Sessions | `live_sessions_minutes_monthly` | minutes | limit_minutes + interval month |
| Course Videos | `course_videos_monthly` | count | limit_count + interval month |
| Analytics Access | `analytics_access_level` | text | "Real-time" or "Deep" |
| Priority Support | `priority_support` | text | "Chatbot" |
| Partner Offers | `exclusive_partner_offers_access` | boolean | Included = true |
| Early Access | `early_access_features` | boolean | Included = true |

### Mentor Limits (By Plan)

Use this section to fill numeric limits in the Plan Feature Editor.

**Silver**
- AI Appearances: Limited (use text or small count)
- Lead Session: 30 minutes
- Paid Video: 1 session/month (45 min)
- Live Sessions: none
- Course Videos: none
- Analytics: none

**Gold**
- AI Appearances: 25/month
- Lead Session: 30 minutes
- Paid Video: 5 to 10 sessions/month (set the exact approved limit)
- Live Sessions: none
- Course Videos: none
- Analytics: none

**Platinum**
- AI Appearances: 100/month
- Lead Session: 30 minutes
- Paid Video: 10 to 20 sessions/month (set approved limit)
- Live Sessions: 2 hours/month
- Course Videos: 2 videos/month
- Analytics: Real-time
- Industry Listing: 1 category
- Roadmap Download: 1 category

**Diamond**
- AI Appearances: Unlimited (use text "Unlimited")
- Lead Session: 30 minutes
- Paid Video: 20 to 30 sessions/month (set approved limit)
- Live Sessions: 4 hours/month
- Course Videos: 5 videos/month
- Analytics: Deep
- Partner Offers + Early Access: included

**Consulting Org**
- AI Appearances: Unlimited
- Lead Session: 30 minutes
- Paid Video: 25 sessions/month (60 min)
- Live Sessions: 4 hours/month
- Course Videos: 5 videos/month
- Analytics: Deep

---

## 9) Publishing Checklist

Before setting a plan to **Active**:
- All features are assigned
- All limits are filled
- Pricing is configured and active
- Introductory price (if used) is present
- Plan key and name match business naming

---

## 10) Common Mistakes to Avoid

- Using the wrong audience (mentor vs mentee)
- Forgetting interval settings on count/minutes features
- Setting "Unlimited" as a number instead of text
- Activating plans before limits are fully set

---

## 11) Support

If you are unsure about a limit or feature:
- Ask the product owner before saving the plan
- Use `draft` status until confirmed
