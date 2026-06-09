# Lyceum example host & smoke harness

Dev-only (`private: true`, never published). Two jobs:

1. **Smoke harness** — proves the engine works end-to-end against a real database, hermetically.
2. **Living reference** — the minimal, honest example of how a host wires Lyceum: everything here
   goes through `@lyceumjs/lms`'s public surface; nothing reaches into engine internals
   (enforced by `pnpm boundary:example`).

## Run it (from the repo root)

```bash
pnpm example:smoke   # hermetic proof: ephemeral Postgres (Testcontainers), pass/fail, teardown
pnpm example:dev     # dev host: compose DB + http://localhost:3020 — play the H5P quiz yourself
```

## The four integration seams (ADR 0001), as implemented here

| Seam | Where in this example |
|---|---|
| **Storage adapters** | [`src/adapters/`](src/adapters) — Postgres implementations of `ExampleStorePort`, `CourseStorePort`, `LearningRecordStorePort`, injected into `createEngine`. Verified against the published contract suites in [`tests/adapters.contract.test.ts`](tests/adapters.contract.test.ts). |
| **Identity** | [`src/fixture.ts`](src/fixture.ts) — `DEMO_LEARNER`: the host supplies who the user is; Lyceum never manages users. |
| **HTTP mounting** | [`src/h5p-routes.ts`](src/h5p-routes.ts) + [`src/server.ts`](src/server.ts) — the host mounts the runtime's H5P handlers (`player.render`, `ajaxEndpoint`) and static asset roots under `/h5p` behind its own Express routing. Lyceum ships no server. |
| **Learning-records sink** | [`src/api-routes.ts`](src/api-routes.ts) `POST /api/xapi` — the FE page forwards H5P xAPI `answered` statements; the host calls `engine.recordStatement`. |

The FE page ([`src/web/main.tsx`](src/web/main.tsx)) renders `H5PContent` from `@lyceumjs/lms/fe`
with a `loadContentCallback` that hits `/h5p/play/:contentId`, and an `onxAPIStatement` that posts
to the sink. The H5P content itself is the committed fixture ([`fixtures/`](fixtures)) pushed
through the runtime's content-storage handler on first boot.

## Teardown

- Smoke run: nothing to do — the container is ephemeral and removed automatically.
- Dev host: `Ctrl-C`, then `docker compose down` when you're done with the dev database.
