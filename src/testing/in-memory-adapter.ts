import type { ExampleItem, ExampleStorePort } from '../core/index.js';

/**
 * In-memory reference adapter for {@link ExampleStorePort}. Lets a host (or Lyceum's
 * own unit tests) exercise the domain core with no database (SC-002).
 */
export class InMemoryExampleStore implements ExampleStorePort {
  readonly #items = new Map<string, ExampleItem>();

  async save(item: ExampleItem): Promise<void> {
    this.#items.set(item.id, { ...item });
  }

  async getById(id: string): Promise<ExampleItem | undefined> {
    const found = this.#items.get(id);
    return found ? { ...found } : undefined;
  }
}
