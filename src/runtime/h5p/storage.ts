import * as fs from 'node:fs';
import path from 'node:path';
import * as H5P from '@lumieducation/h5p-server';
import type {
  IContentStorage,
  IContentUserDataStorage,
  IKeyValueStorage,
  ILibraryStorage,
  ITemporaryFileStorage,
} from '@lumieducation/h5p-server';

/** The four H5P storage seams + the key-value store the editor/config need. */
export interface H5PStorages {
  keyValueStorage: IKeyValueStorage;
  libraryStorage: ILibraryStorage;
  contentStorage: IContentStorage;
  temporaryStorage: ITemporaryFileStorage;
  contentUserDataStorage: IContentUserDataStorage;
}

/**
 * Filesystem-backed H5P storage for local dev / smoke (Decision 8). Whether H5P
 * libraries/temp files ultimately live on fs/S3 vs the host DB stays the deferred
 * ADR 0001 open call — this fs default unblocks the foundation without prejudging it.
 */
export function createFsH5PStorages(baseDir: string): H5PStorages {
  const {
    FileContentStorage,
    FileLibraryStorage,
    DirectoryTemporaryFileStorage,
    FileContentUserDataStorage,
    InMemoryStorage,
  } = H5P.fsImplementations;

  const libraries = path.join(baseDir, 'libraries');
  const content = path.join(baseDir, 'content');
  const temporary = path.join(baseDir, 'temporary');
  const userData = path.join(baseDir, 'user-data');
  for (const dir of [libraries, content, temporary, userData]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return {
    keyValueStorage: new InMemoryStorage(),
    libraryStorage: new FileLibraryStorage(libraries),
    contentStorage: new FileContentStorage(content),
    temporaryStorage: new DirectoryTemporaryFileStorage(temporary),
    contentUserDataStorage: new FileContentUserDataStorage(userData),
  };
}
