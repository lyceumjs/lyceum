/**
 * `@lyceumjs/lms/testing` — in-memory reference adapters + reusable adapter
 * contract-test helpers a host can run against its own adapters.
 */
export { InMemoryExampleStore } from './in-memory-adapter.js';
export { runAdapterContract } from './adapter-contract.js';

export { InMemoryCourseStore } from './in-memory-course-store.js';
export { runCourseStoreContract } from './course-store-contract.js';

export { InMemoryLearningRecordStore } from './in-memory-learning-record-store.js';
export { runLearningRecordStoreContract } from './learning-record-store-contract.js';
