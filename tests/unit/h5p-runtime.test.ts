import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createH5PRuntime, createFsH5PStorages } from '../../src/runtime/index.js';

describe('H5P runtime wrapper (FR-003)', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'lyceum-h5p-'));
  afterAll(async () => {
    // H5P's DirectoryTemporaryFileStorage fires an unawaited recursive mkdir in its
    // constructor; let it settle before removing the directory to avoid an ENOENT race.
    await new Promise((resolve) => setTimeout(resolve, 100));
    fs.rmSync(base, { recursive: true, force: true });
  });

  it('constructs editor, player and AJAX endpoint from injected storage', () => {
    const runtime = createH5PRuntime(createFsH5PStorages(base));
    expect(runtime.editor).toBeDefined();
    expect(runtime.player).toBeDefined();
    expect(runtime.ajaxEndpoint).toBeDefined();
    expect(typeof runtime.ajaxEndpoint.getAjax).toBe('function');
  });
});
