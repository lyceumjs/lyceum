# Lyceum (`@lyceumjs/lms`)

Open-source, database-agnostic **LMS engine** — an H5P-based interactive learning frontend with a
backend for content runtime and learning records, built to be embedded in host projects (the first
host being `lms-starter-kit`).

Lyceum owns the entire learning-management domain and content; a host keeps only auth, user
management, and the glue. See [`specs/adr/0001-integration-architecture.md`](specs/adr/0001-integration-architecture.md)
and the [constitution](.specify/memory/constitution.md).

## Package shape

A single ESM package with four subpath exports (constitution Principle VII):

| Import | Concern |
|---|---|
| `@lyceumjs/lms` | Pure, database-agnostic domain core + ports |
| `@lyceumjs/lms/runtime` | Framework-agnostic engine + H5P handlers (no bundled server) |
| `@lyceumjs/lms/fe` | H5P frontend components |
| `@lyceumjs/lms/testing` | In-memory reference adapter + adapter contract-test helper |

`core` may not import `runtime`, `fe`, `@lumieducation/*`, or any db/HTTP library — enforced by
`dependency-cruiser` (`pnpm boundary`).

## Quickstart

```bash
pnpm install
cp .env.example .env          # safe dev-only placeholders; never commit secrets
pnpm h5p:fetch-core           # download H5P core + editor static assets into h5p-data/
```

- `pnpm dev` — docker-compose Postgres for local development + fetch H5P assets.
- `pnpm build` — `tsc` → ESM + `.d.ts` in `dist/`.
- `pnpm boundary` — enforce the core import boundary.
- `pnpm test` — unit + contract suites (no database needed; proves db-agnosticism, SC-002).
- `pnpm test:smoke` — boots the engine + H5P runtime against an ephemeral Postgres
  (Testcontainers) and round-trips a record (SC-001). **Self-contained** — does not require
  `pnpm dev` first. Requires Docker.
- `pnpm verify` — boundary + build + unit/contract + smoke.

## Status

Foundation (feature `001-foundation`). The LMS domain model and the example smoke harness
(feature `002`) build on top of this skeleton.
