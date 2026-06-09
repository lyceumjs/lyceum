# Data Model: Example Smoke Harness

Two layers: the **engine's new domain slice** (published, database-agnostic, lives in `src/core`)
and the **example-only persistence mapping** (lives in `example/`, never published).

## Engine domain slice (src/core)

### Course aggregate (FR-008: course → units → lessons → content)

```ts
interface ContentRef {
  id: string;
  title: string;
  /** Id of the interactive content in the H5P content storage, when applicable. */
  h5pContentId?: string;
}
interface Lesson  { id: string; title: string; contents: ContentRef[] }
interface Unit    { id: string; title: string; lessons: Lesson[] }
interface Course  { id: string; title: string; units: Unit[] }
```

- The aggregate is saved and loaded **whole** through the port (aggregate root = `Course`).
- Validation (use case level): every node in the tree must have non-empty `id` and `title`;
  violations throw with a path-naming message (e.g. `course.units[0].lessons[1].id`).
- Deliberately minimal: ordering is array order; no timestamps/authors/status yet (later features).

```ts
interface CourseStorePort {
  save(course: Course): Promise<void>;            // upsert by id
  getById(id: string): Promise<Course | undefined>;
}
```

### LearningRecord (xAPI-style statement)

```ts
interface LearningRecordResult {
  success?: boolean;
  score?: { raw: number; max: number };
}
interface LearningRecord {
  id: string;         // statement id (host-supplied, e.g. UUID)
  actor: string;      // learner identity — supplied by the host (identity seam, ADR 0001)
  verb: string;       // xAPI-style verb id/name, e.g. 'answered', 'completed'
  objectId: string;   // the content the statement is about (e.g. h5p content id / ContentRef id)
  result?: LearningRecordResult;
  timestamp: string;  // ISO-8601, supplied by the caller (core stays clock-free)
}
interface LearningRecordStorePort {
  save(record: LearningRecord): Promise<void>;    // upsert by id
  getById(id: string): Promise<LearningRecord | undefined>;
  listByActor(actor: string): Promise<LearningRecord[]>;
}
```

- Validation: `id`, `actor`, `verb`, `objectId`, `timestamp` non-empty; `timestamp` must parse as
  a date.
- Not a full xAPI/LRS implementation — the minimal statement shape the smoke needs; LRS depth is a
  later feature.

### Use cases (pure, store injected)

| Use case | Signature | Behavior |
|---|---|---|
| `createCourse` | `(store, course) => Promise<Course>` | validate tree → save → read back via `getById` (round-trip proof) |
| `getCourse` | `(store, id) => Promise<Course \| undefined>` | fetch |
| `recordStatement` | `(store, record) => Promise<LearningRecord>` | validate → save → read back |
| `listActorRecords` | `(store, actor) => Promise<LearningRecord[]>` | fetch by actor |

### Engine surface additions (src/runtime)

`EngineAdapters` gains `courseStore` and `learningRecordStore`; `createEngine` fails fast with a
named error for **each** missing adapter (same pattern as 001's `exampleStore`, which is kept).
`LyceumEngine` exposes the bound use cases: `createCourse`, `getCourse`, `recordStatement`,
`listActorRecords`.

### Reference adapters + contracts (src/testing)

`InMemoryCourseStore`, `InMemoryLearningRecordStore` (Map-backed, deep-copy on save/get so shared
references can't fake persistence), plus reusable suites `runCourseStoreContract(name, make)` and
`runLearningRecordStoreContract(name, make)` — hosts run these against their own adapters; the
example does exactly that against its PG adapters.

## Example-only persistence mapping (example/src/adapters)

| Table | Columns | Maps |
|---|---|---|
| `courses` | `id text PK`, `doc jsonb` | whole `Course` aggregate as a JSONB document |
| `learning_records` | `id text PK`, `actor text`, `verb text`, `object_id text`, `result jsonb NULL`, `ts timestamptz` | one row per statement; `listByActor` filters on `actor` |
| `example_items` | `id text PK`, `title text` | 001 placeholder port |

- Schema is created with idempotent `CREATE TABLE IF NOT EXISTS` on startup — this is the FR-003
  "seeded on container startup" step (Testcontainers DB starts empty every run; compose dev DB is
  initialized the same way).
- JSONB-for-aggregate is an example-side choice, not engine guidance — a real host may normalize.

## H5P fixture content (example/fixtures)

One `.h5p` package: official content-type libraries (MIT) + our `content/content.json` (one
multiple-choice question). Stored through `runtime`'s content-storage path; referenced from the
demo course as `ContentRef.h5pContentId`; played in the browser by the dev host (FR-011).
