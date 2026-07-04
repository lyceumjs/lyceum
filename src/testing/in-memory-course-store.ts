import type { Course, CourseStorePort } from '../core/index.js';

/**
 * In-memory reference adapter for {@link CourseStorePort}. Deep-copies on save and
 * get so shared object references can't fake persistence. As the reference
 * adapter it supplies everything it stores to `list` (FR-004 — a platform
 * adapter may supply less).
 */
export class InMemoryCourseStore implements CourseStorePort {
  private readonly courses = new Map<string, Course>();

  async save(course: Course): Promise<void> {
    this.courses.set(course.id, structuredClone(course));
  }

  async getById(id: string): Promise<Course | undefined> {
    const course = this.courses.get(id);
    return course ? structuredClone(course) : undefined;
  }

  async list(): Promise<Course[]> {
    return [...this.courses.values()].map((course) => structuredClone(course));
  }

  async getBySlug(slug: string): Promise<Course | undefined> {
    for (const course of this.courses.values()) {
      if (course.slug === slug) return structuredClone(course);
    }
    return undefined;
  }

  async deleteById(id: string): Promise<void> {
    this.courses.delete(id);
  }
}
