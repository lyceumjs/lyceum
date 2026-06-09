import type { Pool } from 'pg';

/**
 * Idempotent schema creation — this IS the "seeded on container startup" step
 * (FR-003): the smoke's Testcontainers database starts empty every run; the dev
 * host initializes the compose database the same way on boot.
 */
export async function initSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS example_items (
      id    text PRIMARY KEY,
      title text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS courses (
      id  text  PRIMARY KEY,
      doc jsonb NOT NULL
    );
    CREATE TABLE IF NOT EXISTS learning_records (
      id        text        PRIMARY KEY,
      actor     text        NOT NULL,
      verb      text        NOT NULL,
      object_id text        NOT NULL,
      result    jsonb,
      ts        timestamptz NOT NULL
    );
  `);
}
