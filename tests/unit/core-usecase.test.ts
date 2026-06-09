import { describe, it, expect } from 'vitest';
import { createAndFetchItem } from '../../src/core/index.js';
import { InMemoryExampleStore } from '../../src/testing/index.js';

describe('core use-case — database-agnostic (SC-002)', () => {
  it('creates and fetches an item against the in-memory adapter with no database', async () => {
    const store = new InMemoryExampleStore();
    const result = await createAndFetchItem(store, { id: 'x1', title: 'Lesson 1' });
    expect(result).toEqual({ id: 'x1', title: 'Lesson 1' });
  });
});
