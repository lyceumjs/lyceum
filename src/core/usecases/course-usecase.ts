import type { Course, CourseStorePort } from '../ports/course-store.js';

function requireNonEmpty(value: string, path: string): void {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Lyceum: ${path} must be a non-empty string.`);
  }
}

/** Walk the aggregate and fail fast on the first invalid node, naming its path. */
function validateCourse(course: Course): void {
  requireNonEmpty(course.id, 'course.id');
  requireNonEmpty(course.title, 'course.title');
  course.units.forEach((unit, u) => {
    requireNonEmpty(unit.id, `course.units[${u}].id`);
    requireNonEmpty(unit.title, `course.units[${u}].title`);
    unit.lessons.forEach((lesson, l) => {
      requireNonEmpty(lesson.id, `course.units[${u}].lessons[${l}].id`);
      requireNonEmpty(lesson.title, `course.units[${u}].lessons[${l}].title`);
      lesson.contents.forEach((content, c) => {
        requireNonEmpty(content.id, `course.units[${u}].lessons[${l}].contents[${c}].id`);
        requireNonEmpty(content.title, `course.units[${u}].lessons[${l}].contents[${c}].title`);
      });
    });
  });
}

/**
 * Validate the full hierarchy, persist it, and return the read-back aggregate —
 * proof the port actually round-trips (FR-005).
 */
export async function createCourse(store: CourseStorePort, course: Course): Promise<Course> {
  validateCourse(course);
  await store.save(course);
  const persisted = await store.getById(course.id);
  if (!persisted) {
    throw new Error(`Lyceum: course '${course.id}' was not found after save — adapter is broken.`);
  }
  return persisted;
}

export function getCourse(store: CourseStorePort, id: string): Promise<Course | undefined> {
  return store.getById(id);
}
