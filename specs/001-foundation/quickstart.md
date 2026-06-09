# Quickstart: Project Foundation

A validation guide proving the foundation works end to end. Implementation details (configs, source
bodies) live in `tasks.md` and the implementation phase — this is the run/verify guide that maps to
the spec's Success Criteria.

## Prerequisites

- Node.js `>=20.9` (developed on 24.x)
- pnpm 9 (`corepack enable` or install pnpm 9)
- Docker (for the local Postgres container and the Testcontainers smoke run)

## Setup

```bash
pnpm install
cp .env.example .env        # safe dev-only placeholders; no secrets committed
pnpm h5p:fetch-core         # download H5P core + editor static assets (not on npm) into h5p-data/
```

## Validate SC-001 — running env + passing smoke test

The smoke test is **self-contained**: it provisions its own ephemeral Postgres via Testcontainers
and does **not** require `pnpm dev` (the docker-compose dev DB) to be running first. `pnpm dev` is
for interactive local development; the smoke run manages its own database lifecycle.

1. (Optional, for interactive dev) bring up the long-lived local dev database:

   ```bash
   pnpm dev        # docker compose up + h5p:fetch-core; starts the pinned postgres:17-alpine
   ```

2. Run the smoke test (provisions an ephemeral Postgres via Testcontainers, boots the engine **and
   its H5P runtime**, verifies it talks to the database and the H5P AJAX handler responds, then
   tears the container down):

   ```bash
   pnpm test:smoke
   ```

   **Expected**: the smoke suite passes; afterward no Testcontainers container or volume remains.

## Validate SC-002 — database-agnostic core (no PostgreSQL)

Run the unit + contract suites with **no database running**:

```bash
pnpm test:unit        # core domain logic against the in-memory adapter
pnpm test:contract    # in-memory adapter passes runAdapterContract
```

**Expected**: both pass with Docker stopped / no Postgres — demonstrating `core` carries no
persistence dependency (see `contracts/storage-port.md`).

Also verify the fail-fast behavior:

**Expected**: wiring the engine with a missing adapter throws a clear error naming the missing port
(asserted in `tests/unit`).

## Validate the Principle VII boundary

```bash
pnpm boundary         # depcruise src --config .dependency-cruiser.cjs
```

**Expected**: passes. Temporarily adding an import of `runtime` inside `core` makes it fail (then
revert) — proving the rule is enforced, not advisory (see `contracts/import-boundary.md`).

## Validate SC-003 — no secrets

```bash
pnpm boundary && pnpm test       # full check used by CI
```

**Expected**: only `.env.example` (placeholders) is tracked; no real secrets in the repo.

## One-shot

```bash
pnpm verify     # aggregates: boundary + unit + contract + smoke
```

**Expected**: a single green run covers SC-001, SC-002, SC-003, and the boundary — the
clean-checkout proof a contributor (and later CI) relies on.

> Exact script names (`dev`, `test:smoke`, `test:unit`, `test:contract`, `boundary`, `verify`) are
> finalized in `tasks.md`; the validation flow above is the contract.
