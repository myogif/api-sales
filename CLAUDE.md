# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start with nodemon (auto-reload)
npm start            # Production start

# Linting
npm run lint         # ESLint on src/
npm run lint:fix     # Auto-fix ESLint errors

# Testing
npm test             # Run Node.js built-in test runner (tests/ directory)
npm run test:jest    # Run Jest tests (jest-tests/ directory, *.jest.spec.js)

# Run a single test file
node --test tests/filters.test.js
node --test tests/manager.service.test.js

# Database
npm run db:create        # Create database
npm run db:migrate       # Run pending migrations
npm run db:migrate:undo  # Undo last migration
npm run db:seed          # Seed all seeders
npm run db:seed:undo     # Undo all seeds
```

## Environment Setup

Copy `.env.example` to `.env`. Key variables:

| Variable | Default | Notes |
|---|---|---|
| `DB_DIALECT` | `postgres` | Supports `mysql`/`mariadb` too |
| `DB_TIMEZONE` | `+07:00` | Used for DATETIME casting |
| `JWT_SECRET` | — | Must be set in production |
| `RATE_LIMIT_MAX_REQUESTS` | `5` | Per `RATE_LIMIT_WINDOW_MS` (default 15 min) |

## Architecture

### Request Flow

```
HTTP Request
  → app.js (helmet, cors, body-parse, logging)
  → /api router (src/routes/index.js)
  → route file (src/routes/*.routes.js)
  → authenticate middleware (JWT verify + DB user lookup)
  → requireRole middleware (RBAC)
  → validate middleware (express-validator)
  → controller (src/controllers/*.controller.js)
  → service (src/services/*.service.js)
  → Sequelize models (src/models/)
  → response helpers (src/utils/response.js)
```

### Role Hierarchy

Four roles with strict separation of access:

- **MANAGER** — full visibility across all stores
- **SERVICE_CENTER** — read access same scope as MANAGER
- **SUPERVISOR** — scoped to their store only
- **SALES** — scoped to their store; can filter to own (`?mine=true`)

Role enforcement happens in two places: `src/middlewares/role.js` (route access) and `src/utils/filters.js` (query-level row scoping via `buildProductFilters`, `buildSupervisorFilters`, `buildSalesFilters`).

### Two Parallel Test Suites

- **`tests/`** — Node.js built-in test runner (`node --test`). Uses `tests/helpers/mock-modules.js` which monkey-patches `Module._resolveFilename` to redirect imports (sequelize, winston, etc.) to lightweight stubs in `tests/stubs/`. No jest, no external test framework.
- **`jest-tests/`** — Jest with `*.jest.spec.js` pattern. Rate-limit integration tests (`product.limit`, `sales.limit`, `store.limit`).

When writing new tests, match the suite that fits the file being tested. Most unit/service tests belong in `tests/`; rate-limit or integration tests in `jest-tests/`.

### Module Structure Exception

The `warranty` feature lives in `src/modules/warranty/` (repositories, services, utils) — a self-contained module pattern separate from the flat `src/services/` layer used by other features.

### Key Utilities

- `src/utils/response.js` — `success()`, `error()`, `paginated()`, `validation()` — all responses use these helpers.
- `src/utils/filters.js` — Builds Sequelize `where` clauses. All product/user listing queries go through here; RBAC row-scoping lives here.
- `src/utils/pagination.js` — Shared pagination logic.
- `src/utils/excel.js` — ExcelJS export; triggered via `?export=excel` on any listing endpoint.
- `src/utils/product-pricing.js` — Pricing calculations for product data.
- `src/utils/crypto.js` — JWT sign/verify (`generateToken`, `verifyToken`, `createTokenPayload`).

### Database

Sequelize 6 with Sequelize CLI. Config at `src/config/database.js`; `.sequelizerc` points CLI to `src/db/migrations/` and `src/db/seeders/`. Models auto-load from `src/models/index.js` via filesystem scan. The `User` model has a `defaultScope` that excludes `password`; use `User.scope('withPassword')` when password comparison is needed.

### API Base Path

All routes are prefixed `/api`. Indonesian-language routes exist for products (`/api/produk`) and stores (`/api/toko`); English routes (`/api/sales`, `/api/managers`, etc.) for role-based endpoints. Swagger UI at `/docs`.
