# Farmco

Poultry farm inventory for a single farm organization. Record birds, eggs, and feed; manage egg orders; view stats; work offline on a phone when signal drops.

Development plan: [`.cursor/plans/farmco-development-plan.md`](.cursor/plans/farmco-development-plan.md)  
PRD: [`.cursor/prd/poultry-farm-inventory-prd.md`](.cursor/prd/poultry-farm-inventory-prd.md)  
Brand guide: [`.cursor/design/poultry-brand-design-guide.html`](.cursor/design/poultry-brand-design-guide.html)

## Stack

- **Backend:** AdonisJS 6, Lucid, PostgreSQL, Redis (`@adonisjs/cache` L2)
- **Frontend:** React 19, Inertia, Tailwind v4, shadcn/ui
- **Roles:** Workspace `owner` / `admin` / `member` → Owner / Manager / Worker
- **Offline:** PWA shell + IndexedDB queue; sync via `/api/v1/farm/sync`

## Prerequisites

- Node.js 22+ and npm 10+
- PostgreSQL
- Redis (optional in tests: set `CACHE_STORE=memoryOnly`)

## Quick start

```bash
npm install
cp .env.example .env
# Set APP_KEY, DB_*, REDIS_*, STRIPE_SECRET_KEY, APP_URL
node ace generate:key
node ace migration:run
node ace db:seed
node ace db:seed --files=database/seeders/farm_seeder.ts
npm run dev
```

App: http://localhost:3333

### Demo farm accounts (farm seeder)

| Email | Password | Role |
|---|---|---|
| owner@farmco.test | password | Owner |
| manager@farmco.test | password | Manager |
| worker@farmco.test | password | Worker |

## Main routes

- `/dashboard` — today’s snapshot and quick actions
- `/birds`, `/eggs`, `/feed` — inventory
- `/orders` — egg orders
- `/stats`, `/activity`, `/users` — management (role-gated)
- `/api/v1/farm/*` — farm APIs (movements, orders, sync)

## Scripts

```bash
npm run dev          # HMR server
npm run test         # Japa — needs local Postgres DB from .env.test (default app_test)
npm run typecheck
npm run build
```

Create the test database once:

```bash
createdb app_test   # or via your Postgres client
# ensure .env.test DB_* points at it, then:
node ace migration:run --connection=postgres
npm run test
```

`CACHE_STORE=memoryOnly` in `.env.test` skips Redis during tests.

## Notes

- Billing, blog, and pricing remain in the codebase but are hidden from the Farmco primary UI.
- Installable PWA: `public/manifest.webmanifest` + `public/sw.js`. Offline entries queue in IndexedDB and sync when online.
- Never commit real Redis/DB secrets; keep them in `.env` only.
