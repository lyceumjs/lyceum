import { describe, it, expect } from 'vitest';
import { createCourse, getCourse, type Course } from '../../src/core/index.js';
import { InMemoryCourseStore } from '../../src/testing/index.js';

const course: Course = {
  id: 'course-1',
  title: 'Lyceum 101',
  units: [
    {
      id: 'unit-1',
      title: 'Getting started',
      lessons: [
        {
          id: 'lesson-1',
          title: 'First steps',
          contents: [{ id: 'content-1', title: 'Intro quiz', h5pContentId: 'h5p-42' }],
        },
      ],
    },
  ],
};

describe('course use-cases — full hierarchy, database-agnostic (FR-008)', () => {
  it('creates a course → units → lessons → content tree and reads it back deep-equal', async () => {
    const store = new InMemoryCourseStore();
    const result = await createCourse(store, course);
    expect(result).toEqual(course);
    expect(await getCourse(store, 'course-1')).toEqual(course);
  });

  it('returns undefined for an unknown course id', async () => {
    const store = new InMemoryCourseStore();
    expect(await getCourse(store, 'nope')).toBeUndefined();
  });

  it('rejects an empty course id, naming the field', async () => {
    const store = new InMemoryCourseStore();
    await expect(createCourse(store, { ...course, id: '' })).rejects.toThrowError(/course\.id/);
  });

  it('rejects a nested node with an empty title, naming the path', async () => {
    const store = new InMemoryCourseStore();
    const bad: Course = structuredClone(course);
    bad.units[0]!.lessons[0]!.title = '';
    await expect(createCourse(store, bad)).rejects.toThrowError(
      /course\.units\[0\]\.lessons\[0\]\.title/,
    );
  });
});
