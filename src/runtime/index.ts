/**
 * `@lyceumjs/lms/runtime` — framework-agnostic engine wiring. Injects domain-port
 * adapters + H5P storage and exposes the use-cases and H5P handlers. No bundled
 * HTTP server (ADR 0001).
 */
import {
  createAndFetchItem,
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
  recordStatement,
  listActorRecords,
  type ContentRef,
  type Course,
  type CourseInfo,
  type CourseSummary,
  type CourseStorePort,
  type ExampleItem,
  type ExampleStorePort,
  type LearningRecord,
  type LearningRecordStorePort,
  type Lesson,
  type Unit,
} from '../core/index.js';
import { createH5PRuntime, type H5PRuntime } from './h5p/index.js';
import type { H5PStorages } from './h5p/storage.js';

export { createH5PRuntime } from './h5p/index.js';
export { createFsH5PStorages } from './h5p/storage.js';
export type { H5PRuntime } from './h5p/index.js';
export type { H5PStorages } from './h5p/storage.js';

/** Adapters a host supplies for Lyceum's domain ports. All are required at runtime. */
export interface EngineAdapters {
  exampleStore?: ExampleStorePort;
  courseStore?: CourseStorePort;
  learningRecordStore?: LearningRecordStorePort;
}

export interface EngineOptions {
  adapters: EngineAdapters;
  h5pStorages: H5PStorages;
}

export interface LyceumEngine {
  readonly h5p: H5PRuntime;
  createAndFetchItem(item: ExampleItem): Promise<ExampleItem>;
  // Course lifecycle (spec 003 — contracts/engine-operations.md)
  createCourse(info: CourseInfo): Promise<Course>;
  updateCourseInfo(courseId: string, info: CourseInfo): Promise<Course>;
  getCourse(id: string): Promise<Course | undefined>;
  deleteCourse(courseId: string): Promise<void>;
  listCatalog(): Promise<CourseSummary[]>;
  // Course structure operations (spec 003)
  addUnit(courseId: string, input: { title: string }): Promise<Unit>;
  renameUnit(courseId: string, unitId: string, title: string): Promise<void>;
  reorderUnits(courseId: string, orderedUnitIds: string[]): Promise<void>;
  removeUnit(courseId: string, unitId: string): Promise<void>;
  addLesson(courseId: string, unitId: string, input: { title: string }): Promise<Lesson>;
  renameLesson(courseId: string, unitId: string, lessonId: string, title: string): Promise<void>;
  reorderLessons(courseId: string, unitId: string, orderedLessonIds: string[]): Promise<void>;
  removeLesson(courseId: string, unitId: string, lessonId: string): Promise<void>;
  attachContent(
    courseId: string,
    unitId: string,
    lessonId: string,
    input: { title: string; h5pContentId?: string },
  ): Promise<ContentRef>;
  removeContent(
    courseId: string,
    unitId: string,
    lessonId: string,
    contentId: string,
  ): Promise<void>;
  recordStatement(record: LearningRecord): Promise<LearningRecord>;
  listActorRecords(actor: string): Promise<LearningRecord[]>;
}

function requireAdapter<T>(adapter: T | undefined, port: string, type: string): T {
  if (!adapter) {
    throw new Error(
      `Lyceum: no adapter configured for the required '${port}' port. ` +
        `A host MUST provide a ${type} implementation (e.g. from @lyceumjs/lms/testing).`,
    );
  }
  return adapter;
}

/**
 * Compose the engine. Fails fast with a clear, named error per missing adapter —
 * never silently assumes a datastore (spec Edge Case).
 */
export function createEngine(options: EngineOptions): LyceumEngine {
  const exampleStore = requireAdapter(
    options.adapters.exampleStore,
    'exampleStore',
    'ExampleStorePort',
  );
  const courseStore = requireAdapter(options.adapters.courseStore, 'courseStore', 'CourseStorePort');
  const learningRecordStore = requireAdapter(
    options.adapters.learningRecordStore,
    'learningRecordStore',
    'LearningRecordStorePort',
  );

  const h5p = createH5PRuntime(options.h5pStorages);

  return {
    h5p,
    createAndFetchItem: (item) => createAndFetchItem(exampleStore, item),
    createCourse: (info) => createCourse(courseStore, info),
    updateCourseInfo: (courseId, info) => updateCourseInfo(courseStore, courseId, info),
    getCourse: (id) => getCourse(courseStore, id),
    deleteCourse: (courseId) => deleteCourse(courseStore, courseId),
    listCatalog: () => listCatalog(courseStore),
    addUnit: (courseId, input) => addUnit(courseStore, courseId, input),
    renameUnit: (courseId, unitId, title) => renameUnit(courseStore, courseId, unitId, title),
    reorderUnits: (courseId, ids) => reorderUnits(courseStore, courseId, ids),
    removeUnit: (courseId, unitId) => removeUnit(courseStore, courseId, unitId),
    addLesson: (courseId, unitId, input) => addLesson(courseStore, courseId, unitId, input),
    renameLesson: (courseId, unitId, lessonId, title) =>
      renameLesson(courseStore, courseId, unitId, lessonId, title),
    reorderLessons: (courseId, unitId, ids) => reorderLessons(courseStore, courseId, unitId, ids),
    removeLesson: (courseId, unitId, lessonId) =>
      removeLesson(courseStore, courseId, unitId, lessonId),
    attachContent: (courseId, unitId, lessonId, input) =>
      attachContent(courseStore, courseId, unitId, lessonId, input),
    removeContent: (courseId, unitId, lessonId, contentId) =>
      removeContent(courseStore, courseId, unitId, lessonId, contentId),
    recordStatement: (record) => recordStatement(learningRecordStore, record),
    listActorRecords: (actor) => listActorRecords(learningRecordStore, actor),
  };
}
