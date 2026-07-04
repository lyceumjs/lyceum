import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  createCourse,
  listCatalog,
  updateCourseInfo,
  getCourse,
  deleteCourse,
  addUnit,
  renameUnit,
  reorderUnits,
  removeUnit,
  addLesson,
  renameLesson,
  reorderLessons,
  removeLesson,
  attachContent,
  removeContent,
  LyceumDomainError,
} from '../../src/core/index.js';
import { InMemoryCourseStore } from '../../src/testing/index.js';

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('course lifecycle — create / update info / delete (spec 003 US1)', () => {
  it('creates a course from top-level info: minted id, ISO createdAt, empty structure', async () => {
    const store = new InMemoryCourseStore();
    const created = await createCourse(store, {
      title: 'Lyceum 101',
      description: 'Intro course',
      slug: 'lyceum-101',
      coverImage: 'https://example.com/cover.png',
    });

    expect(created.id).toBeTruthy();
    expect(created.createdAt).toMatch(ISO_UTC);
    expect(created.units).toEqual([]);
    expect(created.title).toBe('Lyceum 101');
    expect(created.description).toBe('Intro course');
    expect(created.slug).toBe('lyceum-101');
    expect(created.coverImage).toBe('https://example.com/cover.png');
    expect(await getCourse(store, created.id)).toEqual(created);
  });

  it('mints a distinct id per create', async () => {
    const store = new InMemoryCourseStore();
    const one = await createCourse(store, { title: 'One' });
    const two = await createCourse(store, { title: 'Two' });
    expect(one.id).not.toBe(two.id);
  });

  it('rejects an empty title with a path-naming VALIDATION error', async () => {
    const store = new InMemoryCourseStore();
    const failure = createCourse(store, { title: '   ' });
    await expect(failure).rejects.toBeInstanceOf(LyceumDomainError);
    await expect(failure).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(failure).rejects.toThrowError(/course\.title/);
  });

  it('rejects a non-URL-safe slug (VALIDATION)', async () => {
    const store = new InMemoryCourseStore();
    await expect(createCourse(store, { title: 'X', slug: 'Bad Slug!' })).rejects.toMatchObject({
      code: 'VALIDATION',
      message: expect.stringContaining('slug'),
    });
  });

  it('rejects a slug already held by another course (CONFLICT naming the holder)', async () => {
    const store = new InMemoryCourseStore();
    const holder = await createCourse(store, { title: 'First', slug: 'taken' });
    const failure = createCourse(store, { title: 'Second', slug: 'taken' });
    await expect(failure).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(failure).rejects.toThrowError(new RegExp(holder.id));
  });

  it('updateCourseInfo replaces the info as a whole and clears absent optional fields', async () => {
    const store = new InMemoryCourseStore();
    const created = await createCourse(store, {
      title: 'Before',
      description: 'Will be cleared',
      slug: 'before',
      coverImage: 'https://example.com/old.png',
    });

    const updated = await updateCourseInfo(store, created.id, { title: 'After', slug: 'after' });
    expect(updated.title).toBe('After');
    expect(updated.slug).toBe('after');
    expect(updated.description).toBeUndefined();
    expect(updated.coverImage).toBeUndefined();
  });

  it('updateCourseInfo never touches structure or createdAt', async () => {
    const store = new InMemoryCourseStore();
    const created = await createCourse(store, { title: 'Structured' });
    const updated = await updateCourseInfo(store, created.id, { title: 'Renamed' });
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.units).toEqual(created.units);
    expect(updated.id).toBe(created.id);
  });

  it('updateCourseInfo keeps the course’s own slug without a false CONFLICT', async () => {
    const store = new InMemoryCourseStore();
    const created = await createCourse(store, { title: 'Mine', slug: 'mine' });
    const updated = await updateCourseInfo(store, created.id, { title: 'Mine v2', slug: 'mine' });
    expect(updated.slug).toBe('mine');
  });

  it('updateCourseInfo rejects a slug held by a different course (CONFLICT)', async () => {
    const store = new InMemoryCourseStore();
    await createCourse(store, { title: 'Holder', slug: 'held' });
    const other = await createCourse(store, { title: 'Other' });
    await expect(updateCourseInfo(store, other.id, { title: 'Other', slug: 'held' })).rejects.toMatchObject(
      { code: 'CONFLICT' },
    );
  });

  it('updateCourseInfo on an unknown course is NOT_FOUND', async () => {
    const store = new InMemoryCourseStore();
    await expect(updateCourseInfo(store, 'nope', { title: 'X' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('getCourse returns undefined for an unknown id (a read, not an error)', async () => {
    const store = new InMemoryCourseStore();
    expect(await getCourse(store, 'nope')).toBeUndefined();
  });

  it('deleteCourse removes the course; deleting an unknown course is NOT_FOUND', async () => {
    const store = new InMemoryCourseStore();
    const created = await createCourse(store, { title: 'Doomed' });
    await deleteCourse(store, created.id);
    expect(await getCourse(store, created.id)).toBeUndefined();
    await expect(deleteCourse(store, created.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('course structure — discrete unit operations (spec 003 US1, FR-001/FR-002)', () => {
  async function seededCourse(store: InMemoryCourseStore) {
    const course = await createCourse(store, { title: 'Structured' });
    const unit = await addUnit(store, course.id, { title: 'Unit One' });
    const lesson = await addLesson(store, course.id, unit.id, { title: 'Lesson One' });
    return { course, unit, lesson };
  }

  it('addUnit appends last with a minted id and empty lessons', async () => {
    const store = new InMemoryCourseStore();
    const { course, unit } = await seededCourse(store);
    const second = await addUnit(store, course.id, { title: 'Unit Two' });

    expect(second.id).toBeTruthy();
    expect(second.id).not.toBe(unit.id);
    expect(second.lessons).toEqual([]);
    const readBack = await getCourse(store, course.id);
    expect(readBack?.units.map((u) => u.title)).toEqual(['Unit One', 'Unit Two']);
  });

  it('addUnit on an unknown course is NOT_FOUND; an empty title is VALIDATION', async () => {
    const store = new InMemoryCourseStore();
    const { course } = await seededCourse(store);
    await expect(addUnit(store, 'nope', { title: 'X' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(addUnit(store, course.id, { title: ' ' })).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });

  it('renameUnit renames exactly that unit; an unknown unit names unit and course', async () => {
    const store = new InMemoryCourseStore();
    const { course, unit } = await seededCourse(store);
    await renameUnit(store, course.id, unit.id, 'Renamed Unit');
    expect((await getCourse(store, course.id))?.units[0]?.title).toBe('Renamed Unit');

    const failure = renameUnit(store, course.id, 'ghost', 'X');
    await expect(failure).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(failure).rejects.toThrowError(new RegExp(`ghost.*${course.id}`));
  });

  it('reorderUnits applies an exact permutation', async () => {
    const store = new InMemoryCourseStore();
    const { course, unit } = await seededCourse(store);
    const second = await addUnit(store, course.id, { title: 'Unit Two' });
    await reorderUnits(store, course.id, [second.id, unit.id]);
    expect((await getCourse(store, course.id))?.units.map((u) => u.id)).toEqual([
      second.id,
      unit.id,
    ]);
  });

  it('reorderUnits rejects missing, extra, or duplicated ids — and writes nothing', async () => {
    const store = new InMemoryCourseStore();
    const { course, unit } = await seededCourse(store);
    const second = await addUnit(store, course.id, { title: 'Unit Two' });
    const before = await getCourse(store, course.id);

    for (const bad of [
      [unit.id], // missing one
      [second.id, unit.id, 'extra'], // extra id
      [unit.id, unit.id], // duplicate
    ]) {
      await expect(reorderUnits(store, course.id, bad)).rejects.toMatchObject({
        code: 'VALIDATION',
      });
    }
    expect(await getCourse(store, course.id)).toEqual(before);
  });

  it('removeUnit removes the unit together with its lessons', async () => {
    const store = new InMemoryCourseStore();
    const { course, unit } = await seededCourse(store);
    await removeUnit(store, course.id, unit.id);
    expect((await getCourse(store, course.id))?.units).toEqual([]);
  });

  it('addLesson appends into exactly the addressed unit', async () => {
    const store = new InMemoryCourseStore();
    const { course, unit, lesson } = await seededCourse(store);
    const other = await addUnit(store, course.id, { title: 'Unit Two' });
    const added = await addLesson(store, course.id, other.id, { title: 'Lesson Two' });

    expect(added.contents).toEqual([]);
    const readBack = await getCourse(store, course.id);
    expect(readBack?.units[0]?.lessons.map((l) => l.id)).toEqual([lesson.id]);
    expect(readBack?.units[1]?.lessons.map((l) => l.id)).toEqual([added.id]);
  });

  it('renameLesson / removeLesson address one lesson; unknown lesson is NOT_FOUND naming the path', async () => {
    const store = new InMemoryCourseStore();
    const { course, unit, lesson } = await seededCourse(store);
    await renameLesson(store, course.id, unit.id, lesson.id, 'Renamed Lesson');
    expect((await getCourse(store, course.id))?.units[0]?.lessons[0]?.title).toBe('Renamed Lesson');

    const failure = renameLesson(store, course.id, unit.id, 'ghost', 'X');
    await expect(failure).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(failure).rejects.toThrowError(new RegExp(`ghost.*${unit.id}`));

    await removeLesson(store, course.id, unit.id, lesson.id);
    expect((await getCourse(store, course.id))?.units[0]?.lessons).toEqual([]);
  });

  it('reorderLessons permutes within one unit only; bad lists are VALIDATION and write nothing', async () => {
    const store = new InMemoryCourseStore();
    const { course, unit, lesson } = await seededCourse(store);
    const second = await addLesson(store, course.id, unit.id, { title: 'Lesson Two' });
    await reorderLessons(store, course.id, unit.id, [second.id, lesson.id]);
    expect((await getCourse(store, course.id))?.units[0]?.lessons.map((l) => l.id)).toEqual([
      second.id,
      lesson.id,
    ]);

    const before = await getCourse(store, course.id);
    await expect(reorderLessons(store, course.id, unit.id, [lesson.id])).rejects.toMatchObject({
      code: 'VALIDATION',
    });
    expect(await getCourse(store, course.id)).toEqual(before);
  });

  it('attachContent mints an id and carries the opaque h5pContentId; removeContent detaches it', async () => {
    const store = new InMemoryCourseStore();
    const { course, unit, lesson } = await seededCourse(store);
    const ref = await attachContent(store, course.id, unit.id, lesson.id, {
      title: 'Quiz',
      h5pContentId: 'h5p-42',
    });

    expect(ref.id).toBeTruthy();
    expect(ref.h5pContentId).toBe('h5p-42');
    expect((await getCourse(store, course.id))?.units[0]?.lessons[0]?.contents).toEqual([ref]);

    await removeContent(store, course.id, unit.id, lesson.id, ref.id);
    expect((await getCourse(store, course.id))?.units[0]?.lessons[0]?.contents).toEqual([]);

    await expect(
      removeContent(store, course.id, unit.id, lesson.id, ref.id),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('a rejected operation leaves the stored course byte-identical', async () => {
    const store = new InMemoryCourseStore();
    const { course, unit } = await seededCourse(store);
    const before = await getCourse(store, course.id);

    await expect(renameUnit(store, course.id, 'ghost', 'X')).rejects.toBeInstanceOf(
      LyceumDomainError,
    );
    await expect(addLesson(store, course.id, 'ghost', { title: 'X' })).rejects.toBeInstanceOf(
      LyceumDomainError,
    );
    await expect(addUnit(store, course.id, { title: '' })).rejects.toBeInstanceOf(
      LyceumDomainError,
    );
    void unit;
    expect(await getCourse(store, course.id)).toEqual(before);
  });
});

describe('catalog — summaries newest-first, derived in core (spec 003 US2, FR-003)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns an empty list for an empty store (not an error)', async () => {
    const store = new InMemoryCourseStore();
    expect(await listCatalog(store)).toEqual([]);
  });

  it('lists summaries with unit/lesson counts, newest-first by createdAt', async () => {
    vi.useFakeTimers();
    const store = new InMemoryCourseStore();

    vi.setSystemTime(new Date('2026-07-04T10:00:00.000Z'));
    const oldest = await createCourse(store, {
      title: 'Oldest',
      slug: 'oldest',
      description: 'First in, last out',
      coverImage: 'https://example.com/oldest.png',
    });
    const unit = await addUnit(store, oldest.id, { title: 'U1' });
    await addLesson(store, oldest.id, unit.id, { title: 'L1' });
    await addLesson(store, oldest.id, unit.id, { title: 'L2' });
    const secondUnit = await addUnit(store, oldest.id, { title: 'U2' });
    await addLesson(store, oldest.id, secondUnit.id, { title: 'L3' });

    vi.setSystemTime(new Date('2026-07-04T11:00:00.000Z'));
    const newest = await createCourse(store, { title: 'Newest' });

    const catalog = await listCatalog(store);
    expect(catalog.map((entry) => entry.id)).toEqual([newest.id, oldest.id]);
    expect(catalog[1]).toEqual({
      id: oldest.id,
      title: 'Oldest',
      slug: 'oldest',
      description: 'First in, last out',
      coverImage: 'https://example.com/oldest.png',
      createdAt: '2026-07-04T10:00:00.000Z',
      unitCount: 2,
      lessonCount: 3,
    });
    expect(catalog[0]?.unitCount).toBe(0);
    expect(catalog[0]?.lessonCount).toBe(0);
  });

  it('breaks a createdAt tie deterministically by id (lexicographic ascending)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-04T12:00:00.000Z'));
    const store = new InMemoryCourseStore();
    const a = await createCourse(store, { title: 'Tie A' });
    const b = await createCourse(store, { title: 'Tie B' });

    const expected = [a.id, b.id].sort((left, right) => left.localeCompare(right));
    expect((await listCatalog(store)).map((entry) => entry.id)).toEqual(expected);
  });

  it('no longer lists a deleted course', async () => {
    const store = new InMemoryCourseStore();
    const keep = await createCourse(store, { title: 'Keep' });
    const drop = await createCourse(store, { title: 'Drop' });
    await deleteCourse(store, drop.id);
    expect((await listCatalog(store)).map((entry) => entry.id)).toEqual([keep.id]);
  });
});
