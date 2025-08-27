
# Project Overview: Mentor-Mentee Connect Platform

## 1. High-Level Architecture

This project is a web application built on a modern technology stack, designed to connect mentors and mentees. The platform is developed using **Next.js**, a React framework for building server-rendered and statically generated applications.

The key technologies used in this project are:

*   **Framework:** Next.js (v15.2.4)
*   **Language:** TypeScript
*   **UI:** Tailwind CSS with Shadcn/UI and Radix UI components
*   **State Management:** React Query for server state management
*   **Database:** PostgreSQL with Drizzle ORM for database acccreatess
*   **Authentication:** `better-auth` library
*   **Form Handling:** React Hook Form and Zod for validation
*   **AI/Chatbot:** Google Generative AI for chatbot functionality

## 2. Directory Structure

The project follows a standard Next.js project structure, with some additional directories for project-specific features.

*   `app/`: This directory contains the core application code, with subdirectories for different pages and API routes.
    *   `app/api/`: Contains all the API routes for the application, organized by feature.
    *   `app/auth/`: Contains the authentication-related pages.
    *   `app/dashboard/`: Contains the user dashboard pages.
*   `components/`: This directory contains all the reusable React components, organized by feature.
*   `lib/`: This directory contains the core business logic, database schema, and utility functions.
    *   `lib/db/`: Contains the Drizzle ORM schema and migration files.
    *   `lib/auth.ts`: Contains the authentication logic.
*   `public/`: This directory contains all the static assets, such as images and fonts.
*   `scripts/`: This directory contains various scripts for database seeding, migrations, and other tasks.

## 3. Authentication and Authorization

User authentication is handled by the `better-auth` library. The authentication logic is implemented in `lib/auth.ts` and the authentication-related pages are in `app/auth/`. The platform supports different user roles, such as `mentor`, `mentee`, and `admin`. Authorization is implemented based on these roles to control access to different parts of the application.

## 4. Database

The application uses a PostgreSQL database to store all the data. The database schema is defined using Drizzle ORM in the `lib/db/schema/` directory. Database migrations are managed using `drizzle-kit` and are stored in the `lib/db/migrations/` directory.

The `drizzle.config.ts` file contains the configuration for Drizzle, including the database connection string, which is stored in the `DATABASE_URL` environment variable.

## 5. Key Features

The platform provides a range of features for both mentors and mentees:

*   **User Authentication:** Secure user registration and login for mentors and mentees.
*   **User Roles:** Different roles for mentors, mentees, and admins with different levels of access.
*   **Mentor Profiles:** Mentors can create and manage their profiles, including their expertise, availability, and rates.
*   **Mentee Dashboards:** Mentees can view their dashboard, search for mentors, and book sessions.
*   **Session Booking:** Mentees can book sessions with mentors based on their availability.
*   **Messaging:** A real-time messaging system for mentors and mentees to communicate.
*   **AI Chatbot:** An AI-powered chatbot to assist users with their queries.

## 6. Scripts and Tooling

The `package.json` file contains a set of scripts for managing the project:

*   `dev`: Starts the development server.
*   `build`: Builds the application for production.
*   `start`: Starts the production server.
*   `lint`: Lints the codebase for errors.
*   `db:generate`: Generates database migration files based on the schema.
*   `db:migrate`: Applies the database migrations.
*   `db:push`: Pushes the database schema to the database.
*   `db:studio`: Opens the Drizzle Studio to view and manage the database.
*   `db:seed`: Seeds the database with sample data.

This overview should provide a comprehensive understanding of the project's architecture, features, and codebase.
