import type { Course, CourseStorePort } from '../core/index.js';

/**
 * In-memory reference adapter for {@link CourseStorePort}. Deep-copies on save and
 * get so shared object references can't fake persistence.
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
}
