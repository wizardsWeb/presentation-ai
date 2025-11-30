# Repo quick-orientation for AI coding agents

This repository is a Next.js (App Router) application that generates AI-powered presentations.
Keep instructions short and refer to concrete files — this file is a compact guide for an AI agent to be productive quickly.

## Big picture

- Next.js app router under `src/app/` (server components + client components). Root layout/providers: `src/app/layout.tsx`.
- Server-side logic: Prisma + NextAuth. DB connection: `src/server/db.ts`. Auth config: `src/server/auth.ts` (NextAuth + Prisma adapter).
- Environment validation performed by `src/env.js` (uses `@t3-oss/env-nextjs`). Builds may set `SKIP_ENV_VALIDATION` to bypass strict checks.
- Presentation domain: UI components in `src/components/presentation/*`, editor in `src/components/presentation/editor/*`, presentation logic/hooks in `src/hooks/presentation/*` and `src/lib/presentation/*` (themes, parsers).
- Server actions and API routes:
  - Server actions (run on server via the app router) live in `src/app/_actions/` (e.g. `presentationActions.ts`). They use `"use server"` and call `auth()`/`db` directly.
  - REST/edge routes live in `src/app/api/` — e.g. streaming LLM generation: `src/app/api/presentation/generate/route.ts` and outline generation: `src/app/api/presentation/outline/route.ts`.

## Key workflows & commands

- Install dependencies: `pnpm install` (project expects pnpm).
- Run dev server: `pnpm dev` (Next 14 App Router).
- Apply Prisma schema to DB: `pnpm db:push`. Open Studio: `pnpm db:studio`.
- Postinstall runs `prisma generate` (see `package.json`).
- To skip env validation (useful in CI/docker): set `SKIP_ENV_VALIDATION=1` before `pnpm build`/`pnpm dev`.

## Project-specific conventions and patterns

- Server-only helpers are centralized: `src/server/{db.ts,auth.ts}` — prefer reusing `db` and `auth()` for authorization checks.
- Use Next.js server actions (`src/app/_actions/*`) for mutations triggered from the app router UI; these are declared with `"use server"` and expect `auth()` to return the current session.
- Presentation content is stored as JSON in Prisma (`prisma/schema.prisma` -> `Presentation.content: Json`) via `BaseDocument`/`Presentation` models — database shape is authoritative.
- LLM integrations use streaming and LangChain: edits to `src/app/api/presentation/generate/route.ts` must preserve the `LangChainAdapter` streaming pattern (changing to non-streaming requires coordinated client changes).
- Theme variables are set at runtime by `src/lib/presentation/themes.ts::setThemeVariables` — client-side code expects CSS variables present.

## Integration points & third-party dependencies

- Auth: NextAuth (see `src/server/auth.ts`) + Prisma adapter. Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
- AI: OpenAI / LangChain (`@langchain/*`, `ai`), Together AI (`TOGETHER_AI_API_KEY`) for images; see `src/app/api/presentation/generate/route.ts` for LLM usage.
- File uploads: UploadThing and `@uploadthing/react` are installed and used in UI components (search `Upload`/`uploadthing`).

## Editing guidance & safe-change checklist

- When changing API routes that stream (LangChainAdapter), keep the streaming interface intact or update all callers (client streaming UI + LangChain configuration).
- When touching auth or DB models: update `prisma/schema.prisma` and run `pnpm db:push` and `prisma generate` as needed.
- To add server actions, follow existing examples in `src/app/_actions/presentation/` — they are `async` server functions that use `auth()` and `db`.
- Avoid editing `src/env.js` schema lightly — it enforces required env variables used across the app.

## Quick examples

- To create a new presentation endpoint: add a route under `src/app/api/presentation/` and mirror streaming pattern from `generate/route.ts`.
- To update save logic: edit `src/app/_actions/presentation/presentationActions.ts` (contains `createPresentation`, `updatePresentation`, `getPresentationContent`).

---
If anything above is unclear or you need examples for a specific change, tell me which file/feature and I will expand. Feedback welcome — I can iterate on this file.
