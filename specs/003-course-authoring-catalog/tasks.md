# Tasks: Course Authoring & Catalog Domain

**Input**: Design documents from `specs/003-course-authoring-catalog/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md
**Branch**: `develop` (feature pinned via `.specify/feature.json`)

Tests are MANDATORY (constitution VI — TDD): write the failing test first for every operation and
every grown port method (red→green). No new dependencies anywhere; the only new module is
`src/core/errors.ts` (plan Structure Decision). Fifteen operations total (R1); ids via
`crypto.randomUUID()` (R2); `createdAt` ISO-8601 set once and catalog sorted in core (R3);
`LyceumDomainError` codes VALIDATION/NOT_FOUND/CONFLICT (R5); `createCourse` reshape is a contained
breaking change updated in-repo (R6).

## Phase 1: Setup

None — the repo already builds, lints, and tests (001/002); this feature is additive with zero new
dependencies, packages, or workspace changes (plan Technical Context / Structure Decision).

## Phase 2: Foundational — error type, grown Course + port (blocks all stories)

- [x] T001 Add `LyceumDomainError extends Error` with `code: 'VALIDATION' | 'NOT_FOUND' | 'CONFLICT'` in `src/core/errors.ts`; export it from `src/core/index.ts`; extend `tests/unit/package-surface.test.ts` to assert the export (red→green)
- [x] T002 [P] Grow the aggregate + port in `src/core/ports/course-store.ts`: add `description?`/`slug?`/`coverImage?`/`createdAt` to `Course`, add `CourseInfo` and `CourseSummary` types (data-model.md), and grow `CourseStorePort` with `list()`/`getBySlug()`/`deleteById()` (contracts/domain-ports.md)
- [x] T003 Extend the reference contract suite in `src/testing/course-store-contract.ts` with failing assertions — `list()` (each saved course once, no dup on re-save), `getBySlug()` (found / undefined / after re-save), `deleteById()` (gone from getById+getBySlug+list, unknown-id no-op, delete-then-re-save), and new-field round-trip (`description`/`slug`/`coverImage`/`createdAt`); already wired via `tests/contract/in-memory-course.contract.test.ts` (red)
- [x] T004 Implement `list()`/`getBySlug()`/`deleteById()` on `InMemoryCourseStore` in `src/testing/in-memory-course-store.ts` (supplies everything to `list`, per FR-004) → T003 green

**Checkpoint**: grown port + reference adapter conform; user-story work can begin.

## Phase 3: User Story 1 — author a course's structure over time (P1) 🎯 MVP

**Goal**: create a course from top-level info and evolve it through discrete unit/lesson/content
operations plus whole-info updates, every accepted change persisted and read back exactly (SC-001,
SC-002).

**Independent Test**: through the public engine surface with the in-memory adapter, create from
info, apply each structural operation + one whole-info update, read back the exact state after each;
invalid ops reject with a path-naming `LyceumDomainError` and leave state untouched.

- [x] T005 [US1] Failing unit tests for course lifecycle in `tests/unit/course-usecase.test.ts` (reshape the existing file): `createCourse(info)` mints id + sets ISO `createdAt` + empty units + returns the created course; slug-format VALIDATION and slug-taken CONFLICT (via `getBySlug`); `updateCourseInfo` NOT_FOUND, clears absent optional fields, never touches structure/`createdAt`; `getCourse` unknown → undefined; `deleteCourse` NOT_FOUND then gone from reads (red)
- [x] T006 [US1] Implement lifecycle ops in `src/core/usecases/course-usecase.ts`: `createCourse(info)` (reshaped — R6), `updateCourseInfo`, `getCourse`, `deleteCourse` — id via `crypto.randomUUID()`, `createdAt` once via `new Date().toISOString()`, slug regex `^[a-z0-9]+(-[a-z0-9]+)*$`, throw `LyceumDomainError` with the right code; keep the `validateCourse` walk as the save-time guard → T005 green
- [x] T007 [US1] Failing unit tests for structure ops in `tests/unit/course-usecase.test.ts`: `addUnit`/`renameUnit`/`reorderUnits`/`removeUnit`, `addLesson`/`renameLesson`/`reorderLessons`/`removeLesson`, `attachContent`/`removeContent` — minted ids, append-last, reorder exact-permutation VALIDATION, path-naming NOT_FOUND, non-empty titles, and "invalid op writes nothing" (read-back unchanged) (red)
- [x] T008 [US1] Implement the ten structure ops in `src/core/usecases/course-usecase.ts` (read-modify-write: load → validate → save; return the created element for adds) → T007 green
- [x] T009 [US1] Expose the US1 operations through the public surface: export the 14 authoring ops + `CourseInfo` from `src/core/index.ts`; grow the `LyceumEngine` interface + `createEngine` bindings in `src/runtime/index.ts` (including the reshaped `createCourse(info)`); extend `tests/unit/package-surface.test.ts` for the new core exports (red→green)

**Checkpoint**: US1 fully functional and independently testable through the engine surface.

## Phase 4: User Story 2 — browse the catalog (P2)

**Goal**: `listCatalog()` returns course summaries (id, title, slug, description, cover ref,
unit/lesson counts) newest-first (SC-003).

**Independent Test**: create several courses through the surface, request the catalog, assert
exactly the expected summaries in `createdAt`-desc order; an empty store yields `[]`.

- [x] T010 [US2] Failing unit tests for `listCatalog` in `tests/unit/course-usecase.test.ts`: summaries carry `unitCount`/`lessonCount` (total lessons across units), order is `createdAt` desc with `id` lexicographic tie-break, empty store → `[]`, deleted/absent courses do not appear; plus a `listCatalog`/`CourseSummary` export assertion in `tests/unit/package-surface.test.ts` (red)
- [x] T011 [US2] Implement `listCatalog` + core-side `CourseSummary` derivation and sort (R3) in `src/core/usecases/course-usecase.ts`; export `listCatalog` + `CourseSummary` from `src/core/index.ts`; add the `listCatalog` method + binding in `src/runtime/index.ts` → T010 green

**Checkpoint**: US1 and US2 both work independently.

## Phase 5: User Story 3 — host wires the new domain through the public surface (P3)

**Goal**: the example's PG adapter + smoke exercise authoring and catalog end-to-end via the public
surface only, and the grown contract suite passes against the PG adapter (SC-004, SC-005).

**Independent Test**: `pnpm example:smoke` authors structure changes and lists the catalog against a
real containerized DB and reports pass; the grown `runCourseStoreContract` passes against
`PgCourseStore`.

- [x] T012 [US3] Grow the example PG adapter: add a `slug` column with a unique partial index (`WHERE slug IS NOT NULL`) and a `created_at` column in `example/src/schema.ts`, and implement `list()`/`getBySlug()`/`deleteById()` + mirror the new fields from the JSONB doc in `example/src/adapters/pg-course-store.ts`; the already-wired grown `runCourseStoreContract` in `example/tests/adapters.contract.test.ts` now passes against it (red→green)
- [x] T013 [US3] Extend `example/tests/smoke.test.ts` to the FR-008 scenario through the public surface: create from info → unit/lesson/content ops + one whole-info update → second course → assert the catalog lists both newest-first with correct summaries → delete one → assert it is gone from catalog and reads; rewrite the 002 H5P fixture course to the new authoring flow so the FR-009 fixture path and the US2 learning-record checks stay green (red→green)
- [x] T014 [P] [US3] Add authoring + catalog routes to `example/src/api-routes.ts` mapping `LyceumDomainError.code` (VALIDATION→400, NOT_FOUND→404, CONFLICT→409): `POST /api/courses` (info), `PATCH /api/courses/:id/info`, `DELETE /api/courses/:id`, unit/lesson/content add/rename/remove + `PUT …/order`, `GET /api/catalog` (example-only living reference, contracts/engine-operations.md)

**Checkpoint**: all stories independently functional; the example is a living integration reference.

## Phase 6: Polish

- [x] T015 [P] Boundary proof: `pnpm boundary` (core imports no runtime/fe/db/http) and `pnpm boundary:example` (example imports the engine only via public subpaths) green — SC-004
- [x] T016 Quickstart walkthrough + final gates: `pnpm test`, `pnpm build`, and `pnpm example:smoke` green from a clean checkout (quickstart.md); refresh agent context (after_plan hook) and touch up README/docs if any; mark all tasks `[x]`

## Dependencies

- Phase 2 blocks Phases 3–5 (the error type, grown `Course`, and grown port must exist first).
- Within Phase 2: T002 before T003 (the suite asserts the grown port) before T004 (impl greens it); T001 is independent.
- US1 (Phase 3) before US2 (Phase 4): `listCatalog` orders by `createdAt`, which only `createCourse` sets — the catalog reads what US1 writes.
- US3 (Phase 5) depends on US1 + US2 (its smoke and routes call the full operation surface). Within US3: T012 before T013 (the smoke scenario needs the grown adapter); T014 depends only on the engine surface (US1/US2), so it runs in parallel with T012/T013.
- Polish after all stories.

## Parallel execution examples

- **Foundational**: T001 (errors + surface test) and T002 (grown Course + port) touch different files → run together; then T003 → T004 sequentially.
- **US1**: all ops share `course-usecase.ts` and its test → sequential — run T005→T006, then T007→T008, then T009.
- **US2**: T010→T011 sequential (same use-case file).
- **US3**: T014 (example routes) runs in parallel with T012 (adapter); T013 (smoke) after T012.
- **Polish**: T015 (boundary) parallel with the doc portion of T016; T016's final gates run last.

## Implementation strategy

MVP = Phase 2 + US1 — authoring proven through the public surface on the in-memory adapter. Then US2
(the catalog read model), then US3 (PG adapter + hermetic smoke + example routes). Each phase leaves
`pnpm test` green. The breaking `createCourse` reshape (R6) is contained in-repo — the example is
updated in US3 and no external consumer imports the engine yet, so nothing downstream breaks.
