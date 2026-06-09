import { beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import {
  runCourseStoreContract,
  runLearningRecordStoreContract,
  runAdapterContract,
} from '@lyceumjs/lms/testing';
import { initSchema } from '../src/schema.js';
import { PgExampleStore } from '../src/adapters/pg-example-store.js';
import { PgCourseStore } from '../src/adapters/pg-course-store.js';
import { PgLearningRecordStore } from '../src/adapters/pg-learning-record-store.js';

/**
 * The example's PG adapters must satisfy the same published port contracts a real
 * host would run against its own adapters (US4 — the example as living reference).
 */
let container: StartedPostgreSqlContainer;
let pool: Pool;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine').start();
  pool = new Pool({ connectionString: container.getConnectionUri() });
  await initSchema(pool);
});

afterAll(async () => {
  await pool?.end();
  await container?.stop();
});

// Each contract test gets a clean table (the suites assume isolated state).
runAdapterContract('PgExampleStore', async () => {
  await pool.query('TRUNCATE example_items');
  return new PgExampleStore(pool);
});

runCourseStoreContract('PgCourseStore', async () => {
  await pool.query('TRUNCATE courses');
  return new PgCourseStore(pool);
});

runLearningRecordStoreContract('PgLearningRecordStore', async () => {
  await pool.query('TRUNCATE learning_records');
  return new PgLearningRecordStore(pool);
});
