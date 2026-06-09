---

description: "Task list for Project Foundation"
---

# Tasks: Project Foundation

**Input**: Design documents from `specs/001-foundation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: INCLUDED — TDD is mandatory (constitution Principle VI; spec FR-005 "developed
test-first"). Test tasks are written first and must FAIL before their implementation.

**Organization**: Grouped by phase. Both user stories are P1; US1 is the MVP increment. H5P is wired
in this foundation (Decision 8) — not deferred.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 (Setup, Foundational, H5P FE, Polish carry no story label)
- Exact file paths are given; all paths are relative to the repo root (the single package)

## Conventions / scope notes

- Single ESM package; folders `src/{core,runtime,fe,testing}` + `tests/{unit,contract,smoke}` per
  plan.md. Build with `tsc`; test with Vitest; boundary via dependency-cruiser; dev DB via
  docker-compose; smoke DB via Testcontainers.
- **H5P is installed and wired here** (Decision 8): `runtime` wraps `H5PEditor`/`H5PPlayer`/
  `H5PAjaxEndpoint`; `fe` ships a minimal `@lumieducation/h5p-react` component. Dev/smoke use
  h5p-server's fs / in-memory storage; core assets are fetched by a script (not on npm). Host-DB vs
  fs/S3 for H5P storage stays the deferred ADR 0001 open call.
- The **example port** + in-memory adapter are the sanctioned placeholder pattern from
  `data-model.md` / `contracts/storage-port.md` — NOT real LMS domain (deferred to later features).
- The **published Postgres adapter for the domain lives in the host** (ADR 0001); the only
  domain-Postgres code here is a **test-scoped** adapter used by the smoke run.
- Published package name is **`@lyceumjs/lms`** (under the `lyceumjs` GitHub org).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the single package, install dependencies (incl. H5P), and lay the toolchain

- [x] T001 Initialize the single ESM package: create `package.json` with `name: "@lyceumjs/lms"`, `"type": "module"`, `"packageManager": "pnpm@9"`, `"engines": { "node": ">=20.9" }`, and an `"exports"` map for `.` → `./dist/core`, `./runtime`, `./fe`, `./testing` (with `types` conditions); add runtime deps `@lumieducation/h5p-server@10.0.4`, `@lumieducation/h5p-react@10.0.4`, `react`; run `pnpm install`. File: `package.json`
- [x] T002 [P] Add TypeScript build config: `tsconfig.base.json` (strict, `module`/`moduleResolution` NodeNext, `declaration`, `outDir dist`) + `tsconfig.json` solution with project references and per-folder `src/{core,runtime,fe,testing}/tsconfig.json`. Files: `tsconfig.base.json`, `tsconfig.json`, `src/*/tsconfig.json`
- [x] T003 [P] Add `vitest.config.ts` declaring `unit`, `contract`, `smoke` scopes (jsdom environment for `fe` component tests). File: `vitest.config.ts`
- [x] T004 [P] Create source + test skeleton: `src/{core,runtime,fe,testing}/index.ts` stubs and `tests/{unit,contract,smoke}/.gitkeep`. Files: `src/*/index.ts`, `tests/*/.gitkeep`
- [x] T005 [P] Add `docker-compose.yml` for local dev with a pinned `postgres:17-alpine` service + healthcheck (FR-004). File: `docker-compose.yml`
- [x] T006 [P] Add `LICENSE` (MIT), `.env.example` (safe dev-only placeholders), and `.gitignore` excluding `.env`, `node_modules/`, `dist/`, and `h5p-data/` (FR-007). Files: `LICENSE`, `.env.example`, `.gitignore`
- [x] T007 [P] Add devDependencies and ensure the test/build/boundary toolchain installs: `typescript`, `vitest`, `dependency-cruiser`, `@testcontainers/postgresql`, `pg`, `@types/pg`, plus jsdom + React testing libs for `fe` tests (depends on T001). File: `package.json`
- [x] T008 Add `scripts/download-h5p-core.sh` that fetches the H5P **core + editor static assets** (not on npm) into a git-ignored location under `h5p-data/`; make it idempotent and fail-fast on network errors. File: `scripts/download-h5p-core.sh`
- [x] T009 Add `package.json` scripts: `h5p:fetch-core` (runs T008), `dev` (compose up + fetch-core), `build` (tsc), `test:unit`, `test:contract`, `test:smoke`, `boundary` (depcruise), `verify` (boundary + all tests) (depends on T001–T008). File: `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The port pattern, the H5P runtime wrapper, the engine composition seam, the build, and
the enforced import boundary — everything both user stories boot on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T010 Define the **example persistence port** as a `core`-owned interface — domain-typed, no SQL/driver/HTTP types — and export it. Files: `src/core/ports/example-store.ts`, `src/core/index.ts`
- [x] T011 Implement a minimal pure `core` use-case depending only on the port (create-then-fetch an illustrative item); no persistence/HTTP imports (depends on T010). File: `src/core/usecases/example-usecase.ts`
- [x] T012 Add `.dependency-cruiser.cjs` encoding the forbidden rules from `contracts/import-boundary.md` (`core/**` ↛ `runtime/**`, `fe/**`, `@lumieducation/*`, db/http libs) at `severity: error` (FR-002, Principle VII). File: `.dependency-cruiser.cjs`
- [x] T013 Run `pnpm boundary` to confirm it PASSES on the skeleton, then temporarily add a `core → runtime` import to confirm it FAILS, then revert — proving enforcement (depends on T012). File: `.dependency-cruiser.cjs` (verification)
- [x] T014 [P] **H5P runtime wrapper test** (TDD, write first / must FAIL): constructing the H5P service with `InMemoryStorage` + `H5PConfig` builds `H5PEditor`/`H5PPlayer`/`H5PAjaxEndpoint` and the AJAX handler answers a basic request. File: `tests/unit/h5p-runtime.test.ts`
- [x] T015 Implement the **H5P runtime wrapper** in `runtime`: construct `H5PEditor`/`H5PPlayer`/`H5PAjaxEndpoint` from injected H5P storage (the four `I*Storage` interfaces) + `H5PConfig` + permission/lock providers; expose framework-agnostic handlers; no bundled server (FR-003, ADR 0001) (depends on T001, T014). File: `src/runtime/h5p/index.ts`
- [x] T016 Provide dev/smoke H5P **storage wiring** helpers: filesystem (`FileContentStorage`, `FileLibraryStorage`, `DirectoryTemporaryFileStorage`, `FileContentUserDataStorage`) pointed at `h5p-data/`, and `InMemoryStorage` for tests (depends on T015). File: `src/runtime/h5p/storage.ts`
- [x] T017 Implement the engine **composition seam** in `src/runtime/index.ts`: inject domain-port adapters + H5P storage, expose the use-case and the H5P handlers; framework-agnostic (fail-fast guard added in T027) (depends on T010, T011, T015). File: `src/runtime/index.ts`
- [x] T018 Confirm `pnpm build` (tsc project references) compiles all folders to `dist/` with `.d.ts` (depends on T002, T010–T017). File: `dist/` (output)

**Checkpoint**: Foundation ready — engine + H5P runtime construct; boundary enforced.

---

## Phase 3: User Story 1 - Run the engine locally (Priority: P1) 🎯 MVP

**Goal**: From a clean checkout, one documented command brings up Postgres + fetches H5P assets, the
engine and its H5P runtime boot, and a smoke test passes against the database (SC-001).

**Independent Test**: Clean checkout → `pnpm install` → `pnpm test:smoke` self-provisions an
ephemeral Postgres (Testcontainers), boots the engine + H5P runtime, round-trips through the example
port, reports a pass, and leaves no container/volume behind. (Does **not** require `pnpm dev` first.)

### Tests for User Story 1 ⚠️ (write first, must FAIL before implementation)

- [x] T019 [P] [US1] Smoke test: start an ephemeral `postgres:17-alpine` via `@testcontainers/postgresql`, boot the engine (T017) wired to a test-scoped Postgres example adapter + in-memory H5P storage, round-trip an item through the example port, assert the **H5P runtime initialized** (player/editor construct, AJAX handler responds), and assert teardown / no leftovers (SC-001). File: `tests/smoke/engine-boots.smoke.test.ts`

### Implementation for User Story 1

- [x] T020 [US1] Implement a **test-scoped** Postgres adapter for the example port using `pg`, used only by the smoke run — not shipped, not the published reference adapter (ADR 0001) (depends on T010). File: `tests/smoke/support/pg-example-adapter.ts`
- [x] T021 [US1] Verify the `pnpm dev` path brings up the docker-compose Postgres and runs `h5p:fetch-core`, and document the one-command local flow (FR-004, SC-001) (depends on T005, T008, T009). Files: `docker-compose.yml`, `README.md`

**Checkpoint**: US1 fully functional — clean checkout → running env + H5P runtime + passing smoke (SC-001).

---

## Phase 4: User Story 2 - Integrate Lyceum into a host (Priority: P1)

**Goal**: A host can exercise Lyceum's domain logic against its own (or an in-memory) adapter with no
PostgreSQL dependency; missing adapters fail fast (SC-002, Edge Case).

**Independent Test**: With Docker stopped, `pnpm test:unit` and `pnpm test:contract` pass — core logic
runs on the in-memory adapter, the adapter passes the contract suite, and wiring without an adapter
throws a clear, named error.

### Tests for User Story 2 ⚠️ (write first, must FAIL before implementation)

- [x] T022 [P] [US2] Contract test running `runAdapterContract` against the in-memory adapter. File: `tests/contract/in-memory-adapter.contract.test.ts`
- [x] T023 [P] [US2] Unit test: the `core` use-case runs end-to-end against the in-memory adapter with NO Postgres dependency (SC-002). File: `tests/unit/core-usecase.test.ts`
- [x] T024 [P] [US2] Unit test: composition with a missing required adapter throws a clear fail-fast error naming the port (Edge Case). File: `tests/unit/fail-fast-missing-adapter.test.ts`

### Implementation for User Story 2

- [x] T025 [P] [US2] Implement the in-memory reference adapter for the example port (depends on T010). File: `src/testing/in-memory-adapter.ts`
- [x] T026 [P] [US2] Implement the reusable `runAdapterContract(makeAdapter)` Vitest suite (depends on T010). File: `src/testing/adapter-contract.ts`
- [x] T027 [US2] Add the fail-fast guard to the composition seam: throw a clear error naming the missing port when a required adapter is absent (depends on T017). File: `src/runtime/index.ts`
- [x] T028 [US2] Export the testing surface via the `./testing` subpath; confirm `@lyceumjs/lms/testing` resolves to the adapter + contract helper (depends on T025, T026). Files: `src/testing/index.ts`, `package.json`

**Checkpoint**: US2 fully functional — db-agnostic core proven; contract passes; fail-fast works (SC-002).

---

## Phase 5: H5P Frontend Base (FR-003)

**Purpose**: A minimal H5P frontend so the engine is H5P top-to-bottom, not backend-only

- [x] T029 [P] **FE component test** (TDD, write first / must FAIL): `H5PContent` renders the `@lumieducation/h5p-react` player UI (jsdom) given a content id + the runtime's endpoint config. File: `tests/unit/fe-h5p-content.test.tsx`
- [x] T030 Implement `src/fe/H5PContent.tsx` wrapping `@lumieducation/h5p-react` (`H5PPlayerUI` / `H5PEditorUI`) against the runtime handler endpoints; export from `src/fe/index.ts` (FR-003) (depends on T015, T029). Files: `src/fe/H5PContent.tsx`, `src/fe/index.ts`

**Checkpoint**: FE base renders H5P content via the runtime — FR-003 satisfied end to end.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Surface verification, docs, and the clean-checkout green run

- [x] T031 [P] Unit test asserting all four subpath exports (`.`, `./runtime`, `./fe`, `./testing`) resolve and re-export their folder's public API (`contracts/package-surface.md`). File: `tests/unit/package-surface.test.ts`
- [x] T032 [P] Add a README quickstart section mirroring `specs/001-foundation/quickstart.md` (install / fetch-core / dev / test / smoke / boundary). File: `README.md`
- [x] T033 Finalize the `verify` aggregate script (boundary + unit + contract + smoke) and confirm a green run from a clean checkout (SC-001, SC-002, SC-003) (depends on all prior). File: `package.json`
- [x] T034 [P] Confirm no secrets are tracked: only `.env.example` present; `.env` and `h5p-data/` git-ignored (SC-003). Files: `.gitignore`, `.env.example`
- [x] T035 Run `specs/001-foundation/quickstart.md` end-to-end and confirm every expected outcome holds (depends on T033). File: `specs/001-foundation/quickstart.md` (validation)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — T001 first; T002–T008 parallel after T001; T009 after T001–T008.
- **Foundational (Phase 2)**: depends on Setup — BLOCKS both user stories. H5P wrapper (T014–T016) and the composition seam (T017) are prerequisites for the US1 smoke.
- **US1 (Phase 3)** and **US2 (Phase 4)**: both depend on Foundational; then independent and parallelizable.
- **H5P FE (Phase 5)**: depends on the H5P runtime wrapper (T015); independent of US1/US2 backend work.
- **Polish (Phase 6)**: depends on the prior phases being complete.

### Key task dependencies

- T015 (H5P wrapper) → T016 (H5P storage), T017 (seam), T019 (smoke), T030 (FE).
- T010 (port) → T011, T020, T025, T026.
- T017 (seam) → T019 (smoke), T027 (fail-fast).
- Testcontainers/`pg` devDeps are installed in **T007 (Setup)**, so the T019 smoke test can be authored and run red→green without an ordering hazard.

### Within Each Phase (TDD)

- Tests are written FIRST and must FAIL before implementation (T014→T015, T019→T020, T022–T024→T025–T027, T029→T030).
- Port/interfaces → adapters/wrappers → composition → green tests.

### Parallel Opportunities

- Setup: T002–T008 parallel after T001.
- Foundational: T010/T012/T014 parallel (different files); T011 after T010; T015 after T014; T016/T017 after T015.
- US1 and US2 in parallel once Phase 2 done; H5P FE (Phase 5) in parallel once T015 done.
- US2 tests T022–T024 parallel; US2 impl T025–T026 parallel.
- Polish T031/T032/T034 parallel.

---

## Parallel Example: User Story 2

```bash
# Write the failing tests together first:
Task: "Contract test runAdapterContract vs in-memory adapter in tests/contract/in-memory-adapter.contract.test.ts"
Task: "Unit test core use-case on in-memory adapter (no Postgres) in tests/unit/core-usecase.test.ts"
Task: "Unit test fail-fast on missing adapter in tests/unit/fail-fast-missing-adapter.test.ts"

# Then implement the adapters in parallel:
Task: "In-memory reference adapter in src/testing/in-memory-adapter.ts"
Task: "runAdapterContract suite in src/testing/adapter-contract.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1: Setup (incl. H5P deps + asset-fetch script)
2. Phase 2: Foundational (CRITICAL — port, H5P wrapper, seam, boundary, build)
3. Phase 3: US1 → **STOP and VALIDATE**: clean checkout → running env + H5P runtime + passing smoke (SC-001)
4. Demo the MVP — a real H5P engine that boots and persists

### Incremental Delivery

1. Setup + Foundational → foundation ready (engine + H5P runtime construct)
2. US1 → smoke green against Testcontainers Postgres (MVP, SC-001)
3. US2 → db-agnostic core + contract + fail-fast (SC-002)
4. H5P FE base → render H5P content via the runtime (FR-003)
5. Polish → subpath-surface test, README, `verify` green from clean checkout, no-secrets (SC-003)

---

## Notes

- [P] = different files, no dependency on incomplete tasks.
- Tests precede implementation; verify they fail first (Principle VI / FR-005).
- H5P is installed and wired in this feature (Decision 8). Dev/smoke use h5p-server's fs/in-memory
  storage; the host-DB-vs-fs/S3 choice for H5P storage stays the deferred ADR 0001 open call.
- The domain Postgres adapter here is test-scoped only; the published reference adapter lives in the
  host (ADR 0001).
- No ESLint/Prettier tasks — only dependency-cruiser was accepted for enforcement; revisit formatting
  tooling only if Valery decides to add it.
- Commit policy unchanged: no commits until Valery explicitly authorizes.

## Implementation notes (2026-06-09)

- All tasks implemented and verified: `pnpm verify` (boundary + tsc build + 11 unit/contract + 1
  Testcontainers smoke) passes green; the engine boots with no errors; Testcontainers leaves no
  containers behind.
- **Deviation (T002)**: built with a single `tsconfig.json` (+ `tsconfig.base.json`) compiling
  `src/ → dist/` rather than per-folder TypeScript **project references**. The functional
  requirement (tsc → ESM + `.d.ts`, four subpath exports) is met; project references can be added
  later if incremental-build ordering becomes worthwhile. The `core` boundary is enforced by
  dependency-cruiser regardless.
- H5P dev/smoke storage uses h5p-server's fs/in-memory implementations; core/editor asset download
  script is provided (`pnpm h5p:fetch-core`) but not required for build/test/boot.
