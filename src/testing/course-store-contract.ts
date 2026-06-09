import { describe, it, expect } from 'vitest';
import type { Course, CourseStorePort } from '../core/index.js';

const tree: Course = {
  id: 'c1',
  title: 'Contract Course',
  units: [
    {
      id: 'u1',
      title: 'Unit',
      lessons: [
        { id: 'l1', title: 'Lesson', contents: [{ id: 'k1', title: 'Quiz', h5pContentId: 'h5p-1' }] },
      ],
    },
  ],
};

/**
 * Reusable conformance suite for any {@link CourseStorePort} adapter. Lyceum runs
 * it against the in-memory reference adapter; a host runs it against its own
 * adapter (e.g. Postgres) on its side (ADR 0001).
 */
export function runCourseStoreContract(
  name: string,
  makeAdapter: () => CourseStorePort | Promise<CourseStorePort>,
): void {
  describe(`CourseStorePort contract: ${name}`, () => {
    it('persists a full course tree and reads it back deep-equal', async () => {
      const store = await makeAdapter();
      await store.save(tree);
      expect(await store.getById('c1')).toEqual(tree);
    });

    it('returns undefined for an unknown id', async () => {
      const store = await makeAdapter();
      expect(await store.getById('missing')).toBeUndefined();
    });

    it('upserts on save with the same id (latest wins)', async () => {
      const store = await makeAdapter();
      await store.save(tree);
      await store.save({ ...tree, title: 'Renamed' });
      expect((await store.getById('c1'))?.title).toBe('Renamed');
    });

    it('returns a copy, not the saved reference (real persistence, not aliasing)', async () => {
      const store = await makeAdapter();
      await store.save(tree);
      const readBack = await store.getById('c1');
      expect(readBack).not.toBe(tree);
      expect(readBack?.units[0]).not.toBe(tree.units[0]);
    });
  });
}
