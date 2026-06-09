import type { Pool } from 'pg';
import type { ExampleItem, ExampleStorePort } from '@lyceumjs/lms';

/** Example-only Postgres adapter for the 001 placeholder port (ADR 0001). */
export class PgExampleStore implements ExampleStorePort {
  constructor(private readonly pool: Pool) {}

  async save(item: ExampleItem): Promise<void> {
    await this.pool.query(
      `INSERT INTO example_items (id, title) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title`,
      [item.id, item.title],
    );
  }

  async getById(id: string): Promise<ExampleItem | undefined> {
    const { rows } = await this.pool.query<ExampleItem>(
      'SELECT id, title FROM example_items WHERE id = $1',
      [id],
    );
    return rows[0];
  }
}
