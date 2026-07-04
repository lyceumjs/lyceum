# Data Model: Course Authoring & Catalog Domain

Additive evolution of the 002 course aggregate. Types live in `src/core/ports/course-store.ts`;
nothing here couples to a datastore (Principle III).

## Course (aggregate root)

| Field | Type | Rules |
|---|---|---|
| `id` | string | engine-minted UUID at create; immutable; host-opaque |
| `title` | string | required, non-empty (trimmed) |
| `description` | string? | optional top-level info |
| `slug` | string? | optional; `^[a-z0-9]+(-[a-z0-9]+)*$`; unique across the whole store (CONFLICT on duplicate) |
| `coverImage` | string? | opaque reference (URL or host asset id); never resolved by the engine |
| `createdAt` | string | ISO-8601 UTC, set once at create; immutable; drives catalog order |
| `units` | Unit[] | ordered; starts empty at create |

**Top-level info** = `title`, `description`, `slug`, `coverImage` — updated as a whole by
`updateCourseInfo` (absent optional fields clear the value). `id`, `createdAt`, `units` are never
touched by an info update.

## Unit

| Field | Type | Rules |
|---|---|---|
| `id` | string | engine-minted UUID at add; immutable |
| `title` | string | required, non-empty |
| `lessons` | Lesson[] | ordered; starts empty at add |

## Lesson

| Field | Type | Rules |
|---|---|---|
| `id` | string | engine-minted UUID at add; immutable |
| `title` | string | required, non-empty |
| `contents` | ContentRef[] | ordered; starts empty at add |

## ContentRef (unchanged shape, now operation-managed)

| Field | Type | Rules |
|---|---|---|
| `id` | string | engine-minted UUID at attach; immutable |
| `title` | string | required, non-empty |
| `h5pContentId` | string? | opaque; **not** validated against H5P storage this iteration |

## CourseSummary (derived read model — never stored)

Computed in core from a full `Course`: `id`, `title`, `slug`, `description`, `coverImage`,
`createdAt`, `unitCount`, `lessonCount` (total across units). Catalog order: `createdAt`
descending, tie-break `id` lexicographic ascending.

## Invariants & failure codes

| Rule | Code |
|---|---|
| Titles non-empty at every level (path-named on failure) | VALIDATION |
| Slug format `^[a-z0-9]+(-[a-z0-9]+)*$` | VALIDATION |
| Slug unique across the whole store | CONFLICT |
| Operation targets an existing course / unit / lesson / content ref | NOT_FOUND |
| Reorder list is an exact permutation of the existing ids (no missing, no extra, no duplicates) | VALIDATION |
| Ids unique within the aggregate (engine-guaranteed via minting; re-checked by the save-time walk) | VALIDATION |

Failed operations never write: validate against the loaded aggregate first, `save` only on
success (whole-aggregate upsert, as in 002).

## State & lifecycle

- **No publication state in Lyceum** (spec FR-004): draft/published lives on the platform; the
  catalog shows whatever the adapter supplies.
- **Lifecycle**: created (empty structure) → structurally edited via operations / info updated
  as a whole → deleted (`deleteById`; gone from reads and catalog). `createdAt` never changes.
- **Concurrency**: last-write-wins at aggregate granularity (spec assumption); operations are
  read-modify-write without locks.

## Example-host persistence mapping (example-only, not the published adapter)

`example/` PG adapter: keep the 002 JSONB aggregate document; add a `slug` column with a unique
partial index (`WHERE slug IS NOT NULL`) and a `created_at` column, both mirrored from the
document for spot-checks and index support. Schema stays idempotently created on startup; the
smoke DB is ephemeral, so no migration path is needed.
