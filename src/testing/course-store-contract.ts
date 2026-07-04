import { describe, it, expect } from 'vitest';
import type { Course, CourseStorePort } from '../core/index.js';

const tree: Course = {
  id: 'c1',
  title: 'Contract Course',
  description: 'Round-trips the full descriptive set (spec 003).',
  slug: 'contract-course',
  coverImage: 'https://example.com/cover.png',
  createdAt: '2026-07-04T10:00:00.000Z',
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

const second: Course = {
  id: 'c2',
  title: 'Second Course',
  slug: 'second-course',
  createdAt: '2026-07-04T11:00:00.000Z',
  units: [],
};

/**
 * Reusable conformance suite for any {@link CourseStorePort} adapter. Lyceum runs
 * it against the in-memory reference adapter; a host runs it against its own
 * adapter (e.g. Postgres) on its side (ADR 0001). `list` carries NO ordering
 * contract (core sorts the catalog) and, for a reference adapter, supplies
 * everything stored — a platform adapter may supply less (FR-004), which this
 * suite does not constrain.
 */
export function runCourseStoreContract(
  name: string,
  makeAdapter: () => CourseStorePort | Promise<CourseStorePort>,
): void {
  describe(`CourseStorePort contract: ${name}`, () => {
    it('persists a full course tree and reads it back deep-equal (descriptive set included)', async () => {
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

    it('list returns every saved course exactly once, in any order', async () => {
      const store = await makeAdapter();
      await store.save(tree);
      await store.save(second);
      const listed = await store.list();
      expect(listed.map((course) => course.id).sort()).toEqual(['c1', 'c2']);
    });

    it('list does not duplicate a course after re-saving it', async () => {
      const store = await makeAdapter();
      await store.save(tree);
      await store.save({ ...tree, title: 'Renamed again' });
      const listed = await store.list();
      expect(listed).toHaveLength(1);
      expect(listed[0]?.title).toBe('Renamed again');
    });

    it('getBySlug finds a saved course and returns undefined for an unknown slug', async () => {
      const store = await makeAdapter();
      await store.save(tree);
      expect((await store.getBySlug('contract-course'))?.id).toBe('c1');
      expect(await store.getBySlug('nope')).toBeUndefined();
    });

    it('getBySlug tracks a slug change on re-save (old slug gone, new one found)', async () => {
      const store = await makeAdapter();
      await store.save(tree);
      await store.save({ ...tree, slug: 'renamed-slug' });
      expect(await store.getBySlug('contract-course')).toBeUndefined();
      expect((await store.getBySlug('renamed-slug'))?.id).toBe('c1');
    });

    it('deleteById removes the course from getById, getBySlug, and list', async () => {
      const store = await makeAdapter();
      await store.save(tree);
      await store.save(second);
      await store.deleteById('c1');
      expect(await store.getById('c1')).toBeUndefined();
      expect(await store.getBySlug('contract-course')).toBeUndefined();
      expect((await store.list()).map((course) => course.id)).toEqual(['c2']);
    });

    it('deleteById of an unknown id resolves without error (idempotent)', async () => {
      const store = await makeAdapter();
      await expect(store.deleteById('missing')).resolves.toBeUndefined();
    });

    it('a deleted id can be saved again', async () => {
      const store = await makeAdapter();
      await store.save(tree);
      await store.deleteById('c1');
      await store.save(tree);
      expect(await store.getById('c1')).toEqual(tree);
    });
  });
}
