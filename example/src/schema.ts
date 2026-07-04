import type { Pool } from 'pg';

/**
 * Idempotent schema creation — this IS the "seeded on container startup" step
 * (FR-003): the smoke's Testcontainers database starts empty every run; the dev
 * host initializes the compose database the same way on boot. The ALTERs keep a
 * persisted dev database in step with spec 003's grown course columns.
 */
export async function initSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS example_items (
      id    text PRIMARY KEY,
      title text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS courses (
      id         text  PRIMARY KEY,
      doc        jsonb NOT NULL,
      slug       text,
      created_at timestamptz
    );
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS slug text;
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_at timestamptz;
    CREATE UNIQUE INDEX IF NOT EXISTS courses_slug_unique
      ON courses (slug) WHERE slug IS NOT NULL;
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
