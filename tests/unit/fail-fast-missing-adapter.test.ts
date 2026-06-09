import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createEngine, createFsH5PStorages, type EngineAdapters } from '../../src/runtime/index.js';
import {
  InMemoryExampleStore,
  InMemoryCourseStore,
  InMemoryLearningRecordStore,
} from '../../src/testing/index.js';

function fullAdapters(): EngineAdapters {
  return {
    exampleStore: new InMemoryExampleStore(),
    courseStore: new InMemoryCourseStore(),
    learningRecordStore: new InMemoryLearningRecordStore(),
  };
}

describe('composition fail-fast (spec Edge Case)', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'lyceum-ff-'));
  afterAll(async () => {
    // Let H5P's unawaited constructor mkdir settle before cleanup (avoids ENOENT race).
    await new Promise((resolve) => setTimeout(resolve, 100));
    fs.rmSync(base, { recursive: true, force: true });
  });

  it.each([
    ['exampleStore'],
    ['courseStore'],
    ['learningRecordStore'],
  ] as const)('throws a clear, named error when the %s adapter is missing', (port) => {
    const h5pStorages = createFsH5PStorages(base);
    const adapters = fullAdapters();
    delete adapters[port];
    expect(() => createEngine({ adapters, h5pStorages })).toThrowError(new RegExp(port));
  });

  it('boots with all adapters present', () => {
    const h5pStorages = createFsH5PStorages(base);
    const engine = createEngine({ adapters: fullAdapters(), h5pStorages });
    expect(typeof engine.createCourse).toBe('function');
    expect(typeof engine.recordStatement).toBe('function');
    expect(typeof engine.listActorRecords).toBe('function');
    expect(typeof engine.getCourse).toBe('function');
  });
});
