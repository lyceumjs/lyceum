/**
 * `@lyceumjs/lms/runtime` — framework-agnostic engine wiring. Injects domain-port
 * adapters + H5P storage and exposes the use-cases and H5P handlers. No bundled
 * HTTP server (ADR 0001).
 */
import {
  createAndFetchItem,
  createCourse,
  getCourse,
  recordStatement,
  listActorRecords,
  type Course,
  type CourseStorePort,
  type ExampleItem,
  type ExampleStorePort,
  type LearningRecord,
  type LearningRecordStorePort,
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
  createCourse(course: Course): Promise<Course>;
  getCourse(id: string): Promise<Course | undefined>;
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
    createCourse: (course) => createCourse(courseStore, course),
    getCourse: (id) => getCourse(courseStore, id),
    recordStatement: (record) => recordStatement(learningRecordStore, record),
    listActorRecords: (actor) => listActorRecords(learningRecordStore, actor),
  };
}
