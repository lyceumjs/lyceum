# Research: Course Authoring & Catalog Domain

Scope, the hybrid edit model, id minting, catalog ordering, and full-lifecycle deletion were
decided by Valery in the spec's Clarifications (2026-07-04). The decisions below translate those
into concrete engineering choices; R1–R5 are the agent's recommendations pending Valery's review
of this plan, R6–R7 are consequences. **No new dependencies are introduced**, so no version
research was needed this iteration (stack pinned by 001/002).

## R1 — Operation surface: fifteen plain, validated functions

- **Decision**: map the spec's hybrid model 1:1 to named operations, in 002's existing style
  (plain async functions over the port, re-exposed as engine methods):
  `createCourse(info)`, `updateCourseInfo`, `getCourse`, `deleteCourse`, `listCatalog`;
  `addUnit`, `renameUnit`, `reorderUnits(orderedUnitIds)`, `removeUnit`;
  `addLesson`, `renameLesson`, `reorderLessons(unitId, orderedLessonIds)`, `removeLesson`;
  `attachContent`, `removeContent`.
  Reorders take the full ordered id list and must be an exact permutation of the existing set
  (spec Edge Case). Each operation is read-modify-write: load aggregate → validate → save.
- **Rationale**: matches the accepted authoring model exactly; intent-level operations give the
  path-naming, per-operation errors FR-002 demands; no framework needed.
- **Alternatives considered**: whole-structure update (rejected by Valery in clarification Q1 —
  only top-level info updates as a whole); a command-object/dispatcher pattern (over-engineering
  for 15 functions; Principle VII's spirit).

## R2 — Id minting: `crypto.randomUUID()`, no injectable generator

- **Decision**: the engine mints ids (course on create, unit/lesson on add, content ref on
  attach) with the standard `crypto.randomUUID()` global; the created element is returned to the
  caller. No id-generator port.
- **Rationale**: Valery decided engine-minted, host-opaque ids. `crypto.randomUUID()` is a
  platform-neutral built-in (Node ≥20, browsers) — zero imports, so the core boundary is
  untouched. Tests don't need deterministic ids because every create/add returns the element.
- **Alternatives considered**: caller-supplied ids (rejected in clarification); an injectable
  `IdGenerator` port (YAGNI — adds surface for a determinism no test needs).

## R3 — `createdAt` + ordering computed in core

- **Decision**: `createdAt` is an ISO-8601 UTC string set once in `createCourse` via `new
  Date().toISOString()`, immutable afterwards. `listCatalog` sorts in core: `createdAt`
  descending, tie-broken by `id` (lexicographic) for full determinism. The port carries **no
  ordering contract**.
- **Rationale**: "Lyceum computes, the host stores" (ADR 0001) — pushing `ORDER BY` into every
  adapter would smear a domain rule across hosts; same-millisecond creations need a tie-break
  anyway.
- **Alternatives considered**: adapter-side ordering (rejected above); injectable clock
  (unneeded — ordering tests can create sequentially and assert relative order, or stub `Date`
  via Vitest fake timers without engine support).

## R4 — Port growth kept minimal: `list`, `getBySlug`, `deleteById`

- **Decision**: `CourseStorePort` grows exactly three methods:
  - `list(): Promise<Course[]>` — the courses the adapter supplies to the catalog, any order.
    Per FR-004 the adapter's rule decides what appears (the starter-kit will supply only
    published courses); the in-memory reference adapter supplies everything it stores.
  - `getBySlug(slug): Promise<Course | undefined>` — looks up across the **entire store**
    (including courses the adapter would not supply to the catalog); backs the slug-uniqueness
    invariant and, later, host routing by slug.
  - `deleteById(id): Promise<void>` — idempotent; existence is checked by the use-case via
    `getById` first (NOT_FOUND is a domain concern, not the adapter's).
  Catalog summaries (unit/lesson counts) are derived in core from the full aggregates `list()`
  returns.
- **Rationale**: FR-006 says grow only what's needed. A "management listing" is not added — the
  host owns its datastore (accepted double-modeling, ADR 0001) and queries it directly for its
  teacher dashboard. Summary-shaped port results would push a read-model contract onto adapters
  for no benefit at the spec's assumed scale.
- **Alternatives considered**: `listAll`/`listAvailable` pair (deferred until some host needs
  both semantics through Lyceum); summary-shaped `list` (premature optimization; complicates
  every adapter); slug uniqueness via full-store scan of `list()` (wrong — `list()` is
  catalog-scoped by design, a filtered adapter would let duplicate slugs through).

## R5 — Typed domain errors: `LyceumDomainError` with a code

- **Decision**: add `core/errors.ts` with `LyceumDomainError extends Error` carrying
  `code: 'VALIDATION' | 'NOT_FOUND' | 'CONFLICT'`. All operation failures throw it; messages
  keep 002's path-naming `Lyceum: …` style. Suggested host mapping (documented in
  [contracts/engine-operations.md](./contracts/engine-operations.md)): VALIDATION → 400,
  NOT_FOUND → 404, CONFLICT → 409.
- **Rationale**: hosts must translate domain failures into transport responses; matching on
  message strings is brittle and against Principle I's "integration path obvious".
- **Alternatives considered**: message-only `Error` as in 002 (breaks host mapping); one error
  subclass per failure case (surface bloat for three semantics).

## R6 — Breaking change to the 002 surface, contained in-repo

- **Decision**: `createCourse` changes from "caller supplies the full aggregate with ids" to
  "caller supplies top-level info; engine returns the created course". The example harness is
  updated in this same feature; `validateCourse`'s whole-aggregate walk survives internally as
  the save-time guard.
- **Rationale**: direct consequence of the accepted authoring model. Package is `0.0.0`; the
  starter-kit vendors the tarball but imports nothing from it yet (verified against its
  `src/`+`tests/` on 2026-07-04), so no external consumer breaks. The host refreshes its
  vendored tarball when it wires the engine in (its own upcoming feature).
- **Alternatives considered**: keeping the old signature alongside a new one (two ways to do one
  thing — violates Principle II).

## R7 — Slug rules

- **Decision**: optional field; when present it MUST match `^[a-z0-9]+(-[a-z0-9]+)*$` and be
  unique across the whole store (checked via `getBySlug`; duplicate → CONFLICT naming the
  holder). The engine never auto-generates slugs from titles this iteration.
- **Rationale**: spec assumption (optional, URL-safe, unique when present); auto-slugging is a
  host/UX nicety that can land host-side or later without engine changes.
- **Alternatives considered**: mandatory slug (rejected — 002 data has none, and drafts may not
  care); auto-generation with de-duplication (hidden magic; deferred until asked for).
