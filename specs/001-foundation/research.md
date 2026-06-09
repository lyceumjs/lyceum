# Research: Project Foundation (Phase 0)

Decision record for the foundation toolchain. All decisions were made by Valery on 2026-06-09 and
are accepted; this document records the rationale and the alternatives weighed. Versions were
verified against the live registries on 2026-06-09.

## Decision 1 — Language, module format, runtime

**Decision**: TypeScript, **ESM-only** (`"type": "module"`), Node.js `engines >=20.9` (developed on
24.x).

**Rationale**: The first host, `lms-starter-kit`, is `"type": "module"` on `pnpm@9.15.9` with
`node >=20.9` — Environment Compatibility (Principle V) makes matching it the default. ESM is the
modern target for Next.js / Payload consumers. `@lumieducation/h5p-server` 10.0.4 is **CommonJS**
(no `type` field, `main: build/src/index.js`), but Node consumes CJS from ESM via interop, so an
ESM-only Lyceum imports it without a dual build.

**Alternatives considered**:

- **Dual ESM + CJS publish** — rejected: extra build complexity and `exports` conditions for no known
  consumer; the only host is ESM. Revisit only if a CJS-only consumer appears (a Principle VII–style
  trigger).
- **CJS-only** — rejected: backwards relative to the ESM host ecosystem.

## Decision 2 — Package manager

**Decision**: **pnpm 9**.

**Rationale**: Exact match to the starter-kit (`packageManager: pnpm@9.15.9`); shared muscle memory
and lockfile semantics across the org's repos. Strict, content-addressed store fits a clean
multi-folder package.

**Alternatives considered**: npm / yarn — rejected for divergence from the established host toolchain.

## Decision 3 — Test runner

**Decision**: **Vitest 4.x** (latest 4.1.8 on 2026-06-09). Resolves spec FR-005's open marker.

**Rationale**: TS- and ESM-native with zero extra transform config; fast watch mode for
red-green-refactor (Principle VI); one runner spans unit, contract, and smoke suites. The spec
already named Vitest as the likely choice.

**Alternatives considered**:

- **Jest** — rejected: heavier ESM/TS configuration, slower for this stack.
- **node:test** — rejected: leaner but more assembly (assertions, watch, coverage) for no benefit here.

## Decision 4 — Build

**Decision**: **`tsc`** with TypeScript **project references**, emitting ESM + `.d.ts` to `dist/`. No
bundler.

**Rationale**: Valery chose plain `tsc` over a bundler — fewest dependencies and no bundler magic.
Project references map cleanly onto the `core` / `runtime` / `fe` / `testing` folders and give
incremental builds and enforced internal build ordering. A library consumed by a bundler-having host
does not need to pre-bundle itself.

**Alternatives considered**:

- **tsup** (initial recommendation) — declined by Valery: convenient single-command ESM + d.ts, but
  an extra dependency and a layer of abstraction over `tsc`.
- **unbuild** — rejected: more than needed for a straightforward TS library.

**Trade-off accepted**: plain `tsc` means a bit more hand-written config (per-folder tsconfig, output
mapping) than tsup would auto-handle.

## Decision 5 — Core import-boundary enforcement (Principle VII)

**Decision**: **dependency-cruiser**.

**Rationale**: Purpose-built for architectural import rules. The Principle VII boundary —
`core/**` may not import `runtime/**`, `fe/**`, `@lumieducation/h5p-server`, or any database/HTTP
library — is expressed as explicit `forbidden` rules and validated in CI (and pre-commit), exactly
the "enforced, not trusted to convention" requirement. Also yields a dependency graph for review.

**Alternatives considered**:

- **ESLint `no-restricted-imports` / `import/no-restricted-paths`** — viable and tool-free beyond the
  lint pass, but boundary intent is scattered across ESLint config and is less expressive for
  whole-folder architectural constraints. Acceptable fallback if we later want to collapse tooling.

## Decision 6 — Local database strategy

**Decision**: **`docker-compose` for the local dev environment** + **Testcontainers for the smoke
harness**.

**Rationale**: FR-004 wants a long-lived, Dockerized Postgres for local dev — `docker-compose`
mirrors the starter-kit's dev parity and is the convenient "leave it running" experience. The smoke
test (SC-001 here, and feature 002's hermetic harness) wants programmatic startup/teardown with no
leftovers — `@testcontainers/postgresql` (testcontainers 12.0.1) gives that with built-in wait
strategies and guaranteed cleanup. Each tool is used where it fits.

**Alternatives considered**:

- **docker-compose for both** — rejected: script-managed teardown is more fragile for the harness's
  "no leftover containers/data" guarantee.
- **Testcontainers for both** — rejected: diverges from the starter-kit dev-parity story and is less
  convenient for a long-running local dev DB.

**Pinning note**: pin the Postgres image (e.g. `postgres:17-alpine`) in both compose and
Testcontainers rather than `latest`, per Testcontainers 2026 best practice.

## Decision 7 — Scope boundaries for this feature

**Decision**: The foundation models **no LMS domain entities** and creates **no example folder**.

**Rationale**: Spec Key Entities and Non-goals defer the domain to later features; the example/smoke
harness is feature 002. This feature delivers only the skeleton, the boundary, the toolchain, and
the two provable outcomes (SC-001 running env + smoke; SC-002 db-agnostic via in-memory adapter).
Keeping scope this tight is the Principle VII guard against over-engineering.

## Decision 8 — H5P is wired in the foundation (not deferred)

**Decision** (Valery, 2026-06-09): install and wire `@lumieducation/h5p-server` **in this repo, in the
foundation feature** — no reason to defer it. The `runtime` wraps `H5PEditor` / `H5PPlayer` /
`H5PAjaxEndpoint` and exposes framework-agnostic handlers; `fe` ships a minimal `@lumieducation/h5p-react`
player/editor component.

**Rationale**: H5P is Lyceum's reason to exist (Principle IV); standing the engine up without it
leaves FR-003 only structurally stubbed. Installing it now makes the foundation a real H5P engine and
keeps the smoke test honest (it boots the H5P runtime, not just a DB connection).

**Storage for dev/smoke**: use `h5p-server`'s shipped implementations — filesystem
(`FileContentStorage`, `FileLibraryStorage`, `DirectoryTemporaryFileStorage`, `FileContentUserDataStorage`)
for local dev, `InMemoryStorage` for tests. The H5P storage **interfaces** (`IContentStorage`,
`ILibraryStorage`, `ITemporaryFileStorage`, `IContentUserDataStorage`) are the seam a host later
implements against its own datastore.

**Core assets**: H5P core + editor static assets are **not on npm**; a `scripts/download-h5p-core.sh`
fetches them into a git-ignored `h5p-data/`-adjacent location, wired as an `h5p:fetch-core` script and
run before dev/smoke.

**Deferred (unchanged)**: whether H5P libraries/temp files ultimately live on filesystem/S3 vs the
host DB remains the ADR 0001 open call. The fs default unblocks the foundation without prejudging it.

**Verified**: `@lumieducation/h5p-server` 10.0.4 ships `H5PEditor`/`H5PPlayer`/`H5PAjaxEndpoint` +
`InMemoryStorage` + `implementation/fs/*` storage classes; core/editor assets are not bundled.
`@lumieducation/h5p-react` 10.0.4; `@lumieducation/h5p-express` 10.0.5 (not used — we stay
framework-agnostic).

## Verified facts (2026-06-09)

- `@lumieducation/h5p-server`: latest 10.0.4; CommonJS (`main: ./build/src/index.js`, no `type`).
- `vitest`: 4.1.8 stable.
- `testcontainers`: 12.0.1; `@testcontainers/postgresql`: 11.14.0.
- `lms-starter-kit`: `packageManager: pnpm@9.15.9`, `"type": "module"`, `engines.node >=20.9`.
