import { LyceumDomainError } from '../errors.js';
import type {
  ContentRef,
  Course,
  CourseInfo,
  CourseSummary,
  CourseStorePort,
  Lesson,
  Unit,
} from '../ports/course-store.js';

/** URL-safe slug (research R7). */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function requireNonEmpty(value: string, path: string): void {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new LyceumDomainError('VALIDATION', `Lyceum: ${path} must be a non-empty string.`);
  }
}

/** Walk the aggregate and fail fast on the first invalid node, naming its path.
 * Kept as the save-time guard (research R6) behind the operation-level checks. */
function validateCourse(course: Course): void {
  requireNonEmpty(course.id, 'course.id');
  requireNonEmpty(course.title, 'course.title');
  requireNonEmpty(course.createdAt, 'course.createdAt');
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

function validateInfo(info: CourseInfo): void {
  requireNonEmpty(info.title, 'course.title');
  if (info.slug !== undefined && !SLUG_PATTERN.test(info.slug)) {
    throw new LyceumDomainError(
      'VALIDATION',
      `Lyceum: course.slug '${info.slug}' must be URL-safe (lowercase letters, digits, single hyphens).`,
    );
  }
}

/** Replace the whole top-level info on the target; absent optional fields clear. */
function applyInfo(course: Course, info: CourseInfo): void {
  course.title = info.title;
  if (info.description !== undefined) course.description = info.description;
  else delete course.description;
  if (info.slug !== undefined) course.slug = info.slug;
  else delete course.slug;
  if (info.coverImage !== undefined) course.coverImage = info.coverImage;
  else delete course.coverImage;
}

async function requireCourse(store: CourseStorePort, courseId: string): Promise<Course> {
  const course = await store.getById(courseId);
  if (!course) {
    throw new LyceumDomainError('NOT_FOUND', `Lyceum: course '${courseId}' not found.`);
  }
  return course;
}

/** Slug uniqueness spans the WHOLE store — hence getBySlug, never list() (research R4). */
async function ensureSlugFree(
  store: CourseStorePort,
  slug: string | undefined,
  selfId: string | undefined,
): Promise<void> {
  if (slug === undefined) return;
  const holder = await store.getBySlug(slug);
  if (holder && holder.id !== selfId) {
    throw new LyceumDomainError(
      'CONFLICT',
      `Lyceum: course.slug '${slug}' is already used by course '${holder.id}'.`,
    );
  }
}

/** Validate the whole aggregate, persist it, and return the read-back —
 * proof the adapter actually round-trips (kept from 002). */
async function persist(store: CourseStorePort, course: Course): Promise<Course> {
  validateCourse(course);
  await store.save(course);
  const persisted = await store.getById(course.id);
  if (!persisted) {
    throw new Error(`Lyceum: course '${course.id}' was not found after save — adapter is broken.`);
  }
  return persisted;
}

/**
 * Create a course from its top-level info: engine-minted id (R2), `createdAt`
 * set once (R3), empty structure. Returns the persisted course.
 */
export async function createCourse(store: CourseStorePort, info: CourseInfo): Promise<Course> {
  validateInfo(info);
  await ensureSlugFree(store, info.slug, undefined);
  const course: Course = {
    id: crypto.randomUUID(),
    title: info.title,
    createdAt: new Date().toISOString(),
    units: [],
  };
  applyInfo(course, info);
  return persist(store, course);
}

/** Whole-replace of the top-level info; never touches structure or `createdAt`. */
export async function updateCourseInfo(
  store: CourseStorePort,
  courseId: string,
  info: CourseInfo,
): Promise<Course> {
  validateInfo(info);
  const course = await requireCourse(store, courseId);
  await ensureSlugFree(store, info.slug, courseId);
  applyInfo(course, info);
  return persist(store, course);
}

export function getCourse(store: CourseStorePort, id: string): Promise<Course | undefined> {
  return store.getById(id);
}

export async function deleteCourse(store: CourseStorePort, courseId: string): Promise<void> {
  await requireCourse(store, courseId);
  await store.deleteById(courseId);
}

/**
 * Catalog read model (spec 003 US2): summaries of the courses the adapter
 * supplies (FR-004 — availability is the adapter's rule), sorted in core
 * newest-first by `createdAt` with a deterministic id tie-break (research R3).
 * Adapters carry no ordering contract.
 */
export async function listCatalog(store: CourseStorePort): Promise<CourseSummary[]> {
  const courses = await store.list();
  return courses
    .map((course): CourseSummary => {
      const summary: CourseSummary = {
        id: course.id,
        title: course.title,
        createdAt: course.createdAt,
        unitCount: course.units.length,
        lessonCount: course.units.reduce((total, unit) => total + unit.lessons.length, 0),
      };
      if (course.description !== undefined) summary.description = course.description;
      if (course.slug !== undefined) summary.slug = course.slug;
      if (course.coverImage !== undefined) summary.coverImage = course.coverImage;
      return summary;
    })
    .sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
    );
}

// --- Discrete structure operations (spec 003 US1; research R1) ----------------
// Each is read-modify-write: load the aggregate, validate the intent against the
// current state, persist the whole. A rejected operation never reaches save.

function findUnit(course: Course, unitId: string): Unit {
  const unit = course.units.find((candidate) => candidate.id === unitId);
  if (!unit) {
    throw new LyceumDomainError(
      'NOT_FOUND',
      `Lyceum: unit '${unitId}' not found in course '${course.id}'.`,
    );
  }
  return unit;
}

function findLesson(course: Course, unit: Unit, lessonId: string): Lesson {
  const lesson = unit.lessons.find((candidate) => candidate.id === lessonId);
  if (!lesson) {
    throw new LyceumDomainError(
      'NOT_FOUND',
      `Lyceum: lesson '${lessonId}' not found in unit '${unit.id}' of course '${course.id}'.`,
    );
  }
  return lesson;
}

/** Exact-permutation reorder (spec Edge Case): same length, same id set, no duplicates. */
function reorderByIds<T extends { id: string }>(items: T[], orderedIds: string[], what: string): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const unique = new Set(orderedIds);
  const isPermutation =
    orderedIds.length === items.length &&
    unique.size === orderedIds.length &&
    orderedIds.every((id) => byId.has(id));
  if (!isPermutation) {
    throw new LyceumDomainError(
      'VALIDATION',
      `Lyceum: ${what} must be an exact permutation of the existing ids (no missing, extra, or duplicated ids).`,
    );
  }
  return orderedIds.map((id) => byId.get(id) as T);
}

export async function addUnit(
  store: CourseStorePort,
  courseId: string,
  input: { title: string },
): Promise<Unit> {
  requireNonEmpty(input.title, 'unit.title');
  const course = await requireCourse(store, courseId);
  const unit: Unit = { id: crypto.randomUUID(), title: input.title, lessons: [] };
  course.units.push(unit);
  await persist(store, course);
  return unit;
}

export async function renameUnit(
  store: CourseStorePort,
  courseId: string,
  unitId: string,
  title: string,
): Promise<void> {
  requireNonEmpty(title, 'unit.title');
  const course = await requireCourse(store, courseId);
  findUnit(course, unitId).title = title;
  await persist(store, course);
}

export async function reorderUnits(
  store: CourseStorePort,
  courseId: string,
  orderedUnitIds: string[],
): Promise<void> {
  const course = await requireCourse(store, courseId);
  course.units = reorderByIds(course.units, orderedUnitIds, `course '${courseId}' unit order`);
  await persist(store, course);
}

export async function removeUnit(
  store: CourseStorePort,
  courseId: string,
  unitId: string,
): Promise<void> {
  const course = await requireCourse(store, courseId);
  findUnit(course, unitId); // NOT_FOUND before mutating
  course.units = course.units.filter((unit) => unit.id !== unitId);
  await persist(store, course);
}

export async function addLesson(
  store: CourseStorePort,
  courseId: string,
  unitId: string,
  input: { title: string },
): Promise<Lesson> {
  requireNonEmpty(input.title, 'lesson.title');
  const course = await requireCourse(store, courseId);
  const unit = findUnit(course, unitId);
  const lesson: Lesson = { id: crypto.randomUUID(), title: input.title, contents: [] };
  unit.lessons.push(lesson);
  await persist(store, course);
  return lesson;
}

export async function renameLesson(
  store: CourseStorePort,
  courseId: string,
  unitId: string,
  lessonId: string,
  title: string,
): Promise<void> {
  requireNonEmpty(title, 'lesson.title');
  const course = await requireCourse(store, courseId);
  findLesson(course, findUnit(course, unitId), lessonId).title = title;
  await persist(store, course);
}

export async function reorderLessons(
  store: CourseStorePort,
  courseId: string,
  unitId: string,
  orderedLessonIds: string[],
): Promise<void> {
  const course = await requireCourse(store, courseId);
  const unit = findUnit(course, unitId);
  unit.lessons = reorderByIds(
    unit.lessons,
    orderedLessonIds,
    `unit '${unitId}' lesson order in course '${courseId}'`,
  );
  await persist(store, course);
}

export async function removeLesson(
  store: CourseStorePort,
  courseId: string,
  unitId: string,
  lessonId: string,
): Promise<void> {
  const course = await requireCourse(store, courseId);
  const unit = findUnit(course, unitId);
  findLesson(course, unit, lessonId); // NOT_FOUND before mutating
  unit.lessons = unit.lessons.filter((lesson) => lesson.id !== lessonId);
  await persist(store, course);
}

export async function attachContent(
  store: CourseStorePort,
  courseId: string,
  unitId: string,
  lessonId: string,
  input: { title: string; h5pContentId?: string },
): Promise<ContentRef> {
  requireNonEmpty(input.title, 'content.title');
  const course = await requireCourse(store, courseId);
  const lesson = findLesson(course, findUnit(course, unitId), lessonId);
  const ref: ContentRef = { id: crypto.randomUUID(), title: input.title };
  if (input.h5pContentId !== undefined) ref.h5pContentId = input.h5pContentId;
  lesson.contents.push(ref);
  await persist(store, course);
  return ref;
}

export async function removeContent(
  store: CourseStorePort,
  courseId: string,
  unitId: string,
  lessonId: string,
  contentId: string,
): Promise<void> {
  const course = await requireCourse(store, courseId);
  const lesson = findLesson(course, findUnit(course, unitId), lessonId);
  if (!lesson.contents.some((content) => content.id === contentId)) {
    throw new LyceumDomainError(
      'NOT_FOUND',
      `Lyceum: content '${contentId}' not found in lesson '${lessonId}' of course '${courseId}'.`,
    );
  }
  lesson.contents = lesson.contents.filter((content) => content.id !== contentId);
  await persist(store, course);
}
