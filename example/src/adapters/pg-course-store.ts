import type { Pool } from 'pg';
import type { Course, CourseStorePort } from '@lyceumjs/lms';

/**
 * Example-only Postgres adapter: the course aggregate is stored whole as a JSONB
 * document, with `slug` and `created_at` mirrored into columns (unique partial
 * index + spot-check support). An example-side mapping choice, not engine
 * guidance — a real host may normalize (ADR 0001: the reference adapter lives in
 * the consuming host). As a reference-style adapter it supplies everything it
 * stores to `list` (FR-004 — a platform adapter may supply less).
 */
export class PgCourseStore implements CourseStorePort {
  constructor(private readonly pool: Pool) {}

  async save(course: Course): Promise<void> {
    await this.pool.query(
      `INSERT INTO courses (id, doc, slug, created_at) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
         SET doc = EXCLUDED.doc, slug = EXCLUDED.slug, created_at = EXCLUDED.created_at`,
      [course.id, JSON.stringify(course), course.slug ?? null, course.createdAt],
    );
  }

  async getById(id: string): Promise<Course | undefined> {
    const { rows } = await this.pool.query<{ doc: Course }>(
      'SELECT doc FROM courses WHERE id = $1',
      [id],
    );
    return rows[0]?.doc;
  }

  async list(): Promise<Course[]> {
    const { rows } = await this.pool.query<{ doc: Course }>('SELECT doc FROM courses');
    return rows.map((row) => row.doc);
  }

  async getBySlug(slug: string): Promise<Course | undefined> {
    const { rows } = await this.pool.query<{ doc: Course }>(
      'SELECT doc FROM courses WHERE slug = $1',
      [slug],
    );
    return rows[0]?.doc;
  }

  async deleteById(id: string): Promise<void> {
    await this.pool.query('DELETE FROM courses WHERE id = $1', [id]);
  }
}
