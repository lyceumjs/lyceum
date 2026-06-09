# Contract: Example Host HTTP Surface (dev-only)

The routes the example dev host serves. **This is NOT a published Lyceum API** — it is the living
reference (US4) for how a host mounts the runtime's seams (ADR 0001: storage, identity, HTTP
mounting, learning-records sink). Consumed by the bundled FE page and by interactive browser
verification (FR-012).

| Method | Path | Backed by | Purpose |
|---|---|---|---|
| GET | `/` | static `example/public/` | FE page rendering `H5PContent` |
| GET | `/h5p/play/:contentId` | `engine.h5p.player.render()` | player model for the FE component |
| GET | `/h5p/ajax?action=…` | `engine.h5p.ajaxEndpoint.getAjax()` | H5P AJAX (player/editor support) |
| POST | `/h5p/ajax?action=…` | `engine.h5p.ajaxEndpoint.postAjax()` | H5P AJAX |
| GET | `/h5p/core/*` | static H5P core assets (`h5p-data/core`) | H5P core JS/CSS |
| GET | `/h5p/libraries/*` | static library storage dir | installed content-type libraries |
| GET | `/h5p/content/*` | static content storage dir | stored content files |
| GET | `/api/content` | example state | id of the installed fixture content |
| POST | `/api/courses` | `engine.createCourse` | create a course hierarchy |
| GET | `/api/courses/:id` | `engine.getCourse` | read a course back |
| POST | `/api/xapi` | `engine.recordStatement` | learning-records sink: page forwards H5P xAPI `answered` statements |
| GET | `/api/records?actor=…` | `engine.listActorRecords` | read captured records back |

Conventions:

- Single origin; H5P URL roots follow `H5PConfig` defaults (`/h5p`, `/h5p/core`, `/h5p/libraries`,
  `/h5p/content`, `/h5p/ajax`, `/h5p/play`).
- Identity is host-supplied: a fixed demo learner (`demo-learner`) acts as both the H5P user and
  the xAPI actor — Lyceum never manages users (ADR 0001).
- Fail-fast on boot (FR-006/FR-011): missing DB → actionable message (`docker compose up -d`?),
  missing H5P core assets → `pnpm h5p:fetch-core`, occupied port → named error. Exit code ≠ 0.
- Errors are JSON `{ error: string }` with appropriate 4xx/5xx; no stack traces to the client.
