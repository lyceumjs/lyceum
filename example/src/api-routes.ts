import express, { type Response, type Router } from 'express';
import { LyceumDomainError } from '@lyceumjs/lms';
import type { LyceumEngine } from '@lyceumjs/lms/runtime';

export interface ExampleHostState {
  fixtureContentId: string;
  demoCourseId: string;
  actor: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'invalid request';
}

/** The host-side translation of Lyceum's typed domain errors
 * (contracts/engine-operations.md): VALIDATION → 400, NOT_FOUND → 404, CONFLICT → 409. */
function statusOf(error: unknown): number {
  if (error instanceof LyceumDomainError) {
    if (error.code === 'NOT_FOUND') return 404;
    if (error.code === 'CONFLICT') return 409;
  }
  return 400;
}

/** Run an engine operation; respond `status` with its JSON result (or empty for void). */
async function respond(res: Response, status: number, work: () => Promise<unknown>): Promise<void> {
  try {
    const result = await work();
    if (result === undefined) res.status(status).end();
    else res.status(status).json(result);
  } catch (error) {
    res.status(statusOf(error)).json({ error: errorMessage(error) });
  }
}

/**
 * The example host's own API: thin JSON glue over the engine's use cases — exactly
 * what a real host writes (courses through Lyceum, xAPI statements into the
 * learning-records sink, ADR 0001). Spec 003 grows it with the authoring
 * operations and the catalog (an example-only living reference, NOT a published API).
 */
export function createApiRouter(engine: LyceumEngine, state: ExampleHostState): Router {
  const router = express.Router();
  router.use(express.json());

  /** What the FE page should play, and as whom. */
  router.get('/content', (_req, res) => {
    res.json({
      contentId: state.fixtureContentId,
      courseId: state.demoCourseId,
      actor: state.actor,
    });
  });

  // --- Course lifecycle + catalog (spec 003) ----------------------------------
  router.get('/catalog', (_req, res) => respond(res, 200, () => engine.listCatalog()));
  router.post('/courses', (req, res) => respond(res, 201, () => engine.createCourse(req.body)));
  router.patch('/courses/:id/info', (req, res) =>
    respond(res, 200, () => engine.updateCourseInfo(req.params.id, req.body)),
  );
  router.delete('/courses/:id', (req, res) =>
    respond(res, 204, () => engine.deleteCourse(req.params.id)),
  );

  router.get('/courses/:id', async (req, res) => {
    const course = await engine.getCourse(req.params.id);
    if (!course) {
      res.status(404).json({ error: `course '${req.params.id}' not found` });
      return;
    }
    res.json(course);
  });

  // --- Structure operations (spec 003) ----------------------------------------
  router.post('/courses/:id/units', (req, res) =>
    respond(res, 201, () => engine.addUnit(req.params.id, req.body)),
  );
  router.put('/courses/:id/units/order', (req, res) =>
    respond(res, 204, () => engine.reorderUnits(req.params.id, req.body.orderedUnitIds)),
  );
  router.patch('/courses/:id/units/:unitId', (req, res) =>
    respond(res, 204, () => engine.renameUnit(req.params.id, req.params.unitId, req.body.title)),
  );
  router.delete('/courses/:id/units/:unitId', (req, res) =>
    respond(res, 204, () => engine.removeUnit(req.params.id, req.params.unitId)),
  );

  router.post('/courses/:id/units/:unitId/lessons', (req, res) =>
    respond(res, 201, () => engine.addLesson(req.params.id, req.params.unitId, req.body)),
  );
  router.put('/courses/:id/units/:unitId/lessons/order', (req, res) =>
    respond(res, 204, () =>
      engine.reorderLessons(req.params.id, req.params.unitId, req.body.orderedLessonIds),
    ),
  );
  router.patch('/courses/:id/units/:unitId/lessons/:lessonId', (req, res) =>
    respond(res, 204, () =>
      engine.renameLesson(req.params.id, req.params.unitId, req.params.lessonId, req.body.title),
    ),
  );
  router.delete('/courses/:id/units/:unitId/lessons/:lessonId', (req, res) =>
    respond(res, 204, () =>
      engine.removeLesson(req.params.id, req.params.unitId, req.params.lessonId),
    ),
  );

  router.post('/courses/:id/units/:unitId/lessons/:lessonId/contents', (req, res) =>
    respond(res, 201, () =>
      engine.attachContent(req.params.id, req.params.unitId, req.params.lessonId, req.body),
    ),
  );
  router.delete('/courses/:id/units/:unitId/lessons/:lessonId/contents/:contentId', (req, res) =>
    respond(res, 204, () =>
      engine.removeContent(
        req.params.id,
        req.params.unitId,
        req.params.lessonId,
        req.params.contentId,
      ),
    ),
  );

  /** Learning-records sink: the page forwards H5P xAPI statements here. */
  router.post('/xapi', (req, res) => respond(res, 201, () => engine.recordStatement(req.body)));

  router.get('/records', async (req, res) => {
    res.json(await engine.listActorRecords(String(req.query.actor ?? state.actor)));
  });

  return router;
}
