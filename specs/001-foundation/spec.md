# Feature Specification: Project Foundation

**Feature Branch**: `develop` (pinned via `.specify/feature.json`; feature branches not in use yet)

**Created**: 2026-06-09

**Status**: Draft

**Input**: Establish the foundation of Lyceum — an open-source, database-agnostic LMS engine
(H5P frontend + backend) that is clean and easy to integrate, opinionated by default, and
compatible with the `lms-starter-kit` environment. Sets up Dockerized local development (with a
PostgreSQL container) and an SDD + TDD workflow with business logic under test. Captures the
accepted project posture as the first feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run the engine locally (Priority: P1)

As a contributor, I can clone Lyceum and bring up a local development environment with one
documented command — including a PostgreSQL container for local dev and smoke testing — so I can
build and run the engine without manual database setup.

**Why this priority**: Nothing can be developed or smoke-tested until the engine runs locally.

**Independent Test**: From a clean checkout, run the documented dev command; the engine and its
PostgreSQL container start and a basic smoke test passes.

**Acceptance Scenarios**:

1. **Given** a clean checkout, **When** I run the documented dev command, **Then** the engine and a
   PostgreSQL container start for local development.
2. **Given** the running environment, **When** I run the smoke test, **Then** it passes against the
   local database.

---

### User Story 2 - Integrate Lyceum into a host project (Priority: P1)

As an adopter, I can add Lyceum to my project (e.g. the `lms-starter-kit`) and wire it to my own
datastore through its adapter interface, without Lyceum forcing a specific database on me.

**Why this priority**: Clean, database-agnostic integration is Lyceum's reason to exist.

**Independent Test**: Lyceum's domain/business logic can be exercised against a non-default storage
adapter (or an in-memory fake) with no PostgreSQL dependency.

**Acceptance Scenarios**:

1. **Given** the engine, **When** a host provides its own storage adapter, **Then** the domain logic
   runs unchanged.

---

### Edge Cases

- What happens when no storage adapter is configured? The engine SHOULD fail fast with a clear
  message rather than assuming a database.
- How does the H5P backend plug into the `lms-starter-kit`? Decided in
  [ADR 0001 — Host-integration architecture](../adr/0001-integration-architecture.md).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The codebase MUST be Node.js + TypeScript and run in / alongside the `lms-starter-kit`
  environment (Next.js / Payload / PostgreSQL).
- **FR-002**: Domain and business logic MUST be database-agnostic — persistence reached only via
  ports/adapters, with zero hard database imports in the core.
- **FR-003**: The frontend MUST be built on H5P as its base; the project MUST also provide a backend
  for content runtime, storage adapters, and learning records.
- **FR-004**: The project MUST ship a Dockerized local development environment including a
  PostgreSQL container for local development and smoke testing.
- **FR-005**: Business logic MUST be developed test-first and stay covered by automated tests
  (SDD + TDD). The test runner is **Vitest** (decided by Valery, 2026-06-09).
- **FR-006**: The public integration surface MUST be small and documented, with sane opinionated
  defaults so a host project can adopt Lyceum with minimal wiring.
- **FR-007**: The repository MUST carry a commercially unrestricted (MIT-class) open-source license
  and MUST NOT commit secrets.
- **FR-008**: The H5P backend's integration into the `lms-starter-kit` MUST be defined before that
  integration ships. Defined in
  [ADR 0001 — Host-integration architecture](../adr/0001-integration-architecture.md).

### Key Entities

- Not modeled in this foundation feature; the LMS domain (content, learning records) is defined in
  later features.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From a clean checkout, a contributor reaches a running local environment (engine +
  PostgreSQL container) and a passing smoke test using only documented command(s).
- **SC-002**: Lyceum's business logic can be exercised with no PostgreSQL dependency (e.g. via an
  in-memory adapter), demonstrating database-agnosticism.
- **SC-003**: No secrets are present in the repository.

## Assumptions

- License is MIT-class (commercially unrestricted), consistent with `lms-starter-kit`.
- Node.js + TypeScript, matching the starter-kit environment (Node 24.x available locally).
- PostgreSQL is the dev/reference adapter, not a required runtime dependency for the core.

## Non-goals

- The full LMS domain model (content authoring, learning-records schema) — later features.
- Production deployment / orchestration.
- Deciding the H5P-backend ↔ starter-kit integration mechanism (tracked as an open question).
