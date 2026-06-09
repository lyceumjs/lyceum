import type { ExampleItem, ExampleStorePort } from '../ports/example-store.js';

/**
 * Minimal pure use-case that depends only on a port — proves the domain core runs
 * with zero persistence coupling (SC-002).
 */
export async function createAndFetchItem(
  store: ExampleStorePort,
  item: ExampleItem,
): Promise<ExampleItem> {
  await store.save(item);
  const fetched = await store.getById(item.id);
  if (!fetched) {
    throw new Error(`Lyceum: item "${item.id}" was not persisted by the configured adapter`);
  }
  return fetched;
}
