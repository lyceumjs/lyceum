import fs from 'node:fs';
import type { LyceumEngine } from '@lyceumjs/lms/runtime';

/** Shape of `@lumieducation/h5p-server`'s IUser — typed structurally so the example
 * only imports Lyceum's public surface (SC-004). */
export interface H5PUser {
  email: string;
  id: string;
  name: string;
  type: 'local' | string;
}

/** Identity is a host concern (ADR 0001): the example supplies a fixed demo learner. */
export const DEMO_LEARNER: H5PUser = {
  id: 'demo-learner',
  name: 'Demo Learner',
  email: 'demo-learner@example.com',
  type: 'local',
};

/**
 * Push the committed `.h5p` fixture through the runtime's content-storage handler
 * (FR-009): `uploadPackage` validates the package and installs its libraries;
 * the save stores the content through the content storage. Returns the stored
 * content's id.
 */
export async function installFixture(
  engine: LyceumEngine,
  fixturePath: string,
  user: H5PUser = DEMO_LEARNER,
): Promise<{ contentId: string; ubername: string }> {
  const { editor } = engine.h5p;
  const { metadata, parameters } = await editor.uploadPackage(fs.readFileSync(fixturePath), user);
  if (!metadata) {
    throw new Error('uploadPackage returned no metadata — the fixture package is invalid.');
  }

  const main = metadata.preloadedDependencies?.find(
    (dependency) => dependency.machineName === metadata.mainLibrary,
  );
  if (!main) {
    throw new Error('Fixture h5p.json is missing its mainLibrary among preloadedDependencies.');
  }
  const ubername = `${main.machineName} ${main.majorVersion}.${main.minorVersion}`;

  const saved = await editor.saveOrUpdateContentReturnMetaData(
    undefined as unknown as string, // undefined = create new content
    parameters,
    metadata,
    ubername,
    user,
  );
  return { contentId: String(saved.id), ubername };
}
