import { describe, it, expect, vi } from 'vitest';

// h5p-react is a browser UMD bundle; mock it so the fe surface can be imported in Node.
vi.mock('@lumieducation/h5p-react', () => ({
  H5PPlayerUI: () => null,
  H5PEditorUI: () => null,
}));

describe('public package surface (contracts/package-surface.md)', () => {
  it('core (".") exports the use-cases', async () => {
    const core = await import('../../src/core/index.js');
    expect(typeof core.createAndFetchItem).toBe('function');
    expect(typeof core.createCourse).toBe('function');
    expect(typeof core.getCourse).toBe('function');
    expect(typeof core.recordStatement).toBe('function');
    expect(typeof core.listActorRecords).toBe('function');
  });

  it('runtime ("./runtime") exports the engine + H5P runtime factory', async () => {
    const runtime = await import('../../src/runtime/index.js');
    expect(typeof runtime.createEngine).toBe('function');
    expect(typeof runtime.createH5PRuntime).toBe('function');
    expect(typeof runtime.createFsH5PStorages).toBe('function');
  });

  it('testing ("./testing") exports the in-memory adapters + contract helpers', async () => {
    const testing = await import('../../src/testing/index.js');
    expect(typeof testing.InMemoryExampleStore).toBe('function');
    expect(typeof testing.runAdapterContract).toBe('function');
    expect(typeof testing.InMemoryCourseStore).toBe('function');
    expect(typeof testing.runCourseStoreContract).toBe('function');
    expect(typeof testing.InMemoryLearningRecordStore).toBe('function');
    expect(typeof testing.runLearningRecordStoreContract).toBe('function');
  });

  it('fe ("./fe") exports the H5P component', async () => {
    const fe = await import('../../src/fe/index.js');
    expect(typeof fe.H5PContent).toBe('function');
  });
});
