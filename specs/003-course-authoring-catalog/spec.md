# Feature Specification: Course Authoring & Catalog Domain

**Feature Branch**: `develop` (pinned via `.specify/feature.json`; feature branches not in use yet)

**Created**: 2026-07-04

**Status**: Draft

**Input**: User description: "Course authoring & catalog domain (Lyceum 003): real authoring
use-cases over the existing course aggregate (create/edit course → units → lessons structure), a
catalog listing read model, exposed as framework-agnostic handlers; grow CourseStorePort beyond
save/getById (list/query for the catalog). H5P interactive content and enrollment/progress stay
out of scope." (Scope accepted by Valery, 2026-07-04.)

## Context

Spec 002 left the engine with a storable course aggregate (course → units → lessons → content
references), a create-and-read-back use-case, and a proven host-integration seam — but no way to
change a course after creation and no way to list courses at all. The first consumer
(`lms-starter-kit`) has meanwhile shipped roles and a publish-approval workflow (its feature 002)
and is waiting on a real content domain to wire in; its own next feature will implement the
storage port against its datastore and mount the engine's operations — that host work is **not**
part of this feature.

This feature is the first real domain slice: **authoring** (evolve a course's structure over
time) and the **catalog** (the browsable listing of available courses), delivered engine-side
through the existing seams (ADR 0001) — domain rules in the core, operations exposed through the
engine's public framework-agnostic surface, the storage port grown accordingly, and the in-memory
reference adapter plus the adapter contract-test helper extended so any host can prove
conformance.

## Clarifications

### Session 2026-07-04

- Q: What decides whether a course is "available" in the catalog? → A: The platform (host) —
  fully. Lyceum manages the content only, not the logic or privacy of courses; the catalog lists
  the courses the host's storage adapter supplies, and any publication/privacy filtering (e.g.
  the starter-kit's publish-approval workflow) happens host-side. Lyceum models no publication
  state. (Valery, 2026-07-04)
- Q: What does a course / catalog entry carry beyond id + title? → A: A richer descriptive set —
  description, URL slug, and a cover-image reference. The reference is opaque; media storage and
  serving stay host-side. (Valery, 2026-07-04)
- Q: Is deleting a course in scope this iteration? → A: Yes — full lifecycle: create, edit,
  delete. (Valery, 2026-07-04)
- Q: How does an author's edit reach the engine — a whole updated structure or discrete
  operations? → A: Hybrid — the course's **top-level info** (title + descriptive set) is updated
  as a whole; everything beneath (units, lessons, and so on — including a lesson's content
  references) changes through **discrete unit operations** (add / rename / reorder / remove;
  attach / remove for content references). A new course starts from its top-level info with an
  empty structure; on the platform it appears as a draft on the teacher dashboard until
  published there — that draft/published state stays host-side, per FR-004. (Valery, 2026-07-04)
- Q: Who mints ids — the course at creation, units/lessons created by operations? → A: The
  engine. It generates an id for everything it creates and returns the created element; hosts
  treat ids as opaque. (Valery, 2026-07-04)
- Q: What defines the catalog's "stable order"? → A: Creation time, newest first. The course
  records its creation time; hosts may re-sort for presentation. (Valery, 2026-07-04)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Author a course's structure over time (Priority: P1)

As a course author (identity supplied by the host), I can create a course from its top-level
info (title and descriptive fields; the structure starts empty) and then keep shaping it through
discrete operations — add, rename, reorder, and remove units and lessons, and attach or remove a
lesson's content references — while the top-level info itself is updated as a whole. Every
accepted change is persisted and readable back exactly as edited.

**Why this priority**: authoring today is create-once; a real LMS needs the curriculum to evolve.
This is the heart of the slice — the catalog and everything downstream read what this writes.

**Independent Test**: through the public engine surface only (with the in-memory reference
adapter), create a course from top-level info, apply each kind of structural operation plus one
whole top-level info update, and read the course back after each change confirming the exact
resulting state.

**Acceptance Scenarios**:

1. **Given** a freshly created course (empty structure), **When** I add a unit and then lessons
   within it, **Then** reading the course back returns the new structure in the authored order.
2. **Given** a course with units and lessons, **When** I rename, reorder, or remove elements —
   or update the course's top-level info as a whole, **Then** the read-back reflects exactly the
   applied change, order included.
3. **Given** an invalid operation (empty title, duplicate slug, or an operation targeting a
   missing element), **When** it is applied, **Then** it is rejected with a clear, path-naming
   error and the stored course is unchanged.

---

### User Story 2 - Browse the catalog (Priority: P2)

As a learner or a host application, I can request the catalog and receive the list of available
courses as lightweight summaries (not full structures) in newest-first creation order.

**Why this priority**: the catalog is the discovery entry point that the host's catalog UI and
later enrollment build on; it comes second because it only reads what US1 writes.

**Independent Test**: create several courses through the public surface, request the catalog, and
verify exactly the expected summaries; an empty store yields an empty list.

**Acceptance Scenarios**:

1. **Given** several stored available courses, **When** the catalog is requested, **Then** each
   appears exactly once as a summary, in creation order, newest first.
2. **Given** an empty store, **When** the catalog is requested, **Then** the result is an empty
   list, not an error.
3. **Given** a course the host no longer supplies to the catalog (its platform rule) or that has
   been deleted, **When** the catalog is requested, **Then** that course does not appear.

---

### User Story 3 - Host wires the new domain through the public surface (Priority: P3)

As an adopter, my host gains all authoring and catalog operations by implementing the (grown)
storage port and mapping its routes to the engine's operations — proven by the extended example
harness and the published adapter contract tests, with no reach into engine internals.

**Why this priority**: keeps the engine honest as a library and the example a living integration
reference (carrying forward spec 002 US4); valuable but dependent on US1/US2 existing.

**Independent Test**: the example smoke run exercises authoring edits and catalog listing
end-to-end via the public surface; the adapter contract-test helper covers every grown port
operation and passes against the in-memory reference adapter.

**Acceptance Scenarios**:

1. **Given** the extended example, **When** its automated smoke runs with the single documented
   command, **Then** it authors structure changes and lists the catalog against its real
   containerized database and reports a pass.
2. **Given** the adapter contract-test helper, **When** run against the in-memory reference
   adapter, **Then** all grown port operations pass.

---

### Edge Cases

- Editing or deleting a course that does not exist → a clear "not found" domain error, not a
  silent create or a silent no-op.
- A duplicate or non-URL-safe slug → the edit is rejected with a clear error.
- A reorder referencing missing or duplicated element ids → the whole operation is rejected; no
  partial write.
- Two writers editing the same course → last accepted write wins this iteration; no locking or
  merge (see Assumptions).
- Catalog requested while a course is mid-edit → the catalog shows the last persisted state.
- Content references are attached to and removed from lessons as opaque pointers; they are
  **not** validated against H5P storage this iteration (see Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Course authors MUST be able to create a course from its top-level info (title plus
  the descriptive set; the structure starts empty) and evolve it afterwards: the top-level info
  is updated **as a whole**, while the structure beneath changes through **discrete operations**
  — add, rename, reorder, and remove for units and for lessons within a unit, plus attach/remove
  of a lesson's (opaque) content references. Curriculum order is meaningful and MUST be
  preserved exactly as authored. The engine mints the identifier for everything it creates (the
  course on create, a unit or lesson on add) and returns the created element; hosts treat ids as
  opaque. (Valery, 2026-07-04)
- **FR-002**: Every operation MUST be validated against the current stored state and the domain
  invariants (non-empty titles, unique ids within the aggregate, unique slug, operations target
  existing elements) and rejected with a clear, path-naming error that leaves the stored state
  untouched.
- **FR-003**: The course MUST carry a descriptive set alongside its structure — description,
  URL slug, and cover-image reference — and the system MUST provide a catalog listing that
  returns courses as summaries (id, title, slug, description, cover-image reference, and
  unit/lesson counts), not full structures, ordered by creation time, newest first. The course
  records its creation time to support this ordering. (Valery, 2026-07-04)
- **FR-004**: The catalog MUST NOT encode publication or privacy logic: Lyceum lists the courses
  the host's storage adapter supplies. What a platform exposes to the catalog (e.g. only courses
  its own workflow has published) is entirely the host's rule; Lyceum models no publication
  state. (Valery, 2026-07-04)
- **FR-005**: Course authors MUST be able to delete a course; a deleted course MUST disappear
  from the catalog and from subsequent reads. Cleanup of interactive content referenced by the
  deleted course is out of scope this iteration (references are opaque).
- **FR-006**: The storage port MUST grow only the operations the above capabilities need
  (listing for the catalog, deletion), keeping the core database-agnostic; the in-memory reference adapter and the
  adapter contract-test helper MUST cover every grown operation.
- **FR-007**: All new operations MUST be reachable through the engine's public,
  framework-agnostic surface that a host maps its routes to; Lyceum still never runs its own
  HTTP server (ADR 0001).
- **FR-008**: The example harness MUST be extended so its automated smoke exercises authoring
  edits and catalog listing end-to-end through the public surface. Headless only — no new
  browser UI this iteration.

### Key Entities

- **Course (aggregate)**: the existing content hierarchy — course → units → lessons → content
  references — grown with the descriptive set: description, URL slug, and cover-image reference
  (optional; slug URL-safe and unique across courses when present — see Assumptions), plus a
  creation timestamp (for catalog ordering). Top-level info is updated as a whole; ids are
  engine-minted.
- **Unit / Lesson**: ordered structural elements of the curriculum, individually addressable by
  the discrete operations.
- **Content Reference**: opaque pointer attached to / removed from a lesson; H5P linkage
  unchanged this iteration.
- **Catalog Entry**: the summary read model of an available course.
- **Course Store (port)**: the grown persistence contract a host implements.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Through the public surface alone, a course can be driven from creation through at
  least five distinct structural operations (add / rename / reorder / remove, at both unit and
  lesson level) plus one whole top-level info update, with the read-back matching exactly after
  every change.
- **SC-002**: 100% of invalid edits exercised by the test suite are rejected with a path-naming
  error and leave the previously stored structure intact.
- **SC-003**: After any authoring session in the example run (edits and deletions included),
  the catalog contains exactly the courses the store supplies, each once, in newest-first
  creation order.
- **SC-004**: A host adopts the new capabilities by implementing only the grown port and mapping
  routes: the extended example does exactly this with zero engine-internal imports, and the
  published contract tests pass against both the in-memory reference adapter and the example's
  database adapter.
- **SC-005**: The extended example smoke completes from a clean checkout with the single
  documented command and reports a pass.

## Assumptions

- Identity and permissions stay host-owned (ADR 0001): the engine enforces no roles; who may
  author or browse is the host's gate. Lyceum models no course ownership this iteration — the
  starter-kit keeps authorship on its side.
- Concurrent edits resolve as last-write-wins; locking/merge semantics are deferred until a
  multi-author host needs them.
- Catalog scale is small (single-instructor MVP): no pagination, search, or filtering. The
  newest-first creation order is the only guaranteed ordering; hosts re-sort for presentation if
  they wish.
- Content references are opaque this iteration; H5P storage and playback remain as delivered by
  spec 002.
- The descriptive fields (description, slug, cover-image reference) are optional on a course; a
  slug, when present, is URL-safe and unique across courses.
- The cover-image reference is an opaque pointer (URL or host asset id); storing and serving the
  media it points to stays host-side.
- The host-side wiring (the starter-kit's datastore adapter, route mounting, and any authoring or
  catalog UI) is the starter-kit's own next feature, not part of this one.
- The example extension is the headless automated smoke; the dev-host browser page is unchanged.

## Non-goals

- H5P interactive-content authoring or editor integration.
- Enrollment, progress, completion, certificates, assessments/grading.
- Roles or permissions inside Lyceum.
- Catalog pagination, search, or filtering.
- A publish-approval workflow or any publication/privacy state inside Lyceum — course visibility
  is entirely the platform's concern; the starter-kit's host-side workflow (its feature 002) is
  not duplicated here.
- Media storage or serving — the cover image is an opaque reference the host resolves.
- Host-side UI of any kind.
