# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages and `app/api/**/route.ts` handlers.
- `components/`: Reusable UI and feature components (`.tsx`, PascalCase).
- `lib/`: Utilities, auth, data access, validations (`zod`), and `lib/db/**`.
- `hooks/`, `providers/`, `contexts/`: React hooks and context providers.
- `public/`: Static assets (images, uploads).
- `styles/`: Global Tailwind CSS.
- `scripts/`: One-off scripts (seeding, migrations, test helpers).
- Config: `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `drizzle.config.ts`.

## Build, Test, and Development Commands
- `pnpm dev` (or `npm run dev`): Run the app locally.
- `pnpm build`: Production build via Next.js.
- `pnpm start`: Start built app.
- `pnpm lint`: Lint with Next/ESLint.
- DB: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:push`, `pnpm db:seed` (Drizzle).

## Coding Style & Naming Conventions
- TypeScript, 2-space indent, single quotes preferred; keep imports sorted.
- Components: PascalCase files in `components/` (e.g., `UserCard.tsx`).
- Hooks: `use-` prefix in `hooks/` (e.g., `use-sessions.ts`).
- API routes: `app/api/<segment>/route.ts` with small, focused handlers.
- Validations: co-locate in `lib/validations/` with `zod` schemas.
- Run `pnpm lint` before commit; Tailwind utility-first classes in JSX.

## Testing Guidelines
- No formal test runner configured; follow `TESTING_GUIDE.md` for manual flows.
- Prefer small, testable functions in `lib/` and hooks with clear inputs/outputs.
- If adding tests, use `*.test.ts` or `*.spec.tsx` and keep colocated near code.

## Commit & Pull Request Guidelines
- Commits: short, imperative subject (≤72 chars). Example: `Add mentor availability API`.
- Optional: Conventional Commits (`feat:`, `fix:`, `chore:`) are welcome.
- PRs: include summary, linked issues, screenshots for UI, and test/QA notes.
- Checks: ensure `pnpm lint` and `pnpm build` pass; include env/setup steps if needed.

## Security & Configuration Tips
- Use `.env.local` for secrets (DB URL, Supabase, mail, rate-limit keys). Generate with `node generate-secret.js` when appropriate.
- Never commit real secrets or `public/uploads` PII.

## Agent-Specific Instructions
- Keep changes minimal and scoped; don’t refactor unrelated modules.
- Follow the structure above; prefer existing patterns over new abstractions.
- Touch only files relevant to the task and update docs when behavior changes.
