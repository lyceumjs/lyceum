# Implementation Plan: Course Authoring & Catalog Domain

**Branch**: `develop` (feature branches not in use yet) | **Date**: 2026-07-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-course-authoring-catalog/spec.md`

## Summary

Grow the course domain from 002's create-and-read-back into real authoring, per the spec's
clarified model (Valery, 2026-07-04):

1. **Authoring** (US1): create a course from top-level info (engine-minted id, recorded creation
   time, empty structure); update top-level info **as a whole**; change the structure through
   **discrete operations** — add/rename/reorder/remove for units and lessons, attach/remove for a
   lesson's opaque content references; delete the course. Every operation validates against
   current stored state and fails with a path-naming, typed error without partial writes.
2. **Catalog** (US2): a read model of course summaries (id, title, slug, description, cover ref,
   unit/lesson counts), **sorted newest-first in core** — adapters carry no ordering or
   publication logic (availability is what the adapter supplies, FR-004).
3. **Seam growth** (US3): `CourseStorePort` grows `list` / `getBySlug` / `deleteById`; the
   in-memory reference adapter and the published contract suite cover every new operation; the
   engine surface exposes the operations; the example's PG adapter and automated smoke exercise
   the whole flow end-to-end (FR-008).

**No new dependencies** — engine or example. Ids via the standard `crypto.randomUUID()` global,
timestamps via `Date`; both are platform-neutral built-ins the core boundary permits.

## Technical Context

Carried over (001/002, decided by Valery): TypeScript ESM-only, Node `>=20.9`, pnpm 9 workspace,
Vitest 4, `tsc` build, dependency-cruiser core boundary, `example/` as the private dev-only
workspace package (Express 5, esbuild, tsx, `pg`, Testcontainers), compose-managed dev DB.

New in this feature (details + alternatives in [research.md](./research.md)):

- **Operation surface** (R1): fifteen named engine operations mapping 1:1 to the spec's hybrid
  model — no command-object framework, plain validated functions like 002's use-cases.
- **Identity & time** (R2, R3): engine mints ids with `crypto.randomUUID()`; `createdAt` is an
  ISO-8601 string set once at creation. Catalog order (createdAt desc, id tie-break) is computed
  in core so every adapter stays dumb.
- **Port growth kept minimal** (R4): `list()` (what the adapter supplies to the catalog),
  `getBySlug()` (whole-store lookup backing the slug-uniqueness invariant), `deleteById()`.
  Summaries are derived in core from full aggregates — fine at the spec's assumed scale.
- **Typed domain errors** (R5): a small `LyceumDomainError` with `code:
  VALIDATION | NOT_FOUND | CONFLICT` so hosts map failures to transport responses without
  string-matching; messages keep 002's path-naming `Lyceum: …` style.
- **Breaking change contained** (R6): `createCourse` changes signature (info, not a full
  aggregate). The example is updated in this same feature; the starter-kit does not import the
  engine yet (verified 2026-07-04), so no consumer breaks.

Performance/scale: catalog derives from full aggregates at MVP scale (spec assumption — no
pagination/search); no perf targets this iteration.

## Constitution Check

| Principle | Gate | Status |
|---|---|---|
| I. Open Source, Clean & Integrable | Small public surface; light deps | PASS — zero new dependencies; the surface grows one coherent, documented operation set + 3 port methods |
| II. Opinionated by Design | One clear path | PASS — exactly one authoring model (whole-info + discrete structure ops), fixed in the spec's Clarifications; no configuration knobs |
| III. Database-Agnostic Core | Zero persistence coupling in core | PASS — ordering, summaries, id minting, and all invariants live in `core`; adapters only store/fetch/delete; boundary still lint-enforced |
| IV. H5P Frontend, Real Backend | Real H5P where touched | PASS (n/a growth) — content refs stay opaque by spec; the smoke keeps playing the 002 fixture path so nothing regresses |
| V. Environment Compatibility | Node+TS, Docker dev parity | PASS — no environment changes; compose + Testcontainers as in 002 |
| VI. Spec-Driven + Test-Driven | Specs precede code; TDD | PASS — this plan precedes code; each operation and each grown port method lands red→green (unit + contract) |
| VII. One Package Until a Trigger | No premature splits | PASS — no new packages/folders beyond one `core/errors.ts` module; `example/` stays the single private member |

No violations → Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-course-authoring-catalog/
├── spec.md
├── plan.md                    # This file
├── research.md                # Phase 0 — decisions R1–R7
├── data-model.md              # Phase 1 — grown Course aggregate, CourseSummary, validation rules
├── quickstart.md              # Phase 1 — how to validate the feature end-to-end
├── contracts/
│   ├── domain-ports.md        # grown CourseStorePort contract
│   └── engine-operations.md   # the public authoring/catalog operation surface + error codes
└── tasks.md                   # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
lyceum-lms/
├── src/
│   ├── core/
│   │   ├── errors.ts                       # NEW — LyceumDomainError (VALIDATION/NOT_FOUND/CONFLICT)
│   │   ├── ports/course-store.ts           # Course + description/slug/coverImage/createdAt;
│   │   │                                   #   port + list / getBySlug / deleteById
│   │   ├── usecases/course-usecase.ts      # createCourse(info) reshaped; + updateCourseInfo,
│   │   │                                   #   unit/lesson/content ops, deleteCourse, listCatalog
│   │   └── index.ts                        # exports the new operations, types, error
│   ├── runtime/index.ts                    # LyceumEngine grows the operation methods
│   └── testing/
│       ├── in-memory-course-store.ts       # implements the grown port
│       └── course-store-contract.ts        # contract suite covers list/getBySlug/deleteById
├── tests/
│   ├── unit/                               # course-usecase: every operation red→green
│   └── contract/                           # in-memory run of the grown contract suite
└── example/
    ├── src/adapters/                       # PG course adapter: new columns + grown operations
    ├── src/api-routes.ts                   # authoring + catalog routes (example-only surface)
    └── tests/
        ├── smoke.test.ts                   # extended authoring+catalog scenario (FR-008)
        └── adapters.contract.test.ts       # published suite vs the grown PG adapter
```

**Structure Decision**: additive to the 002 layout; the only new module is `core/errors.ts`. No
new packages, no new top-level folders.

## Complexity Tracking

> No constitution violations — section intentionally empty.
