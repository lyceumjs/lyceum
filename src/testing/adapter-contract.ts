import { describe, it, expect } from 'vitest';
import type { ExampleStorePort } from '../core/index.js';

/**
 * Reusable conformance suite for any {@link ExampleStorePort} adapter. Lyceum runs it
 * against the in-memory reference adapter; a host runs it against its own adapter
 * (e.g. Postgres) on its side — Lyceum's own tests do not run in hosts (ADR 0001).
 */
export function runAdapterContract(
  name: string,
  makeAdapter: () => ExampleStorePort | Promise<ExampleStorePort>,
): void {
  describe(`ExampleStorePort contract: ${name}`, () => {
    it('persists an item and reads it back', async () => {
      const store = await makeAdapter();
      await store.save({ id: 'a1', title: 'Hello' });
      expect(await store.getById('a1')).toEqual({ id: 'a1', title: 'Hello' });
    });

    it('returns undefined for an unknown id', async () => {
      const store = await makeAdapter();
      expect(await store.getById('missing')).toBeUndefined();
    });

    it('overwrites on save with the same id', async () => {
      const store = await makeAdapter();
      await store.save({ id: 'a1', title: 'First' });
      await store.save({ id: 'a1', title: 'Second' });
      expect(await store.getById('a1')).toEqual({ id: 'a1', title: 'Second' });
    });
  });
}
