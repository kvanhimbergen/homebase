# HomeBase - Family Budget Tracker

## Project Overview
Full-stack family budget tracker inspired by Monarch Money. Multi-tenant household finance management with AI-powered transaction classification.

## Tech Stack
- **Frontend**: Vite 7 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui (New York style)
- **Backend**: Supabase (Auth, PostgreSQL with RLS, Edge Functions, Storage)
- **State**: React Query (server), Zustand (UI)
- **Routing**: React Router v7 (lazy-loaded pages)
- **Charts**: Recharts
- **APIs**: Plaid (bank connections), OpenAI GPT-4o (AI classification + receipt OCR)
- **Deployment**: Railway

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint check
- `npx supabase db push` — Push migrations to Supabase
- `npx supabase functions serve` — Run edge functions locally

## Architecture
- `/src/components/` — Feature-organized components (auth, layout, dashboard, transactions, etc.)
- `/src/components/ui/` — shadcn/ui primitives (do not edit manually, use `npx shadcn@latest add`)
- `/src/hooks/` — React hooks (useAuth, useHousehold, etc.)
- `/src/services/` — Supabase data access layer
- `/src/lib/` — Clients, utils, constants, formatters
- `/src/stores/` — Zustand stores
- `/src/types/` — TypeScript type definitions
- `/supabase/migrations/` — Ordered SQL migration files (00001–00013)

## Key Patterns
- **RLS everywhere**: All tables use row-level security scoped to household_id
- **Multi-tenancy**: Users belong to households via household_members; use `user_household_ids()` function in RLS policies
- **Imports**: Use `@/` path alias for src-relative imports
- **Formatting**: Use formatters from `@/lib/formatters` (formatCurrency, formatDate, formatPercent)
- **Categories**: 12 system default categories seeded on household creation (see services/household.ts)
- **Category colors**: Use CATEGORY_COLORS from `@/lib/constants` for consistent palette across charts/badges
- **Transaction sources**: plaid | csv | ofx | email | manual | receipt — stored in `source` field
- **AI classification**: `classified_by` field tracks who categorized (user | ai | plaid), `ai_category_confidence` stores confidence

## Environment Variables
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key
- `SUPABASE_SERVICE_KEY` — Server-side service role key (edge functions only)
- `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` — Plaid API credentials
- `OPENAI_API_KEY` — OpenAI API key
- `VITE_APP_URL` — Public app URL

## Design System
- Primary accent: Teal (#0ea5e9)
- Dark sidebar: slate-900
- Content area: slate-50/white
- 12-color category palette defined in constants.ts
- Loading: skeleton shimmer (no spinners)
- Notifications: sonner toasts
