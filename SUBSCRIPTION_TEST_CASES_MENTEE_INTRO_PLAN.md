# Mentee Plan Test Cases: Introduction Plan (Free Trial)

This document is a reusable template for subscription plan testing. It is written for the **Introduction Plan (Free Trial for Everyone)** in the Mentee Subscription Plan table. Copy this file and replace plan-specific limits when testing other plans.

## 1) Test Scope

**Plan under test:** Introduction Plan (Mentee)  
**Audience:** Mentee  
**Assumptions:**  
- Subscription is active and assigned to the test user.  
- Feature limits are configured in the admin UI for this plan.  
- All tests are executed with a clean usage period (no prior usage events).  

## 2) Plan Limits (Fill From Admin)

Fill these from the admin configuration before testing:

- `ai_search_sessions_monthly`: ___3___
- `free_video_sessions_monthly`: ______ (minutes limit, if any): ______
- `paid_video_sessions_monthly`: ______
- `counseling_sessions_monthly`: ______
- `knowledge_hub_access_level`: Limited / Unlimited: ______
- `industry_expert_access_level`: Limited / Unlimited: ______
- `live_sessions_count_monthly`: ______
- `courses_access`: Limited / Unlimited: ______
- `course_discount_percent`: ______
- `analytics_access_level`: Real-time / Deep: ______
- `priority_support`: ______
- `exclusive_partner_offers_access`: Yes / No: ______
- `early_access_features`: Yes / No: ______

## 3) Test Data Setup

**Users**
- Mentee test user: ______________________
- Mentor test user: ______________________

**Preconditions**
- Mentee has an active subscription on Introduction Plan.
- Mentor has an active subscription with session availability enabled.
- Mentee usage counters are reset (no usage in current period).
- Mentor usage counters are reset (to avoid mentor-side blocks).

## 4) Core Test Cases (Introduction Plan)

Use the following template for each test case:

**TC-ID:**  
**Title:**  
**Feature key:**  
**Endpoint / UI path:**  
**Preconditions:**  
**Steps:**  
**Expected result:**  
**Notes / Evidence:**  

### 4.1 AI Search (Mentee)

**TC-INTRO-AI-001**  
**Title:** AI search allowed within limit  
**Feature key:** `ai_search_sessions_monthly`  
**Endpoint / UI path:** `GET /api/public-mentors?ai=true`  
**Preconditions:** Usage = 0  
**Steps:**  
1) Call the endpoint as the mentee.  
2) Repeat until reaching the plan limit.  
**Expected result:**  
- Requests succeed until the limit is reached.  
- Each call increments usage by 1.  

**TC-INTRO-AI-002**  
**Title:** AI search blocked after limit  
**Feature key:** `ai_search_sessions_monthly`  
**Endpoint / UI path:** `GET /api/public-mentors?ai=true`  
**Preconditions:** Usage = limit  
**Steps:**  
1) Call the endpoint once more.  
**Expected result:**  
- 403 response with clear error.  
- `upgrade_required` if the endpoint returns it.  

### 4.2 Free 1:1 Video Call (Mentee)

**TC-INTRO-FREE-001**  
**Title:** Free session can be booked within limit  
**Feature key:** `free_video_sessions_monthly`  
**Endpoint / UI path:** `POST /api/bookings`  
**Preconditions:** Usage = 0  
**Steps:**  
1) Create a booking with `sessionType=FREE` and duration within allowed minutes.  
**Expected result:**  
- Booking created.  
- Usage increments by 1.  

**TC-INTRO-FREE-002**  
**Title:** Free session blocked after limit  
**Feature key:** `free_video_sessions_monthly`  
**Endpoint / UI path:** `POST /api/bookings`  
**Preconditions:** Usage = limit  
**Steps:**  
1) Create another booking with `sessionType=FREE`.  
**Expected result:**  
- 403 response with limit-reached error.  

**TC-INTRO-FREE-003**  
**Title:** Free session duration limit enforced  
**Feature key:** `free_video_sessions_monthly`  
**Endpoint / UI path:** `POST /api/bookings`  
**Preconditions:** Duration limit configured  
**Steps:**  
1) Attempt booking with duration above the plan limit.  
**Expected result:**  
- 403 response with duration limit error.  

### 4.3 Paid 1:1 Video Calls (Mentee)

**TC-INTRO-PAID-001**  
**Title:** Paid session can be booked within limit  
**Feature key:** `paid_video_sessions_monthly`  
**Endpoint / UI path:** `POST /api/bookings`  
**Preconditions:** Usage = 0  
**Steps:**  
1) Create a booking with `sessionType=PAID`.  
**Expected result:**  
- Booking created.  
- Usage increments by 1.  

**TC-INTRO-PAID-002**  
**Title:** Paid session blocked after limit  
**Feature key:** `paid_video_sessions_monthly`  
**Endpoint / UI path:** `POST /api/bookings`  
**Preconditions:** Usage = limit  
**Steps:**  
1) Create another booking with `sessionType=PAID`.  
**Expected result:**  
- 403 response with limit-reached error.  

### 4.4 Counseling Sessions (Mentee)

**TC-INTRO-COUNSEL-001**  
**Title:** Counseling session obeys limits  
**Feature key:** `counseling_sessions_monthly`  
**Endpoint / UI path:** `POST /api/bookings`  
**Preconditions:** Usage = 0  
**Steps:**  
1) Create a booking with `sessionType=COUNSELING`.  
**Expected result:**  
- Booking created.  
- Usage increments by 1.  

**TC-INTRO-COUNSEL-002**  
**Title:** Counseling session blocked after limit  
**Feature key:** `counseling_sessions_monthly`  
**Endpoint / UI path:** `POST /api/bookings`  
**Preconditions:** Usage = limit  
**Steps:**  
1) Create another booking with `sessionType=COUNSELING`.  
**Expected result:**  
- 403 response with limit-reached error.  

### 4.5 Courses / Pre-recorded Sessions

**TC-INTRO-COURSE-001**  
**Title:** Course enrollment respects access level  
**Feature key:** `courses_access`  
**Endpoint / UI path:** `POST /api/courses/[id]/enroll`  
**Preconditions:** Course exists and is published  
**Steps:**  
1) Attempt enrollment.  
**Expected result:**  
- Allowed if access level includes courses.  
- 403 if plan disallows courses.  

**TC-INTRO-COURSE-002**  
**Title:** Course enrollment limit enforced when limited  
**Feature key:** `free_courses_limit`  
**Endpoint / UI path:** `POST /api/courses/[id]/enroll`  
**Preconditions:** Access level is Limited and usage = limit  
**Steps:**  
1) Attempt enrollment again.  
**Expected result:**  
- 403 response with limit-reached error.  

### 4.6 Analytics

**TC-INTRO-ANALYTICS-001**  
**Title:** Analytics access obeys plan access  
**Feature key:** `analytics_access_level`  
**Endpoint / UI path:** `GET /api/student/learning-analytics`  
**Preconditions:** None  
**Steps:**  
1) Call the endpoint.  
**Expected result:**  
- 200 if analytics included.  
- 403 if not included.  

## 5) Negative / Edge Cases

**TC-INTRO-EDGE-001**  
**Title:** Unauthenticated access blocked  
**Endpoints / UI path:** Any gated endpoint above  
**Steps:**  
1) Call endpoints without auth.  
**Expected result:** 401 Unauthorized  

**TC-INTRO-EDGE-002**  
**Title:** Mentee blocked when mentor hits mentor-session limit  
**Feature key:** `mentor_sessions_monthly`  
**Endpoint / UI path:** `POST /api/bookings`  
**Preconditions:** Mentor usage = limit  
**Steps:**  
1) Book any session with the mentor.  
**Expected result:**  
- 403 response (mentor limit reached).  

## 6) Evidence Log (Fill During Testing)

- Test run date: __________  
- Tester: __________  
- Environment: __________  
- Notes: __________  
