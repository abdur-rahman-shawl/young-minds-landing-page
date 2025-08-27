# GEMINI.md: Project Overview and Development Guide

## 1. Project Overview

This is a Next.js web application that serves as a platform to connect mentors and mentees. The application is built with a modern tech stack, including:

*   **Framework:** Next.js
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS with Shadcn/UI
*   **Database:** PostgreSQL with Drizzle ORM
*   **Authentication:** `better-auth`
*   **State Management:** React Query
*   **AI:** Google Generative AI

## 2. Building and Running

To get the project up and running, you will need to have Node.js and pnpm installed. You will also need a PostgreSQL database.

1.  **Install dependencies:**

    ```bash
    pnpm install
    ```

2.  **Set up environment variables:**

    Create a `.env.local` file in the root of the project and add the following environment variables:

    ```
    DATABASE_URL="your-postgresql-connection-string"
    GOOGLE_CLIENT_ID="your-google-client-id"
    GOOGLE_CLIENT_SECRET="your-google-client-secret"
    NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
    ```

3.  **Run database migrations:**

    ```bash
    pnpm run db:push
    ```

4.  **Run the development server:**

    ```bash
    pnpm run dev
    ```

    The application will be available at `http://localhost:3000`.

### Key `package.json` Scripts

*   `dev`: Starts the development server.
*   `build`: Builds the application for production.
*   `start`: Starts the production server.
*   `lint`: Lints the code using Next.js's built-in ESLint configuration.
*   `db:generate`: Generates Drizzle ORM migration files.
*   `db:migrate`: Applies database migrations.
*   `db:push`: Pushes schema changes to the database without generating migrations.
*   `db:studio`: Opens the Drizzle Studio to inspect the database.

## 3. Development Conventions

*   **TypeScript:** The entire codebase is written in TypeScript. Please follow TypeScript best practices and ensure that all new code is strongly typed.
*   **Components:** Components are organized by feature in the `components/` directory. Reusable UI components are located in `components/ui/` and are based on Shadcn/UI.
*   **Styling:** The project uses Tailwind CSS for styling. Please use Tailwind utility classes whenever possible and avoid writing custom CSS.
*   **State Management:** Server state is managed with React Query. Use React Query's hooks (`useQuery`, `useMutation`, etc.) for all data fetching and caching.
*   **Database:** The database schema is defined in `lib/db/schema/`. Use Drizzle ORM for all database interactions.
*   **Authentication:** Authentication is handled by the `better-auth` library. The authentication configuration is in `lib/auth.ts`.
*   **API Routes:** API routes are located in the `app/api/` directory and are organized by feature.
