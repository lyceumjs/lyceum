# Feature Specification: Example Smoke Harness

**Feature Branch**: `develop` (pinned via `.specify/feature.json`; feature branches not in use yet)

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "We need one more folder locally for smoke testing the functional, some
kind of an example implementation so that we can actually create courses, check that everything gets
correctly stored to the DB and so on, perhaps it will start a Docker container or even more"

## Context

Lyceum ships as a single published package with three folders — `core`, `runtime`, `fe`
(constitution Principle VII). This feature adds a **dev-only example folder** alongside them that is
**not part of the published package**: a runnable example host that exercises Lyceum end-to-end
against a real database, so a contributor can confirm the engine actually works and persists data
before any real host (e.g. `lms-starter-kit`) integrates it.

**Courses are content, and Lyceum owns the entire learning-management domain and content
top-to-bottom** (Valery, 2026-06-09) — courses, catalog, assessments, enrollment, progress,
completion, certificates, and learning history; the host keeps only auth, user management, and the
glue. The example therefore creates a course and its full content hierarchy through Lyceum, plus
learning records. (This boundary is recorded in ADR 0001 and the constitution, and propagated to the
starter-kit's `research.md` — see Assumptions.)

## Clarifications

### Session 2026-06-09

- Q: How real must the H5P/interactive-content layer be in this first smoke harness? → A: One real H5P fixture exercised through the runtime — a single minimal H5P content type committed as a fixture and pushed through the runtime's content-storage handler (no browser), so H5P's content-storage path is genuinely exercised and read back. The H5P core/library assets the fixture needs are present in the run; full editor-based authoring remains deferred. (FE/browser playback was initially deferred here and pulled forward on 2026-06-10 — see below.)
- Q: Is the smoke harness an automated CI gate, or a local/dev-only tool? → A: Local/dev-only now, CI-ready — runs on demand via the documented one command, built to be hermetic and deterministic so wiring it into CI later is trivial, but no CI pipeline config is added this iteration.

### Session 2026-06-10

- Q: Does this iteration include a way to check the FE in a real browser? → A: Yes — pulled forward (Valery, 2026-06-10: "Build the 002 runnable example"). The example doubles as a runnable **dev host**: one documented command starts it against the compose-managed dev database and serves a local page that renders Lyceum's FE component playing the stored H5P fixture over the runtime's HTTP-mounted handlers. Browser verification is interactive (manually or via the Playwright MCP); the automated smoke run stays headless and direct-API. A committed, CI-wired browser-test suite remains a later iteration.
- Q: How is the committed H5P fixture sourced? → A: Built once from official H5P content-type library releases (MIT) combined with our own minimal content parameters, committed as a fixture together with the provenance/build script (Valery, 2026-06-10).
- Q: What does the example host run on? → A: A minimal single-origin host — one HTTP server process that both mounts the runtime's handlers and serves the bundled FE page (Valery, 2026-06-10: Express + esbuild).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Smoke-test the engine end-to-end (Priority: P1)

As a contributor, I can run the example with one documented command, have it bring up whatever
infrastructure it needs (a database container, seeded on startup), create a course and its content
hierarchy through Lyceum, and see confirmation that it was correctly persisted — so I know the
engine functions for real, not just in unit tests.

**Why this priority**: This is the whole point of the feature — a functional, against-a-real-DB
proof that the engine works before any host integrates it.

**Independent Test**: From a clean checkout, run the documented example command; the example starts
its seeded database, creates a course and its content, reads it back, and reports a pass.

**Acceptance Scenarios**:

1. **Given** a clean checkout, **When** I run the documented example command, **Then** the example
   provisions its database (seeded on startup) and starts without manual setup.
2. **Given** the running example, **When** it creates a course and its content hierarchy, **Then**
   the data is written to the database and can be read back, and the example reports success.
3. **Given** a completed run, **When** the example tears down, **Then** it leaves no running
   containers and no leftover data (the database is ephemeral — no persistent volume).

---

### User Story 2 - Capture and verify a learning record (Priority: P2)

As a contributor, I can have the example play a piece of interactive content and produce a learning
record (an attempt / xAPI-style statement), then verify that record was persisted — so I know the
learning-records side of the engine works, not just content authoring.

**Why this priority**: Learning records are core to what Lyceum owns; content storage alone does not
prove the engine's full job.

**Independent Test**: Run the example flow that plays content and emits a learning record; confirm
the record is stored and retrievable.

**Acceptance Scenarios**:

1. **Given** stored content, **When** the example simulates a learner interaction, **Then** a
   learning record is captured and persisted, and the example confirms it was stored.

---

### User Story 3 - Check the FE in a real browser (Priority: P3)

As the maintainer, I can start the example as a local dev host with one documented command and open
a local URL where the stored H5P fixture actually renders and plays through Lyceum's FE component —
so I can see with my own eyes that the frontend works, not only that storage round-trips.

**Why this priority**: Pulled forward by Valery (2026-06-10) — after foundation 001 the engine had
no runnable surface at all; a human-checkable FE closes that gap. It builds on US1's stored content,
so it cannot precede it.

**Independent Test**: Run the documented dev-host command; open the printed URL; the H5P content is
visible and interactive in the browser, served through the runtime's HTTP-mounted handlers.

**Acceptance Scenarios**:

1. **Given** the example dev host started with the documented command, **When** I open the printed
   local URL in a browser, **Then** the page renders the stored H5P fixture via Lyceum's FE
   component and it is interactive (the content responds to input).
2. **Given** the rendered content, **When** I complete the interaction (e.g. answer the question),
   **Then** a learning record is captured through the same path as US2 and can be read back.

---

### User Story 4 - Living reference for how a host wires Lyceum (Priority: P4)

As an adopter, I can read the example as the minimal reference for integrating Lyceum — it wires the
engine only through its public integration surface (the seams in ADR 0001), so it shows the real
integration path rather than reaching into internals.

**Why this priority**: An honest example doubles as the integration doc and keeps the public surface
exercised; valuable but secondary to the smoke test itself.

**Independent Test**: Inspect the example; it imports Lyceum only via its public surface and
implements the documented integration seams (storage, identity, HTTP mounting, learning-records
sink).

**Acceptance Scenarios**:

1. **Given** the example source, **When** reviewed, **Then** it consumes Lyceum exactly as a host
   would, with no imports of the engine's internals.

---

### Edge Cases

- What happens when the container runtime / database is unavailable? The example MUST fail fast with
  a clear message rather than hanging or producing a misleading partial pass.
- What happens if a previous run left containers or data behind? The example MUST start cleanly
  (reset or refuse with a clear message), so runs are repeatable.
- The example MUST NOT be included in the published package or pulled in by consumers of Lyceum.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST include a **dev-only example folder**, separate from the published
  package and excluded from what consumers install.
- **FR-002**: The example MUST be runnable from a clean checkout with a **single documented
  command**.
- **FR-003**: The example MUST provision its own persistence for the run against a **real database
  brought up in a container**. The database is **ephemeral — no persistent volume** — and is **seeded
  with the necessary test data on container startup**. It MUST tear down cleanly afterward.
- **FR-004**: The example MUST exercise Lyceum **only through its public integration surface** (the
  handlers/ports / seams defined in ADR 0001), the same way a real host would — not via engine
  internals.
- **FR-005**: The example MUST **verify persistence via direct API calls**: after creating a course
  and its content (US1) and capturing a learning record (US2), the data is read back and confirmed
  stored, and the run reports a clear pass/fail. (The automated smoke run stays headless and
  direct-API; browser checking is FR-011/FR-012.)
- **FR-006**: The example MUST **fail fast with a clear message** when prerequisites (container
  runtime / database) are unavailable.
- **FR-007**: The example MUST NOT commit secrets; configuration uses environment values with safe
  dev-only defaults.
- **FR-008**: The example MUST exercise Lyceum's owned domain, which includes the **full course
  content hierarchy (course → units → lessons → content) top-to-bottom**, plus learning records.
  Courses are content owned by Lyceum; no separate mock host is needed. (Resolved by Valery,
  2026-06-09; revises ADR 0001's course-ownership boundary — see Assumptions.)
- **FR-009**: The example MUST exercise the H5P content layer for real at the storage level: it
  uses **one minimal H5P content type, committed as a fixture**, pushed through the runtime's
  **content-storage handler (no browser)** and read back to confirm it persisted. The H5P
  core/library assets the fixture requires MUST be available to the run. Full editor-based
  authoring remains out of scope this iteration (see Non-goals); browser playback of the same
  fixture is covered by FR-011.
- **FR-010**: The example is **run locally on demand** via the documented single command; it MUST be
  **hermetic and deterministic** (no reliance on prior state, fixed inputs, clean teardown) so it can
  later be wired into CI without change. Adding the CI pipeline configuration itself is out of scope
  this iteration (see Non-goals).
- **FR-011**: The example MUST also start as a **local dev host** via a single documented command:
  one single-origin server process that mounts the runtime's handlers over HTTP and serves a local
  web page rendering Lyceum's FE component playing the stored H5P fixture, so a human can verify
  playback in a real browser. The dev host uses the compose-managed dev database (foundation 001
  decision); the automated smoke run keeps its own ephemeral containerized database (FR-003). The
  dev host MUST fail fast with a clear message when its prerequisites (database, H5P core assets,
  free port) are missing.
- **FR-012**: Browser verification of the dev host is **interactive** (manually or driven via the
  Playwright MCP); no browser-test suite is committed this iteration — the automated, committed
  smoke remains headless and direct-API (FR-005).

### Key Entities

- **Example Smoke Harness**: the dev-only runnable that orchestrates the flow; not shipped.
- **Course (content hierarchy)**: a course and its top-to-bottom content structure (units, lessons,
  content), created and persisted by the run — Lyceum-owned content (FR-008).
- **Interactive Content**: a single minimal H5P content type, committed as a fixture (built from
  official H5P library releases plus our own content parameters) and pushed through the runtime's
  content-storage handler, then read back — so H5P's content-storage path is genuinely exercised
  (Lyceum-owned). The same stored fixture is what the dev host page plays in the browser (FR-011).
- **Learning Record**: an attempt / xAPI-style statement captured during a simulated interaction
  (Lyceum-owned).
- **Seed Data**: test data loaded into the database on container startup to support the run.
- **Example Storage Adapter**: example-only wiring that satisfies Lyceum's storage ports against the
  real database for the run. (Distinct from the published reference adapter, which per ADR 0001 lives
  in the consuming host.)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From a clean checkout, a contributor runs the example with only the documented
  command(s) and reaches a reported pass — no manual setup beyond providing environment values.
- **SC-002**: The run confirms that created content (and a captured learning record) are persisted
  and retrievable from the database.
- **SC-003**: After the run, no example containers remain running and no leftover data persists.
- **SC-004**: The example consumes Lyceum only through its public integration surface, with zero
  imports of engine internals.
- **SC-005**: Starting the dev host with the documented command and opening the printed URL shows
  the H5P fixture rendering and responding to interaction in a real browser, and completing the
  interaction produces a retrievable learning record.

## Assumptions

- A container runtime (Docker) is available on the contributor's machine, consistent with the
  constitution's Dockerized dev parity and foundation spec 001.
- The persistence target for this functional smoke is a **real, ephemeral database in a container**
  (no persistent volume), **seeded on startup**; the in-memory reference adapter remains the path for
  unit tests, not for this example.
- The **automated smoke** verifies behavior through **direct API calls**; browser checking is
  provided by the dev host (FR-011) and verified interactively (FR-012). A committed browser-test
  suite is deferred.
- The H5P layer is exercised at the **storage level** via one committed minimal H5P content-type
  fixture through the runtime handler; the H5P core/library assets it needs are available to the
  run. Full editor-based authoring is deferred (FR-009); the same fixture is played in the browser
  via the dev host (FR-011).
- This feature realizes and extends the smoke-test intent of foundation spec 001 (US1 / SC-001) into
  a concrete functional example.
- The example's storage wiring is **example-only** and does not become the published reference
  adapter (which, per ADR 0001, lives in the consuming host until a second consumer extracts it).
- **Ownership boundary (decided & propagated)**: Lyceum owns the entire learning-management domain
  and content top-to-bottom — courses as content, catalog, assessments/grading, enrollment, progress,
  completion, certificates, and learning history (xAPI/LRS). The host keeps only auth, user
  management, and the glue that wires everything together (it still persists via adapters). Recorded
  in `specs/adr/0001-integration-architecture.md` and the constitution; the starter-kit's
  `research.md` is updated to match.

## Non-goals

- Becoming a production or deployable host — the example is dev/smoke-only.
- Replacing the host integration (e.g. the `lms-starter-kit`'s real Payload/Postgres adapter).
- A full course-authoring UI or learner experience — out of scope; the example simulates flows.
- A committed, CI-wired browser-test suite — later; this iteration's browser check is the dev host
  verified interactively (FR-011/FR-012).
- A persistent database / data volume — the smoke DB is ephemeral and re-seeded each run.
- CI pipeline configuration — the harness is built CI-ready (hermetic, deterministic) but is not
  wired into a CI gate this iteration (FR-010); that is a later addition.
