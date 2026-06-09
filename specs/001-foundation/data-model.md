# Data Model: Project Foundation (Phase 1)

## Domain entities

**None in this feature.** The spec's Key Entities section and Non-goals defer the LMS domain
(content, learning records, enrollment, etc.) to later features. The foundation introduces no
persisted domain entities and defines no database schema.

What this feature *does* establish is the **structural model** — the package shape and the
persistence-port pattern that later domain entities will plug into. Those are documented here and,
as contracts, under `contracts/`.

## Structural model (the package shape)

A single ESM-only package with four internal concerns, exposed via subpath exports:

| Concern (folder) | Subpath export | Responsibility | May import |
|---|---|---|---|
| `core` | `.` | Pure domain + ports (interfaces) | only other `core` modules + std lib |
| `runtime` | `./runtime` | Wraps `@lumieducation/h5p-server`; emits framework-agnostic handlers | `core`, `@lumieducation/h5p-server` |
| `fe` | `./fe` | H5P content components (React) | `core` types, React, H5P FE libs |
| `testing` | `./testing` | In-memory reference adapter + adapter contract-test helper | `core` (implements its ports) |

The single hard rule (enforced by dependency-cruiser, see `contracts/import-boundary.md`): **`core`
imports nothing from `runtime`, `fe`, `@lumieducation/h5p-server`, or any database/HTTP library.**

## The persistence-port pattern (no concrete domain yet)

To prove database-agnosticism (SC-002) without modeling real domain data, the foundation defines the
**pattern** a port follows and ships a trivial reference implementation, leaving real ports to the
features that introduce real entities.

- A **port** is a `core`-owned TypeScript interface describing a persistence capability in domain
  terms (no SQL, no driver types). Example shape detailed in `contracts/storage-port.md`.
- An **adapter** implements a port against a concrete store. The foundation ships exactly one: an
  **in-memory adapter** in `testing`, used to demonstrate that `core` logic runs with no PostgreSQL
  dependency. The real Postgres adapter is **not** in this repo — it lives in the consuming host
  (ADR 0001).
- An **adapter contract test** is a reusable Vitest suite (in `testing`) that any adapter can be run
  against to prove conformance to a port. The in-memory adapter passes it here; a host's Postgres
  adapter runs the same suite on its side.

### Validation / invariants established by this feature

- `core` has **zero** imports of persistence/HTTP/H5P (machine-checked).
- The in-memory adapter satisfies the example port's contract test (machine-checked).
- With no adapter configured, the engine **fails fast with a clear message** rather than assuming a
  database (spec Edge Case) — surfaced as an explicit error at wiring time, not a silent default.

## State transitions

None — no stateful domain entities in this feature.
