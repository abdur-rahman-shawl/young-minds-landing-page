# High-Level Design (HLD)

## 1. Overview

This document outlines the high-level design and architecture of the Young Minds platform, a web application designed to connect mentors and mentees. The platform provides features for user authentication, mentor discovery, session booking, messaging, and online courses.

## 2. System Architecture

The application is a modern full-stack web application built on the following core technologies:

*   **Framework:** Next.js (React)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS with Shadcn/UI
*   **Database:** PostgreSQL with Drizzle ORM
*   **Authentication:** `better-auth`

The architecture is a client-server model, with the Next.js application serving both the frontend (React components) and the backend (API routes).

## 3. Frontend

The frontend is built with React and Next.js, providing a dynamic and responsive user experience. The UI is styled with Tailwind CSS and uses Shadcn/UI for a consistent and modern look and feel.

### Key Pages and Routes:

*   `/`: The landing page.
*   `/auth/signin`: User sign-in page.
*   `/auth/signup`: User sign-up page.
*   `/dashboard`: User dashboard.
*   `/mentors`: Browse and search for mentors.
*   `/mentor/[id]`: Mentor profile page.
*   `/courses`: Browse online courses.
*   `/session`: Video conferencing page for mentor-mentee sessions.
*   `/messages`: Private messaging between users.

### Component Structure:

The components are organized by feature in the `components/` directory. Reusable UI components are located in `components/ui/`.

## 4. Backend

The backend is implemented using Next.js API routes, located in the `app/api/` directory. It handles all business logic, database interactions, and communication with external services.

### Key API Endpoints:

*   `api/auth/*`: Handles user authentication, including sign-up, sign-in, and email verification.
*   `api/mentors/*`: Provides endpoints for fetching mentor data, including profiles and availability.
*   `api/bookings/*`: Manages the booking of sessions between mentors and mentees.
*   `api/courses/*`: Handles course-related operations, including enrollment.
*   `api/messages/*`: Powers the real-time messaging feature.
*   `api/livekit/*`: Manages video and audio communication for sessions using the LiveKit API.
*   `api/admin/*`: Provides endpoints for administrative functionalities.

## 5. Database

The application uses a PostgreSQL database, with the schema managed by Drizzle ORM. The schema is defined in the `lib/db/schema/` directory.

### Key Database Tables:

*   `users`: Stores user information, including their roles.
*   `mentors`: Stores detailed information about mentors, including their expertise and availability.
*   `mentees`: Stores information about mentees.
*   `sessions`: Stores information about booked sessions.
*   `courses`: Stores information about the online courses.
*   `enrollments`: Tracks user enrollment in courses.
*   `messages`: Stores chat messages between users.
*   `reviews`: Stores reviews and ratings for mentors.

## 6. Authentication

Authentication is handled by the `better-auth` library. It supports email/password-based authentication and social logins. The authentication configuration is located in `lib/auth.ts`. The system uses a role-based access control (RBAC) system, with roles such as `user`, `mentor`, and `admin`.

## 7. Key Features

*   **User Authentication:** Secure sign-up and sign-in for users.
*   **Mentor Search:** Mentees can search for mentors based on various criteria.
*   **Session Booking:** Mentees can book sessions with mentors based on their availability.
*   **Real-time Messaging:** Users can communicate with each other in real-time.
*   **Video Conferencing:** Integrated video calls for mentor-mentee sessions using LiveKit.
*   **Online Courses:** A learning platform with courses that users can enroll in.
*   **Admin Dashboard:** A dashboard for administrators to manage the platform.