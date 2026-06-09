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

/**
 * The example smoke harness (spec 002): hermetic, ephemeral, seeded on startup,
 * verifies persistence via direct API calls + SQL spot-checks, tears down clean.
 * The example consumes Lyceum ONLY through its public surface (SC-004).
 */
describe('example smoke — engine end-to-end against a real database', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let h5pBase: string;
  let engine: LyceumEngine;

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

  it('US1: creates the full course hierarchy through Lyceum and verifies persistence', async () => {
    const course: Course = {
      id: 'course-smoke',
      title: 'Smoke Course',
      units: [
        {
          id: 'unit-1',
          title: 'Unit One',
          lessons: [
            {
              id: 'lesson-1',
              title: 'Lesson One',
              contents: [{ id: 'content-1', title: 'Demo quiz' }],
            },
          ],
        },
      ],
    };

    // Through the public surface — createCourse returns the read-back aggregate.
    const persisted = await engine.createCourse(course);
    expect(persisted).toEqual(course);
    expect(await engine.getCourse('course-smoke')).toEqual(course);

    // Independent confirmation straight from the database (FR-005).
    const direct = await pool.query<{ title: string }>(
      `SELECT doc->>'title' AS title FROM courses WHERE id = $1`,
      ['course-smoke'],
    );
    expect(direct.rows[0]?.title).toBe('Smoke Course');
  });

  it('US2: captures a simulated learner interaction as a learning record and verifies it', async () => {
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

    // The course hierarchy references the stored interactive content (FR-008).
    const course = await engine.createCourse({
      id: 'course-h5p',
      title: 'Course with interactive content',
      units: [
        {
          id: 'unit-h5p',
          title: 'Interactive unit',
          lessons: [
            {
              id: 'lesson-h5p',
              title: 'Play the quiz',
              contents: [{ id: 'content-h5p', title: 'Lyceum Demo Quiz', h5pContentId: contentId }],
            },
          ],
        },
      ],
    });
    expect(course.units[0]?.lessons[0]?.contents[0]?.h5pContentId).toBe(contentId);
  });
});
