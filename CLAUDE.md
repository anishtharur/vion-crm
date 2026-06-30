# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Critical: Next.js version

This repo runs **Next.js 16.2.9 with React 19**. APIs and conventions differ from older versions in training data. Before writing framework code (routing, caching, Server Actions, fonts, config), read the relevant guide under `node_modules/next/dist/docs/` and heed deprecation notices. This overrides assumptions from memory.

## Commands

```bash
npm run dev          # dev server (http://localhost:3000)
npm run build        # production build
npm run start        # serve production build
npm run lint         # eslint (flat config)

npm run db:push      # apply schema.ts to vion.db directly (no migration files)
npm run db:generate  # generate SQL migrations into ./drizzle (not currently used)
npm run db:studio    # drizzle-kit studio GUI
```

There is no test runner configured. The schema is applied via `db:push`; there is no `drizzle/` migrations folder and the DB self-seeds (see below), so no manual seed step is needed.

## Architecture

Single-user invoicing/CRM for "Vion Labs": clients → quotes → invoices → payments. Local-first, SQLite on disk (`vion.db` at repo root).

**Data flow is strictly one-directional and server-centric:**

- **`lib/db/`** — Drizzle ORM over `better-sqlite3` (synchronous). `index.ts` exports a single `db` connection cached on `globalThis` (survives HMR) and marked `server-only`. `schema.ts` is the single source of truth for tables and exported row types (`Client`, `Quote`, `Invoice`, etc.) plus status enums (`QUOTE_STATUSES`, `INVOICE_STATUSES`). `numbering.ts` generates per-year, per-prefix document numbers like `Q-2026-001`.
- **`lib/data/`** — Read functions (queries). All `server-only`, synchronous Drizzle calls. Return composed view types (e.g. `QuoteWithItems`, `QuoteListRow`). `getSettings()` lazily creates the single settings row (id=1) on first access — this is the seed mechanism.
- **`lib/actions/`** — `"use server"` Server Actions (mutations). Every action that backs a form returns `FormState` (`{ ok, message?, errors? }`) for `useActionState`. They parse `FormData` with a Zod schema, compute money totals, write inside `db.transaction(...)`, then `revalidatePath(...)` and `redirect(...)`. `_shared.ts` holds `readItemsJson`/`pruneItems` for the hidden `itemsJson` line-item payload.
- **`lib/validation/schemas.ts`** — Zod schemas + `FormState` type + `flattenErrors` (ZodError → `{ field: message }`). Quote/invoice schemas share `documentBase`.
- **`lib/utils/`** — Pure helpers safe on client and server. **`money.ts` is the single source of truth for all money math** (`computeTotals`, `lineTotal`, `round2`); forms (live preview), actions (persisted values), views, and dashboard all call it so numbers never diverge. `invoice-status.ts` derives display status (`overdue`/`paid`/`partial`) from dates + amount paid.

**App Router structure (`app/`):**

- `app/(app)/` — the main app, wrapped in `AppShell`. Its layout is `force-dynamic` and reads live settings. Routes: dashboard (`page.tsx`), `clients/`, `quotes/`, `invoices/`, `settings/`, each with `new/`, `[id]/`, `[id]/edit/`.
- `app/print/` — minimal print-optimized layout for `quotes/[id]` and `invoices/[id]` (PDF via browser print). Also `force-dynamic`.
- `app/layout.tsx` — root: fonts (Inter `--font-inter`, Poppins `--font-poppins`), global CSS.

**Components (`components/`):** `ui/` primitives (button, field, card, table, badge…), `forms/` client components, `documents/` shared quote/invoice view + status/print controls, `layout/` (`app-shell.tsx`, `nav.ts`), `dashboard/`. The big shared client component is `forms/document-form.tsx` — one form for both quotes and invoices (`kind: "quote" | "invoice"`), serializing line items into a hidden `itemsJson` input that the Server Action parses.

## Conventions

- **`@/` path alias** maps to repo root (`tsconfig.json`).
- Any module touching the DB or secrets imports `"server-only"` at the top. Keep DB access out of client components — pass plain data down as props.
- Server Actions take `(_prev, formData)` (or `(id, _prev, formData)` when bound); unused `_`-prefixed args are intentional and allowed by the lint config.
- Money is stored as `REAL` (decimal dollars), always rounded via `round2`. Don't do ad-hoc money math — route it through `lib/utils/money.ts`.
- Status flows: quote status is user-set; invoice display status is *derived* (`displayInvoiceStatus`) and recomputed after payments (`statusFromPayment`) — don't store `overdue`.
- Mutations that change multiple rows (document + line items, quote→invoice conversion) run inside `db.transaction(...)`; edits delete-and-reinsert line items rather than diffing.
