import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createEngine, createFsH5PStorages } from '../../src/runtime/index.js';

describe('composition fail-fast (spec Edge Case)', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'lyceum-ff-'));
  afterAll(async () => {
    // Let H5P's unawaited constructor mkdir settle before cleanup (avoids ENOENT race).
    await new Promise((resolve) => setTimeout(resolve, 100));
    fs.rmSync(base, { recursive: true, force: true });
  });

  it('throws a clear, named error when the exampleStore adapter is missing', () => {
    const h5pStorages = createFsH5PStorages(base);
    expect(() => createEngine({ adapters: {}, h5pStorages })).toThrowError(/exampleStore/);
  });
});
