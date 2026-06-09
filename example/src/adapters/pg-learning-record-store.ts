import type { Pool } from 'pg';
import type { LearningRecord, LearningRecordResult, LearningRecordStorePort } from '@lyceumjs/lms';

interface Row {
  id: string;
  actor: string;
  verb: string;
  object_id: string;
  result: LearningRecordResult | null;
  ts: Date;
}

function toRecord(row: Row): LearningRecord {
  return {
    id: row.id,
    actor: row.actor,
    verb: row.verb,
    objectId: row.object_id,
    ...(row.result === null ? {} : { result: row.result }),
    timestamp: row.ts.toISOString(),
  };
}

/** Example-only Postgres adapter: one row per xAPI-style statement. */
export class PgLearningRecordStore implements LearningRecordStorePort {
  constructor(private readonly pool: Pool) {}

  async save(record: LearningRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO learning_records (id, actor, verb, object_id, result, ts)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
         SET actor = EXCLUDED.actor, verb = EXCLUDED.verb, object_id = EXCLUDED.object_id,
             result = EXCLUDED.result, ts = EXCLUDED.ts`,
      [
        record.id,
        record.actor,
        record.verb,
        record.objectId,
        record.result === undefined ? null : JSON.stringify(record.result),
        record.timestamp,
      ],
    );
  }

  async getById(id: string): Promise<LearningRecord | undefined> {
    const { rows } = await this.pool.query<Row>(
      'SELECT id, actor, verb, object_id, result, ts FROM learning_records WHERE id = $1',
      [id],
    );
    return rows[0] ? toRecord(rows[0]) : undefined;
  }

  async listByActor(actor: string): Promise<LearningRecord[]> {
    const { rows } = await this.pool.query<Row>(
      `SELECT id, actor, verb, object_id, result, ts FROM learning_records
       WHERE actor = $1 ORDER BY ts, id`,
      [actor],
    );
    return rows.map(toRecord);
  }
}
