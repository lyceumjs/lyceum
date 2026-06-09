<!--
Sync Impact Report
- Version: (none) → 1.0.0  (initial ratification)
- Version: 1.0.0 → 1.1.0  (added Principle VII; expanded Tech Stack & Scope with distribution/integration shape)
- Version: 1.1.0 → 1.2.0  (recorded ownership boundary: Lyceum owns the full learning-management domain; host keeps auth/user-management/glue)
- Principles: I. Open Source, Clean & Integrable · II. Opinionated by Design ·
  III. Database-Agnostic Core · IV. H5P Frontend, Real Backend ·
  V. Environment Compatibility · VI. Spec-Driven + Test-Driven Development ·
  VII. One Package Until a Trigger
- Added sections: Tech Stack & Scope; Governance
- Templates: plan/spec/tasks templates reference the constitution generically → no edits required
- Deferred/TODO: detailed host-integration decision recorded in specs/adr/0001-integration-architecture.md
  (resolves the open question carried in specs/001-foundation)
-->

# Lyceum Constitution

Lyceum is an open-source, database-agnostic LMS engine (H5P frontend + backend) built to be
embedded in other projects, and is the LMS engine the `lms-starter-kit` integrates. This
constitution captures only decisions the author has accepted. Authorship and working norms live
in `CLAUDE.md` and are not restated here.

## Core Principles

### I. Open Source, Clean & Integrable
Lyceum is maintained open source under a commercially unrestricted (MIT-class) license. It is a
library/engine others embed, not a monolith: the public surface stays small, dependencies light,
and the integration path obvious. Ease of integration is a first-class requirement.

### II. Opinionated by Design
Integrable does not mean infinitely configurable. Lyceum ships sane defaults and conventions and
prefers one clear, opinionated path over a sea of options. Configuration exists where it earns its
keep, not everywhere.

### III. Database-Agnostic Core
Domain and business logic carry zero persistence coupling. Storage is reached only through
ports/adapters, so any datastore can back Lyceum. PostgreSQL is the development and reference
adapter, never a hard dependency.

### IV. H5P Frontend, Real Backend
The frontend is built on H5P as its base (interactive learning content). Lyceum also owns a
backend for content runtime, storage adapters, and learning records — it is not a frontend-only
widget.

### V. Environment Compatibility
Lyceum MUST run in and alongside the `lms-starter-kit` environment: Node.js + TypeScript,
interoperable with the starter kit's Next.js / Payload / PostgreSQL stack, with Dockerized local
development. Choices that would break that compatibility are out of bounds.

### VI. Spec-Driven + Test-Driven Development
Specs and ADRs precede code (SDD). Business logic is developed test-first (TDD,
red-green-refactor) and MUST stay covered by tests. Only stated or accepted material is persisted
to specs; specs and `CLAUDE.md` stay thin and non-repeating.

### VII. One Package Until a Trigger
Lyceum ships as a **single published package** with one internal boundary of three concerns:
`core` (pure domain + ports), `runtime` (H5P/server wiring exposed as framework-agnostic
handlers, never Lyceum's own HTTP server), and `fe` (H5P content components). `core` MUST NOT
import `runtime`, `fe`, `@lumieducation/h5p-server`, or any database/HTTP library — this boundary
is enforced by lint, not by convention. The package MUST NOT be split into further packages or
repositories on aesthetics; it is split only when a concrete trigger forces it: a **second host**
needing a shared storage adapter, a **non-React host** needing a framework-neutral frontend, or
demand for the **domain core without H5P**. Reference storage adapters live in the consuming host
until a second consumer extracts them. This principle is the standing guard against
over-engineering: structure is added in response to a real need, never in anticipation of one.

## Tech Stack & Scope

- Stack: Node.js + TypeScript; H5P-based frontend; a backend for content runtime, storage
  adapters, and learning records. Persistence is adapter-based; PostgreSQL is the dev/reference DB.
- Local dev: Dockerized, including a PostgreSQL container for local development and smoke testing.
- Ownership boundary: Lyceum owns the **entire learning-management domain and content**,
  top-to-bottom — courses as content (course → units → lessons → H5P content), catalog, assessments
  and grading, enrollment, progress, completion, certificates, and learning history (xAPI/LRS). A
  host keeps only the non-learning top layer: authentication, user management, and the glue that
  wires everything together. The host still provides persistence via adapters (it implements
  Lyceum's storage ports) but does not own the learning domain. Detail in
  `specs/adr/0001-integration-architecture.md`.
- Distribution: Lyceum and the projects that consume it (e.g. `lms-starter-kit`) live as
  separate repositories under a single GitHub organization, not under a personal account.
- Integration is framework-agnostic: Lyceum exposes handlers that a host mounts; it does not run
  its own HTTP server. The reference Postgres/DB adapter is written directly in the consuming host
  (the `lms-starter-kit`) for now, not published as a separate package.
- The detailed host-integration architecture is recorded in
  `specs/adr/0001-integration-architecture.md`.

## Governance

This constitution supersedes other practices where they conflict. Amendments are made by the
author as accepted specs/ADRs, following the authorship rules in `CLAUDE.md`. Versioning: MAJOR
for incompatible principle changes, MINOR for added/expanded guidance, PATCH for clarifications.

**Version**: 1.2.0 | **Ratified**: 2026-06-09 | **Last Amended**: 2026-06-09
