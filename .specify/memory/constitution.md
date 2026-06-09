<!--
Sync Impact Report
- Version: (none) → 1.0.0  (initial ratification)
- Principles: I. Open Source, Clean & Integrable · II. Opinionated by Design ·
  III. Database-Agnostic Core · IV. H5P Frontend, Real Backend ·
  V. Environment Compatibility · VI. Spec-Driven + Test-Driven Development
- Added sections: Tech Stack & Scope; Governance
- Templates: plan/spec/tasks templates reference the constitution generically → no edits required
- Deferred/TODO: H5P backend integration into lms-starter-kit (see specs/001-foundation)
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

## Tech Stack & Scope

- Stack: Node.js + TypeScript; H5P-based frontend; a backend for content runtime, storage
  adapters, and learning records. Persistence is adapter-based; PostgreSQL is the dev/reference DB.
- Local dev: Dockerized, including a PostgreSQL container for local development and smoke testing.
- Integration with `lms-starter-kit`: the backend integration path is not yet decided and is
  tracked as an open question (see `specs/001-foundation`).

## Governance

This constitution supersedes other practices where they conflict. Amendments are made by the
author as accepted specs/ADRs, following the authorship rules in `CLAUDE.md`. Versioning: MAJOR
for incompatible principle changes, MINOR for added/expanded guidance, PATCH for clarifications.

**Version**: 1.0.0 | **Ratified**: 2026-06-09 | **Last Amended**: 2026-06-09
