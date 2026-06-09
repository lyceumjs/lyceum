import { describe, it, expect } from 'vitest';
import {
  recordStatement,
  listActorRecords,
  type LearningRecord,
} from '../../src/core/index.js';
import { InMemoryLearningRecordStore } from '../../src/testing/index.js';

const statement: LearningRecord = {
  id: 'stmt-1',
  actor: 'demo-learner',
  verb: 'answered',
  objectId: 'h5p-42',
  result: { success: true, score: { raw: 1, max: 1 } },
  timestamp: '2026-06-10T12:00:00.000Z',
};

describe('learning-record use-cases — xAPI-style statements (FR-008)', () => {
  it('records a statement and reads it back deep-equal', async () => {
    const store = new InMemoryLearningRecordStore();
    expect(await recordStatement(store, statement)).toEqual(statement);
  });

  it('records a statement without a result (result is optional)', async () => {
    const store = new InMemoryLearningRecordStore();
    const { result: _omitted, ...minimal } = statement;
    expect(await recordStatement(store, minimal)).toEqual(minimal);
  });

  it('lists records for one actor only', async () => {
    const store = new InMemoryLearningRecordStore();
    await recordStatement(store, statement);
    await recordStatement(store, { ...statement, id: 'stmt-2', actor: 'someone-else' });
    const records = await listActorRecords(store, 'demo-learner');
    expect(records).toEqual([statement]);
  });

  it('rejects an empty verb, naming the field', async () => {
    const store = new InMemoryLearningRecordStore();
    await expect(recordStatement(store, { ...statement, verb: '' })).rejects.toThrowError(/verb/);
  });

  it('rejects a timestamp that is not a valid date, naming the field', async () => {
    const store = new InMemoryLearningRecordStore();
    await expect(
      recordStatement(store, { ...statement, timestamp: 'not-a-date' }),
    ).rejects.toThrowError(/timestamp/);
  });
});
