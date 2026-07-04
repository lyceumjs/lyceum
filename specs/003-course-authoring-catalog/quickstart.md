# Quickstart: validating Course Authoring & Catalog

How to prove the feature works end-to-end. Contracts: [domain-ports.md](./contracts/domain-ports.md),
[engine-operations.md](./contracts/engine-operations.md); shapes: [data-model.md](./data-model.md).

## Prerequisites

- Node ≥ 20.9, pnpm 9 (`corepack enable`), Docker running (for the smoke / dev host).
- Clean checkout of `lyceum-lms`, `pnpm install`.

## 1. Unit + contract tests (no Docker)

```bash
pnpm test          # tests/unit + tests/contract
pnpm boundary      # dependency-cruiser: core still imports no runtime/fe/db/http
```

**Expected**: every operation's red→green suite passes (SC-001, SC-002 — invalid operations
reject with path-naming `LyceumDomainError`s and leave state untouched); the grown
`runCourseStoreContract` passes against the in-memory reference adapter (SC-004).

## 2. Automated example smoke (hermetic, Testcontainers)

```bash
pnpm example:smoke
```

**Expected** (SC-003, SC-005): one command from clean checkout → ephemeral Postgres; the run
creates a course from top-level info, applies unit/lesson/content operations and a whole info
update, creates a second course, asserts the catalog lists both newest-first with correct
summaries, deletes one and asserts it vanished from catalog and reads, keeps the 002 H5P fixture
flow green, reports pass, tears down clean.

## 3. Adapter conformance (example PG adapter)

Runs inside the smoke suite (`example/tests/adapters.contract.test.ts`): the published contract
suite against the grown PG adapter — proves a real host adapter can conform (SC-004).

## 4. Public-surface guard

```bash
pnpm boundary:example
```

**Expected**: the example still consumes the engine only through its `exports` map — zero
engine-internal imports (SC-004).

## 5. Optional: dev host in a browser

```bash
pnpm example:dev   # compose dev DB + single-origin host; open the printed URL
```

Unchanged this iteration (no new UI — FR-008 is headless); useful to confirm the 002 playback
path still works on top of the reshaped domain.
