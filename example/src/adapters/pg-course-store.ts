import type { Pool } from 'pg';
import type { Course, CourseStorePort } from '@lyceumjs/lms';

/**
 * Example-only Postgres adapter: the course aggregate is stored whole as a JSONB
 * document. An example-side mapping choice, not engine guidance — a real host may
 * normalize (ADR 0001: the reference adapter lives in the consuming host).
 */
export class PgCourseStore implements CourseStorePort {
  constructor(private readonly pool: Pool) {}

  async save(course: Course): Promise<void> {
    await this.pool.query(
      `INSERT INTO courses (id, doc) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc`,
      [course.id, JSON.stringify(course)],
    );
  }

  async getById(id: string): Promise<Course | undefined> {
    const { rows } = await this.pool.query<{ doc: Course }>(
      'SELECT doc FROM courses WHERE id = $1',
      [id],
    );
    return rows[0]?.doc;
  }
}
