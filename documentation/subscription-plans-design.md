# Mentee Subscription Plans - Design & Implementation Guide

## 1. Overview
This document outlines the design and implementation strategy for introducing a Subscription System for Mentees on the SharingMinds platform. The goal is to present a clear, attractive pricing page allowing mentees to upgrade from a Free plan to paid tiers.

## 2. Navigation & Access
Mentees will access the subscription page via the main dashboard sidebar.

*   **Entry Point**: New **"Subscriptions"** item in the `UserSidebar`.
*   **Icon**: `Sparkles` or `CreditCard` (Lucide React).
*   **Position**: Between "Sessions" and "Profile".
*   **URL Structure**: `/dashboard?section=subscription` (Leveraging existing query-param based routing).

## 3. Page Layout & UI Design
The detailed subscription view will be implemented as a new section component, styled with **Shadcn UI** and **Tailwind CSS**, consistent with `globals.css`.

### 3.1 Header Section
*   **Title**: "Upgrade your Learning Journey"
*   **Subtitle**: "Choose a plan that fits your growth needs. Unlock more sessions and exclusive features."
*   **Visual**: potentially a toggle for "Monthly" vs "Yearly" (visual only for now).

### 3.2 Plan Cards Layout
A responsive grid (1 col mobile, 4 cols desktop) displaying the Free tier + 3 Paid Tiers.

#### Card Component Structure (`PlanCard`)
*   **Header**:
    *   Plan Name (e.g., "Explorer", "Growth", "Mastery").
    *   Price Display (e.g., "$0/mo", "$29/mo").
    *   Description (Short blurp).
*   **Features List**:
    *   Checkmark icon (`Check` from lucide) for included features.
    *   Grayed out text for excluded features (optional).
*   **Call to Action (CTA)**:
    *   **Free**: "Current Plan" (Disabled/Ghost button).
    *   **Paid**: "Upgrade Now" or "Choose Plan" (Primary Gradient Button).
*   **Highlight**: The "Popular" tier (e.g., Middle paid tier) will have a distinct border or badge and slightly elevated shadow (Shadcn `Card` with `border-primary`).

### 3.3 Proposed Tiers (Mock Data)
| Feature | Free | Starter | Pro (Recommended) | Elite |
| :--- | :--- | :--- | :--- | :--- |
| **Price** | $0 | $29/mo | $79/mo | $199/mo |
| **Sessions** | Pay-as-you-go | 2 Free/mo | 5 Free/mo | Unlimited |
| **Messaging** | Standard | Priority | Priority | 24/7 Access |
| **Resources** | Public only | Access to Library | + Workshop Access | + 1-on-1 Coaching |
| **Fee** | 10% Platform Fee | 5% Fee | 0% Fee | 0% Fee |

## 4. Technical Implementation Changes

### 4.1 Frontend Components
1.  **Update `UserSidebar`**:
    *   File: `components/mentee/sidebars/user-sidebar.tsx`
    *   Action: Add `subscription` item to `menuItems`.

2.  **Update `DashboardShell`**:
    *   File: `components/dashboard/dashboard-shell.tsx`
    *   Action: Add `case "subscription"` to render the `SubscriptionPlans` component.

3.  **Create `SubscriptionPlans` Component**:
    *   File: `components/mentee/subscriptions/subscription-plans.tsx` (New Directory)
    *   Content: Main layout, mapping through plan data.

4.  **Create `PlanCard` Component**:
    *   File: `components/mentee/subscriptions/plan-card.tsx`
    *   Content: Individual card UI using `Card`, `CardHeader`, `CardContent`, `CardFooter`, `Button`, `Badge`.

### 4.2 Database (Future Context)
*   **Future Requirement**: A table to track `user_subscriptions` (user_id, plan_id, start_date, end_date, status).
*   **Current Action**: None (UI uses static mock data).

## 5. Visual Style Guide (Shadcn/Tailwind)
*   **Colors**: Use `bg-card` for cards, `text-foreground` for text.
*   **Accents**: Use `primary` and `ring` variables for focus states and primary buttons.
*   **Dark Mode**: Ensure `dark:` variants are handled (standard in existing components).
*   **Gradients**: Use subtle gradients for the "Recommended" plan header to make it pop (e.g., `bg-gradient-to-r from-blue-600 to-indigo-600`).
