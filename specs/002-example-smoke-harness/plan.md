# Implementation Plan: Example Smoke Harness

**Branch**: `develop` (feature branches not in use yet) | **Date**: 2026-06-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-example-smoke-harness/spec.md`

## Summary

Add the dev-only `example/` folder: a runnable example host that exercises Lyceum end-to-end
against a real database. It has two faces sharing the same wiring:

1. **Automated smoke** (US1/US2, FR-005/FR-010): one command, hermetic — ephemeral Postgres via
   Testcontainers, schema seeded on startup, creates a full course hierarchy through Lyceum, pushes
   the committed H5P fixture through the runtime's content-storage handler, captures a learning
   record, reads everything back (plus direct SQL spot-checks), reports pass/fail, tears down.
2. **Dev host** (US3, FR-011, pulled forward 2026-06-10): one command, single-origin Express
   server against the compose-managed dev database — mounts the runtime's H5P handlers over HTTP
   and serves an esbuild-bundled page rendering `@lyceumjs/lms/fe`'s `H5PContent`, so the fixture
   actually plays in a browser; completing it captures a learning record through the same path.

Because FR-008 (Valery, 2026-06-09) makes the course hierarchy and learning records Lyceum-owned,
this feature also adds the **first real domain slice to the engine** (replacing nothing — additive
to the 001 placeholder): `Course → Unit → Lesson → ContentRef` aggregate + `LearningRecord`, their
ports, use cases, in-memory reference adapters, and contract suites. The example consumes all of it
strictly through the published surface (US4 / SC-004), enforced with dependency-cruiser.

## Technical Context

Carried over from foundation 001 (all decided by Valery): TypeScript ESM-only, Node `>=20.9`,
pnpm 9, Vitest 4, `tsc` build, dependency-cruiser boundary, `@lumieducation/h5p-server` /
`h5p-react` 10.0.4, **docker-compose for dev DB + Testcontainers for the smoke harness**.

New in this feature (decided by Valery 2026-06-10; versions verified against the npm registry on
2026-06-10 — see [research.md](./research.md)):

**Example host**: Express 5.2.1 (single-origin: handlers + static FE), esbuild 0.28.0 (FE page
bundle), tsx 4.22.4 (runs the TS server in dev). All confined to the `example/` workspace package.

**Workspace**: the repo becomes a pnpm workspace; `example/` is a **private, never-published**
package (`@lyceumjs/lms-example`) depending on `"@lyceumjs/lms": "workspace:*"` — so it can only
import the engine through the published `exports` map (FR-001, SC-004).

**H5P fixture**: one `.h5p` built from official H5P content-type library releases (MIT) + our own
minimal content parameters, committed under `example/fixtures/` together with the build script that
documents provenance (FR-009). The dev host plays the same stored fixture (FR-011).

**Persistence (example-only adapters)**: `pg` against PostgreSQL 17 — `courses` as a JSONB
aggregate document, `learning_records` as rows, `example_items` for the 001 placeholder port.
Schema is created idempotently on startup (= the FR-003 seed). These adapters stay in `example/`
and are NOT the published reference adapter (ADR 0001).

**Browser verification**: interactive via the Playwright MCP (already configured in `.mcp.json`)
or manually — no committed browser-test suite this iteration (FR-012).

## Constitution Check

| Principle | Gate | Status |
|---|---|---|
| I. Open Source, Clean & Integrable | Small public surface; light deps | PASS — engine gains only domain code (no new engine deps); express/esbuild/tsx live in the unpublished example |
| II. Opinionated by Design | One clear path | PASS — one smoke command, one dev-host command, single-origin host |
| III. Database-Agnostic Core | Zero persistence coupling in core | PASS — new domain slice is pure types/functions + ports; PG adapters live example-side; dependency-cruiser still bans db/http/h5p in `core` |
| IV. H5P Frontend, Real Backend | Real H5P exercised | PASS — real fixture through content storage headlessly AND played in the browser via `H5PContent` over mounted handlers |
| V. Environment Compatibility | Node+TS, Docker dev parity | PASS — compose dev DB reused; Testcontainers for the hermetic run |
| VI. Spec-Driven + Test-Driven | Specs precede code; TDD | PASS — this plan precedes code; domain slice and smoke are written red→green |
| VII. One Package Until a Trigger | No premature package splits | PASS with note — `example/` is a **private dev-only workspace folder mandated by FR-001**, not a split of the published surface; the published package count stays one |

No violations → Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-example-smoke-harness/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 — decisions (Valery 2026-06-09/10) + verified versions
├── data-model.md        # Phase 1 — domain slice (Course aggregate, LearningRecord) + example tables
├── quickstart.md        # Phase 1 — run the smoke / run the dev host
├── contracts/
│   ├── domain-ports.md  # CourseStorePort, LearningRecordStorePort, engine surface additions
│   └── example-host.md  # the example host's HTTP surface (example-only, NOT a published API)
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
lyceum-lms/
├── pnpm-workspace.yaml             # NEW — members: example
├── package.json                    # + example:smoke / example:dev / boundary:example scripts
├── src/
│   ├── core/
│   │   ├── ports/
│   │   │   ├── example-store.ts            # (001 placeholder — kept)
│   │   │   ├── course-store.ts             # NEW — Course/Unit/Lesson/ContentRef + CourseStorePort
│   │   │   └── learning-record-store.ts    # NEW — LearningRecord + LearningRecordStorePort
│   │   └── usecases/
│   │       ├── course-usecase.ts           # NEW — createCourse / getCourse (validated, read-back)
│   │       └── learning-record-usecase.ts  # NEW — recordStatement / listActorRecords
│   ├── runtime/index.ts            # createEngine: + courseStore/learningRecordStore (fail-fast)
│   └── testing/                    # + InMemoryCourseStore, InMemoryLearningRecordStore,
│                                   #   runCourseStoreContract, runLearningRecordStoreContract
├── tests/
│   ├── unit/                       # + course-usecase, learning-record-usecase; extended fail-fast
│   └── contract/                   # + in-memory course / learning-record contract runs
└── example/                        # NEW — private workspace pkg @lyceumjs/lms-example (dev-only)
    ├── package.json                # private: true; engine via workspace:*; express/esbuild/tsx
    ├── tsconfig.json
    ├── .dependency-cruiser.cjs     # forbids engine internals (../src, dist deep imports) — SC-004
    ├── fixtures/
    │   ├── lyceum-demo.h5p         # committed fixture (official MIT libs + our content) FR-009
    │   └── README.md               # provenance + licenses
    ├── scripts/
    │   └── build-fixture.mjs       # one-time/regeneration builder (network; not part of smoke)
    ├── public/
    │   └── index.html              # dev-host page shell (loads esbuild bundle)
    ├── src/
    │   ├── schema.ts               # idempotent CREATE TABLE (= seed on startup, FR-003)
    │   ├── adapters/               # example-only PG adapters for the three ports
    │   ├── fixture.ts              # push .h5p through the runtime content-storage handler
    │   ├── h5p-routes.ts           # mounts ajax/play/static under /h5p (ADR 0001 HTTP seam)
    │   ├── api-routes.ts           # /api/courses, /api/xapi, /api/records, /api/content
    │   ├── server.ts               # dev host boot: env, fail-fast checks, seed, install, listen
    │   └── web/main.tsx            # React page rendering fe/H5PContent + xAPI → /api/xapi
    └── tests/
        ├── smoke.test.ts           # US1+US2+FR-009 hermetic run (Testcontainers)
        └── adapters.contract.test.ts  # published contract suites vs the PG adapters
```

**Structure Decision**: single published package preserved; `example/` is a private workspace
member so the engine can only be consumed through its `exports` map. The engine's new domain slice
is additive — the 001 example placeholder port stays (its removal is a separate decision for
Valery, noted in research.md).

## Complexity Tracking

> No constitution violations — section intentionally empty.
