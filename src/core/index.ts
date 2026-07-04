/**
 * `@lyceumjs/lms` — the database-agnostic domain core (Principle VII).
 * Pure domain + ports only. MUST NOT import runtime, fe, H5P, or any db/http lib
 * (enforced by dependency-cruiser).
 */
export type { LyceumErrorCode } from './errors.js';
export { LyceumDomainError } from './errors.js';

export type { ExampleItem, ExampleStorePort } from './ports/example-store.js';
export { createAndFetchItem } from './usecases/example-usecase.js';

export type {
  Course,
  Unit,
  Lesson,
  ContentRef,
  CourseInfo,
  CourseSummary,
  CourseStorePort,
} from './ports/course-store.js';
export {
  createCourse,
  updateCourseInfo,
  getCourse,
  deleteCourse,
  listCatalog,
  addUnit,
  renameUnit,
  reorderUnits,
  removeUnit,
  addLesson,
  renameLesson,
  reorderLessons,
  removeLesson,
  attachContent,
  removeContent,
} from './usecases/course-usecase.js';

export type {
  LearningRecord,
  LearningRecordResult,
  LearningRecordStorePort,
} from './ports/learning-record-store.js';
export { recordStatement, listActorRecords } from './usecases/learning-record-usecase.js';
