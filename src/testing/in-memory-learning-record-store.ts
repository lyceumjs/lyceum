import type { LearningRecord, LearningRecordStorePort } from '../core/index.js';

/**
 * In-memory reference adapter for {@link LearningRecordStorePort}. Deep-copies on
 * save and get so shared object references can't fake persistence.
 */
export class InMemoryLearningRecordStore implements LearningRecordStorePort {
  private readonly records = new Map<string, LearningRecord>();

  async save(record: LearningRecord): Promise<void> {
    this.records.set(record.id, structuredClone(record));
  }

  async getById(id: string): Promise<LearningRecord | undefined> {
    const record = this.records.get(id);
    return record ? structuredClone(record) : undefined;
  }

  async listByActor(actor: string): Promise<LearningRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.actor === actor)
      .map((record) => structuredClone(record));
  }
}
