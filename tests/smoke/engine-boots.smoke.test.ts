import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { createEngine, createFsH5PStorages } from '../../src/runtime/index.js';
import { InMemoryCourseStore, InMemoryLearningRecordStore } from '../../src/testing/index.js';
import { PgExampleStore } from './support/pg-example-adapter.js';

describe('engine boots end-to-end against a real database (SC-001)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let h5pBase: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine').start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    h5pBase = fs.mkdtempSync(path.join(os.tmpdir(), 'lyceum-smoke-'));
  });

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
    if (h5pBase) fs.rmSync(h5pBase, { recursive: true, force: true });
  });

  it('boots the H5P runtime and round-trips a domain item into Postgres', async () => {
    const store = new PgExampleStore(pool);
    await store.init();

    const engine = createEngine({
      adapters: {
        exampleStore: store,
        // The full Postgres path for these ports is the 002 example smoke (example/tests).
        courseStore: new InMemoryCourseStore(),
        learningRecordStore: new InMemoryLearningRecordStore(),
      },
      h5pStorages: createFsH5PStorages(h5pBase),
    });

    // H5P runtime initialized
    expect(typeof engine.h5p.ajaxEndpoint.getAjax).toBe('function');

    // Domain round-trip through the port against the real database
    const saved = await engine.createAndFetchItem({ id: 's1', title: 'Smoke Course' });
    expect(saved).toEqual({ id: 's1', title: 'Smoke Course' });

    // Independently confirm persistence
    const direct = await pool.query<{ title: string }>(
      'SELECT title FROM example_items WHERE id = $1',
      ['s1'],
    );
    expect(direct.rows[0]?.title).toBe('Smoke Course');
  });
});
