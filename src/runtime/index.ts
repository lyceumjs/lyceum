/**
 * `@lyceumjs/lms/runtime` — framework-agnostic engine wiring. Injects domain-port
 * adapters + H5P storage and exposes the use-cases and H5P handlers. No bundled
 * HTTP server (ADR 0001).
 */
import { createAndFetchItem, type ExampleItem, type ExampleStorePort } from '../core/index.js';
import { createH5PRuntime, type H5PRuntime } from './h5p/index.js';
import type { H5PStorages } from './h5p/storage.js';

export { createH5PRuntime } from './h5p/index.js';
export { createFsH5PStorages } from './h5p/storage.js';
export type { H5PRuntime } from './h5p/index.js';
export type { H5PStorages } from './h5p/storage.js';

/** Adapters a host supplies for Lyceum's domain ports. */
export interface EngineAdapters {
  exampleStore?: ExampleStorePort;
}

export interface EngineOptions {
  adapters: EngineAdapters;
  h5pStorages: H5PStorages;
}

export interface LyceumEngine {
  readonly h5p: H5PRuntime;
  createAndFetchItem(item: ExampleItem): Promise<ExampleItem>;
}

/**
 * Compose the engine. Fails fast with a clear, named error if a required adapter is
 * missing — never silently assumes a datastore (spec Edge Case).
 */
export function createEngine(options: EngineOptions): LyceumEngine {
  const store = options.adapters.exampleStore;
  if (!store) {
    throw new Error(
      "Lyceum: no adapter configured for the required 'exampleStore' port. " +
        'A host MUST provide an ExampleStorePort implementation (e.g. from @lyceumjs/lms/testing).',
    );
  }

  const h5p = createH5PRuntime(options.h5pStorages);

  return {
    h5p,
    createAndFetchItem: (item) => createAndFetchItem(store, item),
  };
}
