/**
 * Learning record — a minimal xAPI-style statement (FR-008, spec 002). Not a full
 * LRS: just the shape the engine needs to capture and read back attempts. Ids,
 * actor identity, and timestamps are supplied by the caller — the core stays
 * clock-free and identity-free (identity is a host concern, ADR 0001).
 */
export interface LearningRecordResult {
  success?: boolean;
  score?: { raw: number; max: number };
}

export interface LearningRecord {
  id: string;
  /** Learner identity, supplied by the host (identity seam). */
  actor: string;
  /** xAPI-style verb, e.g. 'answered', 'completed'. */
  verb: string;
  /** The content the statement is about (e.g. an H5P content id or ContentRef id). */
  objectId: string;
  result?: LearningRecordResult;
  /** ISO-8601, supplied by the caller. */
  timestamp: string;
}

/** Persistence port for learning records. `save` upserts by id. */
export interface LearningRecordStorePort {
  save(record: LearningRecord): Promise<void>;
  getById(id: string): Promise<LearningRecord | undefined>;
  listByActor(actor: string): Promise<LearningRecord[]>;
}
