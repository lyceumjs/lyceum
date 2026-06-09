import {
  runLearningRecordStoreContract,
  InMemoryLearningRecordStore,
} from '../../src/testing/index.js';

// The in-memory reference adapter must satisfy the LearningRecordStorePort contract.
runLearningRecordStoreContract('InMemoryLearningRecordStore', () => new InMemoryLearningRecordStore());
