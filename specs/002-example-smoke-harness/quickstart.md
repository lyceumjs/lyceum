# Quickstart: Example Smoke Harness

Prerequisites: Node ≥ 20.9, pnpm 9, Docker running. From the repo root:

```bash
pnpm install
```

## 1. Hermetic smoke run (US1 + US2 + FR-009) — the one documented command

```bash
pnpm example:smoke
```

What it does (no manual setup, no leftovers — FR-003/FR-010):

1. builds the engine, then starts an **ephemeral PostgreSQL 17** via Testcontainers;
2. creates the schema on startup (the seed), boots the engine through `createEngine` with the
   example's PG adapters (public surface only);
3. pushes `example/fixtures/lyceum-demo.h5p` through the runtime's content-storage handler and
   reads it back;
4. creates a full course hierarchy (course → unit → lesson → content ref to the fixture), reads it
   back deep-equal, and spot-checks via direct SQL;
5. captures a simulated learner's xAPI-style `answered` statement and reads it back;
6. reports pass/fail through the test exit code and tears the container down.

Also runs the published port-contract suites against the example's PG adapters.

**Expected outcome**: all tests pass; `docker ps` shows no leftover containers.

## 2. Dev host — check the FE in a real browser (US3 / FR-011)

```bash
pnpm example:dev
```

What it does:

1. builds the engine, starts the compose dev database (waits for health), fetches the H5P
   core/editor assets if missing;
2. bundles the FE page (esbuild) and boots the single-origin Express host;
3. on startup: creates schema idempotently, installs the fixture content + demo course if absent;
4. prints the URL — open **http://localhost:3020**.

**Expected outcome**: the page renders the multiple-choice fixture via `@lyceumjs/lms/fe`'s
`H5PContent`; answering it shows the captured learning record (read back from `/api/records`).
Verification is interactive — manually or via the Playwright MCP (FR-012).

Stop with `Ctrl-C`; the dev database keeps running until `docker compose down`.

Troubleshooting (all fail fast with the same hints): database down → `docker compose up -d`;
missing H5P assets → `pnpm h5p:fetch-core`; port 3020 busy → set `PORT`.

## 3. Engine-side verification

```bash
pnpm verify        # boundary (engine + example) + build + unit/contract + foundation smoke
```
