import { describe, it, expect } from 'vitest';
import type { LearningRecord, LearningRecordStorePort } from '../core/index.js';

const statement: LearningRecord = {
  id: 'r1',
  actor: 'learner-a',
  verb: 'answered',
  objectId: 'h5p-1',
  result: { success: true, score: { raw: 1, max: 1 } },
  timestamp: '2026-06-10T12:00:00.000Z',
};

/**
 * Reusable conformance suite for any {@link LearningRecordStorePort} adapter.
 * Lyceum runs it against the in-memory reference adapter; a host runs it against
 * its own adapter (e.g. Postgres) on its side (ADR 0001).
 */
export function runLearningRecordStoreContract(
  name: string,
  makeAdapter: () => LearningRecordStorePort | Promise<LearningRecordStorePort>,
): void {
  describe(`LearningRecordStorePort contract: ${name}`, () => {
    it('persists a record with a result and reads it back deep-equal', async () => {
      const store = await makeAdapter();
      await store.save(statement);
      expect(await store.getById('r1')).toEqual(statement);
    });

    it('persists a record without a result (result optional)', async () => {
      const store = await makeAdapter();
      const { result: _omitted, ...minimal } = statement;
      await store.save(minimal);
      expect(await store.getById('r1')).toEqual(minimal);
    });

    it('returns undefined for an unknown id', async () => {
      const store = await makeAdapter();
      expect(await store.getById('missing')).toBeUndefined();
    });

    it('lists exactly one actor\'s records', async () => {
      const store = await makeAdapter();
      await store.save(statement);
      await store.save({ ...statement, id: 'r2', actor: 'learner-b' });
      expect(await store.listByActor('learner-a')).toEqual([statement]);
    });

    it('upserts on save with the same id (latest wins)', async () => {
      const store = await makeAdapter();
      await store.save(statement);
      await store.save({ ...statement, verb: 'completed' });
      expect((await store.getById('r1'))?.verb).toBe('completed');
    });
  });
}
