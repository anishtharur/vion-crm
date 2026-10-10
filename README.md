# Vion CRM

A CRM and invoicing app for managing clients, quotes, sales orders, pro-forma
invoices, invoices, and payment receipts. It uses Next.js 16, Drizzle, and
SQLite. Production can keep SQLite on a single VM or use Turso/libSQL.

## Requirements

- Node.js 22 LTS
- npm

## Local development

```bash
npm ci
npm run db:push
npm run dev
```

The default database is `./vion.db`. To use a different local SQLite file, set
`DATABASE_PATH`. To use a Turso database, set `DATABASE_URL` and
`DATABASE_AUTH_TOKEN`; `DATABASE_URL` takes precedence over `DATABASE_PATH`.

Production authentication requires `SESSION_SECRET` and `AUTH_USERS`. See
`.env.example` for the environment variable descriptions.

## Commands

```bash
npm run dev          # local development server
npm run lint         # ESLint
npm run build        # production build
npm run db:push      # apply the Drizzle schema to the configured database
npm run db:import -- ./vion-backup.db  # import SQLite data into an empty target
npm run auth:hash -- "your password"   # create an AUTH_USERS password hash
```

The importer requires `DATABASE_URL` (and a Turso token for cloud databases),
preserves IDs, and refuses to import if any destination application table is
populated. Back up the source first and verify imported counts before cutover.

## Deployment

See [DEPLOY.md](DEPLOY.md) for the Oracle Cloud Always Free VM + SQLite setup,
PDF/Chromium configuration, domain/TLS setup, and database recovery guidance.
