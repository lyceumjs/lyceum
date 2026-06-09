import type { Pool } from 'pg';
import type { ExampleItem, ExampleStorePort } from '../../../src/core/index.js';

/**
 * Test-scoped Postgres adapter for the example port — used ONLY by the smoke run.
 * Not shipped; the published reference adapter lives in the host (ADR 0001).
 */
export class PgExampleStore implements ExampleStorePort {
  constructor(private readonly pool: Pool) {}

  async init(): Promise<void> {
    await this.pool.query(
      'CREATE TABLE IF NOT EXISTS example_items (id text PRIMARY KEY, title text NOT NULL)',
    );
  }

  async save(item: ExampleItem): Promise<void> {
    await this.pool.query(
      'INSERT INTO example_items (id, title) VALUES ($1, $2) ' +
        'ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title',
      [item.id, item.title],
    );
  }

  async getById(id: string): Promise<ExampleItem | undefined> {
    const result = await this.pool.query<{ id: string; title: string }>(
      'SELECT id, title FROM example_items WHERE id = $1',
      [id],
    );
    const row = result.rows[0];
    return row ? { id: row.id, title: row.title } : undefined;
  }
}
