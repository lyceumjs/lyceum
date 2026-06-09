/**
 * Illustrative persistence port (constitution Principle III; data-model.md).
 *
 * This is the *pattern* a real domain port will follow — domain-typed, with no
 * SQL/driver/HTTP detail. Real LMS-domain ports arrive with later features.
 */

export interface ExampleItem {
  readonly id: string;
  readonly title: string;
}

export interface ExampleStorePort {
  save(item: ExampleItem): Promise<void>;
  getById(id: string): Promise<ExampleItem | undefined>;
}
