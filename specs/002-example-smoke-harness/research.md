# Research: Example Smoke Harness

All decisions below are Valery's; the agent researched and recommended. Versions were verified
against the npm registry on 2026-06-10 (not assumed from training data).

## Decision 1 — Scope: FE/browser check pulled forward (Valery, 2026-06-10)

- **Decision**: The example doubles as a runnable dev host so the FE can be checked in a real
  browser this iteration ("Build the 002 runnable example"). The automated smoke remains headless
  and direct-API; browser verification is interactive (Playwright MCP / manual). No committed
  browser-test suite yet.
- **Rationale**: After foundation 001 the engine had no runnable surface (ADR 0001: no bundled
  server; FE only unit-tested). Valery needs to see H5P actually play.
- **Alternatives considered**: throwaway Vite preview (can't play real H5P — no
  handlers/assets/content); defer to the starter-kit host (no visual check until then).

## Decision 2 — Example host stack: Express + esbuild, single origin (Valery, 2026-06-10)

- **Decision**: One Express **5.2.1** server mounts the runtime's H5P handlers and serves the FE
  page bundled once by esbuild **0.28.0**; tsx **4.22.4** runs the TS server in dev. All three are
  dev-only dependencies of the unpublished `example/` package — the engine gains no dependencies.
- **Rationale**: Single origin → no CORS/proxy; one process; minimal moving parts; reads as the
  cleanest living reference for how a host wires Lyceum (US4).
- **Alternatives considered**: Express + Vite dev server (better HMR, but two processes + proxy in
  a folder meant as a minimal reference); plain `node:http` (zero deps but more wiring code, less
  representative).

## Decision 3 — H5P fixture: official libraries + our content, committed (Valery, 2026-06-10)

- **Decision**: Build `example/fixtures/lyceum-demo.h5p` once from official H5P content-type
  library releases (MIT) plus our own minimal content parameters; commit the file and the build
  script (`example/scripts/build-fixture.mjs`) that documents provenance. Runs never touch the
  network for the fixture (FR-010 hermeticity).
- **Rationale**: Deterministic, proves real-world library compatibility, our own content, plays
  properly in the browser, and answering it emits a real xAPI event → the US2/US3 learning record.
- **Alternatives considered**: ready-made h5p.org sample (third-party content, uncontrolled
  params); tiny custom content type (fully hermetic but proves nothing about real libraries).

## Decision 4 — Engine grows its first real domain slice (consequence of FR-008, Valery 2026-06-09)

- **Decision**: Implement the minimal Lyceum-owned slice the spec requires the example to
  exercise: `Course → Unit → Lesson → ContentRef` aggregate + `CourseStorePort`, and xAPI-style
  `LearningRecord` + `LearningRecordStorePort`, with validated use cases, in-memory reference
  adapters, and published contract suites. `createEngine` requires adapters for all ports
  (fail-fast, named errors). Aggregates are saved/loaded whole (no per-entity tables in the core's
  view) — richer modeling (catalog, enrollment, progress, certificates…) comes in later features.
- **Rationale**: FR-008 mandates the example exercise the full hierarchy plus learning records
  through Lyceum; the engine must therefore own them. Foundation 001 deliberately shipped only a
  placeholder port.
- **Open item for Valery (not decided)**: whether to retire the 001 `ExampleItem`/`ExampleStorePort`
  placeholder now that real domain ports exist. This iteration keeps it (001 contracts stay
  intact; removal is a one-line surface change later).

## Decision 5 — Databases: Testcontainers for smoke, compose for the dev host (carried from 001)

- **Decision**: The hermetic smoke run provisions ephemeral PostgreSQL 17 via
  `@testcontainers/postgresql` (auto-teardown, no volume — FR-003/SC-003). The dev host uses the
  existing `docker-compose` database. Schema creation is idempotent on startup (= the seed).
- **Rationale**: Valery decided this split in 001 ("Compose for dev + Testcontainers for harness").

## Decision 6 — Workspace layout (structural consequence of FR-001/SC-004)

- **Decision**: Add `pnpm-workspace.yaml`; `example/` is a private package
  (`@lyceumjs/lms-example`, `"private": true`) depending on `"@lyceumjs/lms": "workspace:*"`.
- **Rationale**: Keeps the example out of the published artifact by construction and forces it
  through the `exports` map — deep imports of engine internals don't resolve. A dedicated
  dependency-cruiser config double-enforces SC-004.

## Decision 7 — Learning-record capture path (xAPI seam, ADR 0001)

- **Decision**: The H5P player's xAPI events are the source: in the browser the page forwards the
  `answered` statement to the host (`POST /api/xapi`), which calls the engine's `recordStatement`
  use case; the headless smoke calls `recordStatement` directly with a fixed statement. Identity
  (`actor`) is supplied by the host (a fixed demo learner) — identity stays a host concern.
- **Rationale**: Same capture path for US2 (simulated) and US3 (real browser interaction); matches
  ADR 0001's learning-records-sink seam.

## Verified versions (npm registry, 2026-06-10)

| Package | Version |
|---|---|
| express | 5.2.1 |
| esbuild | 0.28.0 |
| tsx | 4.22.4 |
| @types/express | 5.0.6 |

(Engine-side versions unchanged from 001: h5p-server/react 10.0.4, Vitest 4.x,
@testcontainers/postgresql 11.x, pg 8.13.x, H5P core/editor assets 1.27.0 via download script.)
