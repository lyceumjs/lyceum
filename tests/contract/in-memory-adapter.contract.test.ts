import { runAdapterContract, InMemoryExampleStore } from '../../src/testing/index.js';

// The in-memory reference adapter must satisfy the ExampleStorePort contract.
runAdapterContract('InMemoryExampleStore', () => new InMemoryExampleStore());
