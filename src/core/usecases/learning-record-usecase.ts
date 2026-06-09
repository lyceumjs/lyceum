import type { LearningRecord, LearningRecordStorePort } from '../ports/learning-record-store.js';

function requireNonEmpty(value: string, path: string): void {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Lyceum: ${path} must be a non-empty string.`);
  }
}

function validateRecord(record: LearningRecord): void {
  requireNonEmpty(record.id, 'record.id');
  requireNonEmpty(record.actor, 'record.actor');
  requireNonEmpty(record.verb, 'record.verb');
  requireNonEmpty(record.objectId, 'record.objectId');
  requireNonEmpty(record.timestamp, 'record.timestamp');
  if (Number.isNaN(Date.parse(record.timestamp))) {
    throw new Error(`Lyceum: record.timestamp must be an ISO-8601 date, got '${record.timestamp}'.`);
  }
}

/**
 * Validate the statement, persist it, and return the read-back record — proof the
 * port actually round-trips (FR-005).
 */
export async function recordStatement(
  store: LearningRecordStorePort,
  record: LearningRecord,
): Promise<LearningRecord> {
  validateRecord(record);
  await store.save(record);
  const persisted = await store.getById(record.id);
  if (!persisted) {
    throw new Error(`Lyceum: record '${record.id}' was not found after save — adapter is broken.`);
  }
  return persisted;
}

export function listActorRecords(
  store: LearningRecordStorePort,
  actor: string,
): Promise<LearningRecord[]> {
  return store.listByActor(actor);
}
