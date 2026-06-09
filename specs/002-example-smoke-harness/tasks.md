# Tasks: Example Smoke Harness

**Input**: Design documents from `specs/002-example-smoke-harness/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md
**Branch**: `develop` (feature pinned via `.specify/feature.json`)

Tests are MANDATORY (constitution VI — TDD): write the failing test first for every behavior.

## Phase 1: Setup (workspace)

- [x] T001 Make the repo a pnpm workspace: `pnpm-workspace.yaml` (member `example`); create `example/package.json` (`@lyceumjs/lms-example`, `private: true`, engine via `workspace:*`, express 5.2.1 / esbuild 0.28.0 / tsx 4.22.4 / pg / react 18 / vitest 4 / @testcontainers/postgresql) and `example/tsconfig.json` (extends `../tsconfig.base.json`, `noEmit`); `pnpm install`
- [x] T002 [P] Example boundary config `example/.dependency-cruiser.cjs` (forbid `../src`, `@lyceumjs/lms/dist/*` deep imports) + root script `boundary:example`; wire into root `verify`

## Phase 2: Foundational — engine domain slice (blocks all stories)

- [x] T003 [P] Failing unit tests for the course use cases (validation paths, save→read-back round-trip via in-memory store) in `tests/unit/course-usecase.test.ts`
- [x] T004 [P] Failing unit tests for the learning-record use cases in `tests/unit/learning-record-usecase.test.ts`
- [x] T005 Course + learning-record entities and ports per data-model.md in `src/core/ports/course-store.ts`, `src/core/ports/learning-record-store.ts`; export from `src/core/index.ts`
- [x] T006 Use cases `createCourse`/`getCourse` in `src/core/usecases/course-usecase.ts` and `recordStatement`/`listActorRecords` in `src/core/usecases/learning-record-usecase.ts` → T003/T004 green
- [x] T007 In-memory reference adapters + reusable contract suites in `src/testing/` (`in-memory-course-store.ts`, `in-memory-learning-record-store.ts`, `course-store-contract.ts`, `learning-record-store-contract.ts`; export from `src/testing/index.ts`); contract runs in `tests/contract/in-memory-course.contract.test.ts` and `tests/contract/in-memory-learning-record.contract.test.ts`
- [x] T008 Extend `createEngine` in `src/runtime/index.ts` (require `courseStore` + `learningRecordStore` with named fail-fast errors; expose bound use cases); extend `tests/unit/fail-fast-missing-adapter.test.ts` and `tests/unit/package-surface.test.ts` first (red→green)
- [x] T009 Gate: `pnpm boundary && pnpm build && pnpm test` fully green

## Phase 3: User Story 1 — smoke-test the engine end-to-end (P1)

- [x] T010 [US1] Example PG adapters + idempotent schema-on-startup (the seed) in `example/src/schema.ts`, `example/src/adapters/pg-example-store.ts`, `pg-course-store.ts`, `pg-learning-record-store.ts`
- [x] T011 [US1] Failing smoke test in `example/tests/smoke.test.ts`: Testcontainers PG 17 → seed → `createEngine` (public surface only) → create full course hierarchy → deep-equal read-back → direct SQL spot-check → clean teardown (SC-003); then make it pass
- [x] T012 [P] [US1] Run the published contract suites against the PG adapters in `example/tests/adapters.contract.test.ts` (Testcontainers)

## Phase 4: User Story 2 — capture and verify a learning record (P2)

- [x] T013 [US2] Extend `example/tests/smoke.test.ts`: simulated learner `answered` statement through `engine.recordStatement` → read back via `listActorRecords` + direct SQL check (red→green)

## Phase 5: H5P fixture through the content-storage handler (FR-009; serves US1 & US3)

- [x] T014 Fixture builder `example/scripts/build-fixture.mjs` (official MIT content-type libraries + our content.json; network — regeneration only); run it once; commit `example/fixtures/lyceum-demo.h5p` + provenance/licenses in `example/fixtures/README.md`
- [x] T015 Fixture install helper `example/src/fixture.ts` (push the package through the runtime's content-storage handler); extend smoke: upload → read back (player model + content listing), course's `ContentRef.h5pContentId` points at it (red→green)

## Phase 6: User Story 3 — check the FE in a real browser (P3)

- [x] T016 [US3] H5P routes (`/h5p/play/:id`, `/h5p/ajax` GET/POST, static core/libraries/content) in `example/src/h5p-routes.ts`; API routes (`/api/content`, `/api/courses`, `/api/xapi`, `/api/records`) in `example/src/api-routes.ts` per contracts/example-host.md
- [x] T017 [US3] Dev-host boot `example/src/server.ts`: env (DATABASE_URL/PORT/H5P_DATA_DIR with safe dev defaults), fail-fast prerequisite checks with actionable messages (FR-006/FR-011), seed-on-startup, idempotent fixture + demo-course install, listen + print URL
- [x] T018 [US3] FE page: `example/public/index.html` + `example/src/web/main.tsx` (renders `H5PContent` from `@lyceumjs/lms/fe`, forwards xAPI `answered` → `POST /api/xapi`, shows records read-back); esbuild bundle script in `example/package.json`
- [x] T019 [US3] Root orchestration scripts in `package.json`: `example:smoke` (build + filtered run) and `example:dev` (build + compose up --wait + h5p:fetch-core + filtered dev)
- [x] T020 [US3] Interactive browser verification via Playwright MCP: start dev host, open URL, see the fixture render, answer it, confirm the record appears (SC-005; FR-012 — no committed browser tests). Evidence reported in chat.
  - *Verified 2026-06-10* (headless Chrome driven via Playwright, screenshots in chat): page renders the MultiChoice fixture through `H5PContent`; clicking the correct answer + Check fires the xAPI `answered` statement; the record (score 1/1, success) is captured via `POST /api/xapi`, persisted, and read back into the page's records list. Zero JS/console errors after stubbing the H5P user-state probe. Dev host moved to port 3020 (3021 reserved for the future admin UI). Note: the Playwright MCP needs `--headless` in `.mcp.json` args to run in WSL2 (no X server) — left for Valery to apply.

## Phase 7: User Story 4 — living reference (P4)

- [x] T021 [P] [US4] `example/README.md`: wiring walkthrough mapped to ADR 0001 seams (storage adapters, identity, HTTP mounting, learning-records sink), run commands, teardown
- [x] T022 [US4] Boundary proof: `pnpm boundary:example` green — example imports the engine only via public subpaths (SC-004)

## Phase 8: Polish

- [x] T023 [P] Root `README.md`: add the two example commands; keep quickstart.md aligned with reality
- [x] T024 Final gates: `pnpm verify` green and `pnpm example:smoke` green from a clean state; update agent context (after_plan hook script); mark all tasks `[x]`

## Dependencies

- Phase 2 blocks Phases 3–7 (engine surface must exist first).
- US1 (T010–T012) blocks US2 (T013) and US3 (T016+) — they extend its wiring.
- T014–T015 (fixture) block T017/T018's playback and the FR-009 smoke extension.
- T020 requires T016–T019 done and Docker running.

## Implementation strategy

MVP = Phase 2 + US1 (hermetic proof the engine persists a real course). Then US2 (records), the
fixture, US3 (browser), US4 (reference docs). Each phase leaves the suite green.
