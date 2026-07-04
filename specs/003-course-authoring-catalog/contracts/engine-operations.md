# Contract: authoring & catalog operation surface

The public, framework-agnostic operations a host maps its routes to (ADR 0001 — Lyceum never
runs its own HTTP server). Exposed both as core use-case functions and as `LyceumEngine`
methods. All failures throw `LyceumDomainError` with a `code`; suggested host mapping:
`VALIDATION → 400`, `NOT_FOUND → 404`, `CONFLICT → 409`.

`CourseInfo` = `{ title: string; description?: string; slug?: string; coverImage?: string }`.

## Course lifecycle

| Operation | Returns | Validation / errors |
|---|---|---|
| `createCourse(info: CourseInfo)` | created `Course` (minted id, `createdAt`, empty units) | title non-empty (VALIDATION); slug format (VALIDATION); slug taken (CONFLICT) |
| `updateCourseInfo(courseId, info: CourseInfo)` | updated `Course` | course exists (NOT_FOUND); title/slug rules as above; absent optional fields clear values; never touches structure/`createdAt` |
| `getCourse(courseId)` | `Course \| undefined` | — (read; `undefined` for unknown id, unchanged from 002) |
| `deleteCourse(courseId)` | `void` | course exists (NOT_FOUND); afterwards gone from reads and catalog |
| `listCatalog()` | `CourseSummary[]` | newest-first (`createdAt` desc, id tie-break); empty store → `[]` |

## Structure operations (all: course exists → NOT_FOUND; titles non-empty → VALIDATION; failed op writes nothing)

| Operation | Returns | Specific rules |
|---|---|---|
| `addUnit(courseId, { title })` | created `Unit` | appended last |
| `renameUnit(courseId, unitId, title)` | `void` | unit exists (NOT_FOUND) |
| `reorderUnits(courseId, orderedUnitIds)` | `void` | exact permutation of existing unit ids (VALIDATION) |
| `removeUnit(courseId, unitId)` | `void` | unit exists (NOT_FOUND); removes its lessons with it |
| `addLesson(courseId, unitId, { title })` | created `Lesson` | unit exists (NOT_FOUND); appended last |
| `renameLesson(courseId, unitId, lessonId, title)` | `void` | lesson exists in that unit (NOT_FOUND) |
| `reorderLessons(courseId, unitId, orderedLessonIds)` | `void` | exact permutation within the unit (VALIDATION) |
| `removeLesson(courseId, unitId, lessonId)` | `void` | lesson exists in that unit (NOT_FOUND) |
| `attachContent(courseId, unitId, lessonId, { title, h5pContentId? })` | created `ContentRef` | lesson exists (NOT_FOUND); ref stays opaque — no H5P validation this iteration |
| `removeContent(courseId, unitId, lessonId, contentId)` | `void` | content ref exists in that lesson (NOT_FOUND) |

Error messages keep the 002 path-naming style (e.g.
`Lyceum: course.units[1].lessons[0].title must be a non-empty string.`).

## Example-host routes (example-only living reference — NOT a published API)

`example/src/api-routes.ts` maps REST-ish routes 1:1 onto the operations (e.g.
`POST /api/courses`, `PATCH /api/courses/:id/info`, `POST /api/courses/:id/units`,
`PUT /api/courses/:id/units/order`, `DELETE /api/courses/:id`, `GET /api/catalog`), translating
`LyceumDomainError.code` per the mapping above. Exact shapes are the example's business; the
published contract is the operation table.
