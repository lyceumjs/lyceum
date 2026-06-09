# ADR 0001 — Host-integration architecture

**Status**: Accepted · **Date**: 2026-06-09

Resolves the open question carried in `specs/001-foundation` (FR-008 / edge case: "how does the
H5P backend plug into the `lms-starter-kit`?").

## Context

Lyceum is the LMS/LCMS engine that hosts embed: an H5P-based interactive frontend, a backend
content runtime, and the learning-management business logic. Its first consumer is `lms-starter-kit`
(Payload CMS v3 on Next.js App Router + PostgreSQL).

**Ownership boundary (decided by Valery, 2026-06-09 — supersedes the earlier split).** Lyceum owns
the *entire* learning-management domain and content, top-to-bottom: courses as content
(course → units → lessons → interactive H5P content), the catalog, assessments and grading,
enrollment, progress and completion, certificates, and learning history (xAPI/LRS). The host keeps
only the top layer that is *not* learning content or management — **authentication, user
management, and the wiring that sticks everything together** (the admin shell, Docker dev parity,
and mounting Lyceum's handlers). The host remains the **persistence owner via adapters**: it
implements Lyceum's storage ports (e.g. Payload/Postgres) and supplies user identity, but the
learning domain and its rules live in Lyceum, not the host.

The H5P foundation is `@lumieducation/H5P-Nodejs-library` v10.0.x — TypeScript, framework-agnostic
core (`H5PEditor` / `H5PPlayer` / `H5PAjaxEndpoint`), already ports-and-adapters via its storage
interfaces (`IContentStorage`, `ILibraryStorage`, `ITemporaryFileStorage`,
`IContentUserDataStorage`). No official Next.js/Payload integration exists; only Express.

The driving constraint when choosing structure was **avoiding over-engineering**. The decision
rule applied: optimise for what is expensive to reverse (repo count, the pure-core boundary) and
defer what is cheap to change (package splits).

## Decision

1. **Organisation, not personal account.** Lyceum and its consumers live as separate repositories
   under a single GitHub organisation. Two repos for now: `lyceum` (engine) and `lms-starter-kit`
   (host).
2. **Single package, three folders.** `lyceum` ships one published package with an internal
   boundary: `core` (pure domain + ports), `runtime` (wraps `@lumieducation/h5p-server`, exposes
   framework-agnostic handlers), `fe` (H5P player/editor components), plus `testing` (in-memory
   reference adapter + an adapter contract-test helper). Not six packages.
3. **Lint-enforced core boundary.** An import-boundary rule (`eslint` `no-restricted-imports` or
   `dependency-cruiser`) forbids `core/**` from importing `runtime/**`, `fe/**`,
   `@lumieducation/h5p-server`, or any database/HTTP library. The boundary is enforced, not
   trusted to convention.
4. **Framework-agnostic handlers, no bundled server.** `runtime` exposes request/response-shaped
   handlers; the host maps its routing to them (a thin Next.js App Router adapter for the
   starter-kit, an Express/Fastify/etc. shim elsewhere). Lyceum never runs its own HTTP server.
5. **One adapter, in the host.** Lyceum ships the port interfaces and an in-memory reference
   adapter. The single real Postgres/DB adapter and connector are written directly in
   `lms-starter-kit` and used there — not published as a generic package yet.
6. **Split only on a trigger.** No package/repo splits on aesthetics. Triggers: a second host
   needing a shared adapter (extract it then), a non-React host (split `fe` into web-component +
   React wrapper), or demand for `core` without H5P. (Constitution Principle VII.)

## Integration seams (the public contract a host implements)

1. **Storage adapters** — H5P's storage interfaces + Lyceum's domain repository ports for the full
   learning domain (courses/content, catalog, enrollment, progress, completion, certificates,
   learning records). The host implements these against its datastore (e.g. Payload/Postgres).
2. **Identity** — the host supplies the current user/permissions (Payload auth for the starter-kit);
   auth and user management stay host-owned.
3. **HTTP mounting** — the host maps its routes to Lyceum's handlers (H5P AJAX surface,
   content-user-data, the xAPI sink).
4. **Persistence of learning records** — Lyceum owns progress/completion/certificate logic and emits
   xAPI/completion; the host's storage adapter persists Lyceum's domain records. Lyceum computes,
   the host stores.

## Testing

Lyceum owns its unit tests (`core`, TDD) and runtime contract tests. It publishes an adapter
contract-test helper + in-memory reference so a host proves its adapter conforms with minimal code.
**Lyceum's own tests do not run in host projects** — hosts depend on the built package and write
only thin integration tests (boots, mounts the route, a player renders, an attempt round-trips into
their store).

## Consequences

- (+) Minimal moving parts now: one engine repo (one package), one host repo holding the adapter.
- (+) The expensive-to-reverse choices (few repos, pure-core boundary) are locked; cheap choices
  (package splits) stay deferred behind explicit triggers.
- (+) Framework-agnostic handlers keep "other similar projects" cheap to onboard.
- (−) We trailblaze the Next.js/Payload H5P adapter (no upstream example).
- (−) Double-modeling between Lyceum's domain and the host's persistence mirror (e.g. Payload
  collections) — now across the full learning domain, since Lyceum owns it end-to-end.
- (−) The host becomes thin (auth + user management + glue); most LMS value lives in Lyceum. This is
  intentional — owning the entire learning-management domain is Lyceum's purpose.
- Open call deferred to its own decision: whether H5P libraries/temp files live on filesystem/S3
  vs the host DB. Flagged, not decided here.
