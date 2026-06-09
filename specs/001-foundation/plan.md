# Implementation Plan: Project Foundation

**Branch**: `develop` (feature branches not in use yet) | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-foundation/spec.md`

## Summary

Stand up the Lyceum engine skeleton: a single published, ESM-only TypeScript package with the
`core` / `runtime` / `fe` (+ `testing`) folder boundary from constitution Principle VII, a
lint-enforced ban on `core` reaching into persistence/HTTP/H5P, a Dockerized local dev environment
with a PostgreSQL container, and an SDD + TDD test setup. The foundation proves two things end to
end: a contributor reaches a running env + passing smoke test from a clean checkout (SC-001), and
the domain logic runs against an in-memory adapter with zero PostgreSQL dependency (SC-002). The
full LMS domain is deliberately out of scope here (later features); this feature establishes the
shape, the boundary, and the toolchain.

## Technical Context

All toolchain choices below were decided by Valery on 2026-06-09 (see [research.md](./research.md));
none are assumed.

**Language/Version**: TypeScript (Node.js `>=20.9`; developed on 24.x), ESM-only (`"type": "module"`).

**Primary Dependencies** (installed in this feature — H5P is wired now, not deferred):
`@lumieducation/h5p-server` 10.0.4 (CommonJS, consumed via Node ESM→CJS interop) — `runtime` wraps
its `H5PEditor` / `H5PPlayer` / `H5PAjaxEndpoint` and exposes framework-agnostic handlers (no bundled
HTTP server, ADR 0001); `@lumieducation/h5p-react` 10.0.4 + React for the `fe` H5P player/editor
components. H5P core/editor **static assets are not on npm** and are fetched by a download script.

**Storage**: PostgreSQL is the dev/reference database (via `docker-compose` for local dev). The
`core` is persistence-agnostic — reached only through ports; an in-memory reference adapter lives in
`testing`. The real Postgres adapter lives in the consuming host, not here (ADR 0001). For **H5P's
own storage** (content, libraries, temporary files, content-user-data), this feature wires
`h5p-server`'s shipped implementations — filesystem (`FileContentStorage`, `FileLibraryStorage`,
`DirectoryTemporaryFileStorage`, `FileContentUserDataStorage`) for local dev and `InMemoryStorage`
for tests. Whether H5P libraries/temp files ultimately live on filesystem/S3 vs the host DB stays
the deferred ADR 0001 open call; the fs default unblocks the foundation without prejudging it.

**Testing**: Vitest 4.x (unit + contract + smoke). The smoke test provisions an ephemeral PostgreSQL
via Testcontainers (`@testcontainers/postgresql`); local dev uses `docker-compose`.

**Target Platform**: Node.js library/engine embedded by host projects (first host: `lms-starter-kit`,
Next.js / Payload / PostgreSQL).

**Project Type**: Single published package (constitution Principle VII) — `core` / `runtime` / `fe`
folders plus a `testing` folder, exposed via subpath exports.

**Performance Goals**: Not a runtime-performance feature. Operational target: from a clean checkout,
`install → dev → smoke` completes without manual setup; the smoke run is hermetic and leaves nothing
behind.

**Constraints**: `core/**` MUST NOT import `runtime/**`, `fe/**`, `@lumieducation/h5p-server`, or any
database/HTTP library — enforced by **dependency-cruiser**, not convention. No secrets committed
(`.env.example` only). Must run in / alongside the starter-kit environment (pnpm 9, ESM, Node ≥20.9).

**Build**: `tsc` (TypeScript project references), emitting ESM + `.d.ts` to `dist/`. No bundler.

**Package manager**: pnpm 9 (matches the starter-kit's `pnpm@9.15.9`).

**Scale/Scope**: Foundation skeleton only — no domain entities modeled (deferred to later features).
The single example/smoke-harness folder is its own feature (002), layered on this foundation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Open Source, Clean & Integrable | Small, documented public surface; light deps; MIT-class license | PASS — subpath exports as the surface; deps limited to H5P + dev tooling; license file in scope (FR-007) |
| II. Opinionated by Design | One clear path, not endless config | PASS — single toolchain (pnpm/ESM/Vitest/tsc), one package layout |
| III. Database-Agnostic Core | Core has zero persistence coupling; ports/adapters; in-memory provable | PASS — dependency-cruiser bans db imports in `core`; in-memory adapter in `testing` proves SC-002 |
| IV. H5P Frontend, Real Backend | H5P-based FE + a real backend | PASS — h5p-server installed and wired in this feature: `runtime` wraps `H5PEditor`/`H5PPlayer`/`H5PAjaxEndpoint` with fs/in-memory storage; `fe` ships a minimal `h5p-react` player/editor component. Not just empty folders. |
| V. Environment Compatibility | Node + TS, interoperable with starter-kit, Dockerized dev | PASS — pnpm 9 / ESM / Node ≥20.9 align with starter-kit; `docker-compose` Postgres |
| VI. Spec-Driven + Test-Driven | Specs precede code; business logic test-first | PASS — this plan precedes code; Vitest `tests/unit` red-green-refactor |
| VII. One Package Until a Trigger | Single package, `core`/`runtime`/`fe` (+`testing`) boundary, lint-enforced; no premature splits | PASS — single package; dependency-cruiser enforces the boundary; no splits introduced |

No violations → Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output — accepted toolchain decisions
├── data-model.md        # Phase 1 output — no domain entities yet; structural model + port pattern
├── quickstart.md        # Phase 1 output — install/dev/test/smoke validation guide
├── contracts/           # Phase 1 output — public-surface & boundary contracts
│   ├── package-surface.md
│   ├── storage-port.md
│   └── import-boundary.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
lyceum/                         # engine repo root (org: lyceumjs) = the single published package
├── package.json                # name "@lyceumjs/lms"; "type": "module"; subpath "exports"; engines node >=20.9
├── pnpm-lock.yaml
├── tsconfig.json               # solution file referencing the per-folder tsconfigs
├── tsconfig.base.json          # shared compiler options (ESM, strict)
├── .dependency-cruiser.cjs     # core-boundary rules (Principle VII)
├── vitest.config.ts
├── docker-compose.yml          # PostgreSQL for local dev (FR-004)
├── .env.example                # safe dev-only placeholders (FR-007)
├── LICENSE                     # MIT-class (FR-007)
├── scripts/
│   └── download-h5p-core.sh    # fetches H5P core + editor static assets (not on npm)
├── h5p-data/                   # dev H5P content/library/temp storage (git-ignored)
├── src/
│   ├── core/                   # pure domain + ports — no runtime/fe/h5p/db/http imports
│   │   ├── index.ts
│   │   └── ports/              # repository/storage port interfaces (pattern only this feature)
│   ├── runtime/                # framework-agnostic handlers
│   │   ├── index.ts            # composition seam (inject adapters + H5P storage; fail-fast)
│   │   └── h5p/                # wraps H5PEditor/H5PPlayer/H5PAjaxEndpoint → handlers
│   ├── fe/                     # H5P FE base
│   │   ├── index.ts
│   │   └── H5PContent.tsx      # minimal @lumieducation/h5p-react player/editor component
│   └── testing/                # in-memory reference adapter + adapter contract-test helper
│       └── index.ts
└── tests/
    ├── unit/                   # core domain + H5P-wrapper + fe tests (TDD)
    ├── contract/               # adapter conforms to the port (in-memory proves the pattern)
    └── smoke/                  # SC-001: boots engine + H5P runtime against Testcontainers Postgres
```

**Structure Decision**: Single published package (Principle VII). The four concerns are folders
under `src/` exposed via subpath exports (`.` → core, `./runtime`, `./fe`, `./testing`), built with
`tsc` project references to ESM + `.d.ts`. `dependency-cruiser` enforces the `core` import ban. This
feature creates the skeleton and the boundary; it does **not** model the LMS domain (later features)
and does **not** create the example folder (feature 002).

## Complexity Tracking

> No constitution violations — section intentionally empty.
