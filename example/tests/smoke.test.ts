import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import type { Course } from '@lyceumjs/lms';
import { createEngine, createFsH5PStorages, type LyceumEngine } from '@lyceumjs/lms/runtime';
import { initSchema } from '../src/schema.js';
import { PgExampleStore } from '../src/adapters/pg-example-store.js';
import { PgCourseStore } from '../src/adapters/pg-course-store.js';
import { PgLearningRecordStore } from '../src/adapters/pg-learning-record-store.js';
import { installFixture, DEMO_LEARNER } from '../src/fixture.js';

const FIXTURE = path.resolve(import.meta.dirname, '../fixtures/lyceum-demo.h5p');

/** Creation timestamps carry millisecond precision; keep neighbours distinct so the
 * newest-first assertion never depends on a tie. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

/**
 * The example smoke harness (spec 002, extended by spec 003 FR-008): hermetic,
 * ephemeral, seeded on startup, authors a course through the discrete operation
 * surface, lists the catalog, deletes, and verifies persistence via direct API
 * calls + SQL spot-checks. The example consumes Lyceum ONLY through its public
 * surface (SC-004).
 */
describe('example smoke — engine end-to-end against a real database', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let h5pBase: string;
  let engine: LyceumEngine;
  let authored: Course;

  beforeAll(async () => {
    // FR-003: ephemeral DB in a container, no volume; schema created on startup = the seed.
    container = await new PostgreSqlContainer('postgres:17-alpine').start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    await initSchema(pool);

    h5pBase = fs.mkdtempSync(path.join(os.tmpdir(), 'lyceum-example-'));
    engine = createEngine({
      adapters: {
        exampleStore: new PgExampleStore(pool),
        courseStore: new PgCourseStore(pool),
        learningRecordStore: new PgLearningRecordStore(pool),
      },
      h5pStorages: createFsH5PStorages(h5pBase),
    });
  });

  afterAll(async () => {
    await pool?.end();
    await container?.stop(); // SC-003: nothing left running, no leftover data
    if (h5pBase) fs.rmSync(h5pBase, { recursive: true, force: true });
  });

  it('US1 (003): authors a course through the operation surface and verifies persistence', async () => {
    const created = await engine.createCourse({
      title: 'Smoke Course',
      slug: 'smoke-course',
      description: 'Authored by the smoke run',
      coverImage: 'https://example.com/cover.png',
    });
    expect(created.units).toEqual([]);

    const unitOne = await engine.addUnit(created.id, { title: 'Unit One' });
    const lesson = await engine.addLesson(created.id, unitOne.id, { title: 'Lesson One' });
    await engine.attachContent(created.id, unitOne.id, lesson.id, { title: 'Demo quiz' });
    const unitTwo = await engine.addUnit(created.id, { title: 'Unit Two' });
    await engine.reorderUnits(created.id, [unitTwo.id, unitOne.id]);
    await engine.renameUnit(created.id, unitTwo.id, 'Unit Zero');
    // Whole-info update: coverImage is absent, so it clears (spec FR-001).
    await engine.updateCourseInfo(created.id, {
      title: 'Smoke Course v2',
      slug: 'smoke-course',
      description: 'Updated info',
    });

    const readBack = await engine.getCourse(created.id);
    expect(readBack?.title).toBe('Smoke Course v2');
    expect(readBack?.coverImage).toBeUndefined();
    expect(readBack?.createdAt).toBe(created.createdAt);
    expect(readBack?.units.map((unit) => unit.title)).toEqual(['Unit Zero', 'Unit One']);
    expect(readBack?.units[1]?.lessons[0]?.contents[0]?.title).toBe('Demo quiz');

    // Independent confirmation straight from the database (FR-005) — doc + mirrored columns.
    const direct = await pool.query<{ title: string; slug: string }>(
      `SELECT doc->>'title' AS title, slug FROM courses WHERE id = $1`,
      [created.id],
    );
    expect(direct.rows[0]).toEqual({ title: 'Smoke Course v2', slug: 'smoke-course' });

    authored = readBack as Course;
  });

  it('US2 (002): captures a simulated learner interaction as a learning record and verifies it', async () => {
    const statement = {
      id: 'stmt-smoke-1',
      actor: 'demo-learner',
      verb: 'answered',
      objectId: 'content-1',
      result: { success: true, score: { raw: 1, max: 1 } },
      timestamp: '2026-06-10T12:00:00.000Z',
    };

    expect(await engine.recordStatement(statement)).toEqual(statement);
    expect(await engine.listActorRecords('demo-learner')).toEqual([statement]);

    // Independent confirmation straight from the database (FR-005).
    const direct = await pool.query<{ verb: string }>(
      'SELECT verb FROM learning_records WHERE id = $1',
      ['stmt-smoke-1'],
    );
    expect(direct.rows[0]?.verb).toBe('answered');
  });

  it('FR-009: pushes the committed H5P fixture through the content-storage handler and reads it back', async () => {
    const { contentId, ubername } = await installFixture(engine, FIXTURE, DEMO_LEARNER);
    expect(ubername).toBe('H5P.MultiChoice 1.16');

    // Read back through the editor (content storage) — our own parameters round-trip.
    const stored = await engine.h5p.editor.getContent(contentId, DEMO_LEARNER);
    const storedParams = (
      typeof stored.params === 'string' ? JSON.parse(stored.params) : stored.params
    ) as { params: { question: string } };
    expect(storedParams.params.question).toContain('Lyceum');

    // Read back through the player — the stored content is renderable. The host
    // chooses the model renderer (the default renders a full HTML page).
    engine.h5p.player.setRenderer((model: unknown) => model);
    const model = (await engine.h5p.player.render(contentId, DEMO_LEARNER)) as {
      integration: { contents: Record<string, unknown> };
      scripts: string[];
    };
    expect(model.integration.contents).toHaveProperty(`cid-${contentId}`);
    expect(model.scripts.length).toBeGreaterThan(0);

    // The course hierarchy references the stored interactive content (FR-008) —
    // authored through the 003 operation surface.
    await tick();
    const course = await engine.createCourse({ title: 'Course with interactive content' });
    const unit = await engine.addUnit(course.id, { title: 'Interactive unit' });
    const lesson = await engine.addLesson(course.id, unit.id, { title: 'Play the quiz' });
    const ref = await engine.attachContent(course.id, unit.id, lesson.id, {
      title: 'Lyceum Demo Quiz',
      h5pContentId: contentId,
    });
    expect(ref.h5pContentId).toBe(contentId);
    expect(
      (await engine.getCourse(course.id))?.units[0]?.lessons[0]?.contents[0]?.h5pContentId,
    ).toBe(contentId);
  });

  it('US3 (003): the catalog lists newest-first with correct summaries; deletion removes', async () => {
    await tick();
    const newest = await engine.createCourse({ title: 'Newest Course', slug: 'newest-course' });

    const catalog = await engine.listCatalog();
    // Three courses so far: authored (oldest), the FR-009 course, then this one.
    expect(catalog).toHaveLength(3);
    expect(catalog[0]?.id).toBe(newest.id);
    expect(catalog[2]?.id).toBe(authored.id);
    expect(catalog[2]).toMatchObject({
      title: 'Smoke Course v2',
      slug: 'smoke-course',
      description: 'Updated info',
      unitCount: 2,
      lessonCount: 1,
    });

    await engine.deleteCourse(newest.id);
    expect(await engine.getCourse(newest.id)).toBeUndefined();
    expect((await engine.listCatalog()).map((entry) => entry.id)).not.toContain(newest.id);

    // Independent confirmation straight from the database (FR-005).
    const direct = await pool.query<{ count: string }>('SELECT count(*) FROM courses');
    expect(Number(direct.rows[0]?.count)).toBe(2);
  });
});
