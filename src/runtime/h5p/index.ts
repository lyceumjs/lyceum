import * as H5P from '@lumieducation/h5p-server';
import type { H5PStorages } from './storage.js';

/**
 * The H5P runtime: the framework-agnostic core objects Lyceum wraps. A host mounts
 * `ajaxEndpoint` behind its own routing — Lyceum never runs its own HTTP server (ADR 0001).
 */
export interface H5PRuntime {
  readonly editor: H5P.H5PEditor;
  readonly player: H5P.H5PPlayer;
  readonly ajaxEndpoint: H5P.H5PAjaxEndpoint;
  readonly config: H5P.IH5PConfig;
}

/** Construct the H5P editor/player/AJAX endpoint from injected storage seams. */
export function createH5PRuntime(storages: H5PStorages): H5PRuntime {
  const config = new H5P.H5PConfig(storages.keyValueStorage);

  const editor = new H5P.H5PEditor(
    storages.keyValueStorage,
    config,
    storages.libraryStorage,
    storages.contentStorage,
    storages.temporaryStorage,
    undefined,
    undefined,
    undefined,
    storages.contentUserDataStorage,
  );

  const player = new H5P.H5PPlayer(
    storages.libraryStorage,
    storages.contentStorage,
    config,
    undefined,
    undefined,
    undefined,
    undefined,
    storages.contentUserDataStorage,
  );

  const ajaxEndpoint = new H5P.H5PAjaxEndpoint(editor);

  return { editor, player, ajaxEndpoint, config };
}
