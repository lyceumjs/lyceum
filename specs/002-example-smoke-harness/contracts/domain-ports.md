# Contract: Domain Ports & Engine Surface Additions (002)

Additive to 001's [package-surface.md](../../001-foundation/contracts/package-surface.md) — nothing
from 001 is removed or changed incompatibly.

## `@lyceumjs/lms` (core) — new exports

- Types: `Course`, `Unit`, `Lesson`, `ContentRef`, `CourseStorePort`,
  `LearningRecord`, `LearningRecordResult`, `LearningRecordStorePort`
- Functions: `createCourse`, `getCourse`, `recordStatement`, `listActorRecords`

Behavioral contract (verified by unit tests):

- `createCourse` / `recordStatement` validate before persisting and **return the read-back value**
  (proof the port round-trips), throwing `Error` with a message naming the offending field/path on
  invalid input.
- Core stays clock-free and id-free: `timestamp` and all ids are caller-supplied.

## `@lyceumjs/lms/runtime` — engine additions

- `EngineAdapters` = `{ exampleStore?, courseStore?, learningRecordStore? }` (all three required at
  runtime).
- `createEngine` throws a named, actionable error per missing adapter
  (`… no adapter configured for the required 'courseStore' port …`).
- `LyceumEngine` gains: `createCourse`, `getCourse`, `recordStatement`, `listActorRecords`.

## `@lyceumjs/lms/testing` — new exports

- `InMemoryCourseStore`, `InMemoryLearningRecordStore`
- `runCourseStoreContract(name, makeAdapter)`, `runLearningRecordStoreContract(name, makeAdapter)`

Port contracts (each suite verifies, against ANY adapter):

**CourseStorePort**
1. saves a full course tree and reads it back deep-equal;
2. returns `undefined` for an unknown id;
3. upserts on save with the same id (latest wins);
4. read-back is not reference-equal to the saved object (real persistence, not aliasing).

**LearningRecordStorePort**
1. saves a record (with and without `result`) and reads it back deep-equal;
2. returns `undefined` for an unknown id;
3. `listByActor` returns exactly that actor's records;
4. upserts on save with the same id.
