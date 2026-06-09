import { runCourseStoreContract, InMemoryCourseStore } from '../../src/testing/index.js';

// The in-memory reference adapter must satisfy the CourseStorePort contract.
runCourseStoreContract('InMemoryCourseStore', () => new InMemoryCourseStore());
