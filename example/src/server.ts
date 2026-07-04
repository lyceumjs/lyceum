/**
 * The example dev host (FR-011): one single-origin Express server that mounts
 * Lyceum's runtime handlers and serves the FE page playing the H5P fixture.
 * Dev-only — uses the compose-managed database; the automated smoke uses its own
 * ephemeral container (FR-003).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Pool } from 'pg';
import { createEngine, createFsH5PStorages } from '@lyceumjs/lms/runtime';
import { initSchema } from './schema.js';
import { PgExampleStore } from './adapters/pg-example-store.js';
import { PgCourseStore } from './adapters/pg-course-store.js';
import { PgLearningRecordStore } from './adapters/pg-learning-record-store.js';
import { installFixture, DEMO_LEARNER } from './fixture.js';
import { createH5PRouter } from './h5p-routes.js';
import { createApiRouter } from './api-routes.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

// Safe dev-only defaults (FR-007); override via environment.
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://lyceum:lyceum@localhost:5432/lyceum';
// 3020 = example host; 3021 is reserved for the future admin UI.
const PORT = Number(process.env.PORT ?? 3020);
const H5P_DATA_DIR = path.resolve(repoRoot, process.env.H5P_DATA_DIR ?? './h5p-data');
const FIXTURE = path.resolve(here, '..', 'fixtures', 'lyceum-demo.h5p');
// Ids are engine-minted (spec 003 R2), so the demo course is found by its slug.
const DEMO_COURSE_SLUG = 'lyceum-demo';

function fail(message: string): never {
  console.error(`\n[lyceum-example] ${message}\n`);
  process.exit(1);
}

// --- Fail-fast prerequisite checks (FR-006 / FR-011) -------------------------
if (!fs.existsSync(path.join(H5P_DATA_DIR, 'core', 'js'))) {
  fail(`H5P core assets missing in ${H5P_DATA_DIR}/core — run: pnpm h5p:fetch-core`);
}
if (!fs.existsSync(FIXTURE)) {
  fail(`fixture missing at ${FIXTURE} — regenerate with: node example/scripts/build-fixture.mjs`);
}

const pool = new Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 3_000 });
try {
  await pool.query('SELECT 1');
} catch {
  fail(`cannot reach the database at ${DATABASE_URL} — is it running? Try: docker compose up -d`);
}

// --- Seed on startup + engine composition (public surface only, SC-004) ------
await initSchema(pool);

const engine = createEngine({
  adapters: {
    exampleStore: new PgExampleStore(pool),
    courseStore: new PgCourseStore(pool),
    learningRecordStore: new PgLearningRecordStore(pool),
  },
  h5pStorages: createFsH5PStorages(H5P_DATA_DIR),
});
// Minimal player host: no periodic user-state saving endpoints in this example.
engine.h5p.config.setFinishedEnabled = false;
engine.h5p.config.contentUserStateSaveInterval = false;

// --- Idempotent install: fixture content + demo course (dev DB persists) -----
// The demo course is authored through the 003 operation surface; its engine-minted
// id is recovered via the catalog by slug on every boot.
const demoSummary = (await engine.listCatalog()).find((entry) => entry.slug === DEMO_COURSE_SLUG);
let demoCourse = demoSummary ? await engine.getCourse(demoSummary.id) : undefined;
let contentId = demoCourse?.units[0]?.lessons[0]?.contents[0]?.h5pContentId;
if (contentId) {
  // The course row may outlive the H5P fs storage — verify the content still exists.
  try {
    await engine.h5p.editor.getContent(contentId, DEMO_LEARNER);
  } catch {
    contentId = undefined;
  }
}
if (!contentId) {
  ({ contentId } = await installFixture(engine, FIXTURE, DEMO_LEARNER));
  if (demoCourse) {
    // Stale course whose content vanished from the H5P storage — rebuild it clean.
    await engine.deleteCourse(demoCourse.id);
  }
  demoCourse = await engine.createCourse({
    title: 'Lyceum Demo Course',
    slug: DEMO_COURSE_SLUG,
    description: 'Plays the committed H5P fixture through the runtime handlers.',
  });
  const unit = await engine.addUnit(demoCourse.id, { title: 'Demo Unit' });
  const lesson = await engine.addLesson(demoCourse.id, unit.id, { title: 'Play the quiz' });
  await engine.attachContent(demoCourse.id, unit.id, lesson.id, {
    title: 'Lyceum Demo Quiz',
    h5pContentId: contentId,
  });
  console.log(`[lyceum-example] installed fixture (content ${contentId}) + demo course`);
}
if (!demoCourse) {
  fail('demo course missing after install — the course store is misbehaving');
}

// --- HTTP mounting seam (ADR 0001) -------------------------------------------
const app = express();
app.use('/h5p', createH5PRouter(engine, DEMO_LEARNER, H5P_DATA_DIR));
app.use(
  '/api',
  createApiRouter(engine, {
    fixtureContentId: contentId,
    demoCourseId: demoCourse.id,
    actor: DEMO_LEARNER.id,
  }),
);
app.use(express.static(path.resolve(here, '..', 'public')));

const server = app.listen(PORT, () => {
  console.log(`\n[lyceum-example] dev host running → http://localhost:${PORT}\n`);
});
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    fail(`port ${PORT} is already in use — set PORT to a free one`);
  }
  throw error;
});
