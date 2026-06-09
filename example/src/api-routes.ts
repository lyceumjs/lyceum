import express, { type Router } from 'express';
import type { LyceumEngine } from '@lyceumjs/lms/runtime';

export interface ExampleHostState {
  fixtureContentId: string;
  demoCourseId: string;
  actor: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'invalid request';
}

/**
 * The example host's own API: thin JSON glue over the engine's use cases — exactly
 * what a real host writes (courses through Lyceum, xAPI statements into the
 * learning-records sink, ADR 0001).
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

  router.post('/courses', async (req, res) => {
    try {
      res.status(201).json(await engine.createCourse(req.body));
    } catch (error) {
      res.status(400).json({ error: errorMessage(error) });
    }
  });

  router.get('/courses/:id', async (req, res) => {
    const course = await engine.getCourse(req.params.id);
    if (!course) {
      res.status(404).json({ error: `course '${req.params.id}' not found` });
      return;
    }
    res.json(course);
  });

  /** Learning-records sink: the page forwards H5P xAPI statements here. */
  router.post('/xapi', async (req, res) => {
    try {
      res.status(201).json(await engine.recordStatement(req.body));
    } catch (error) {
      res.status(400).json({ error: errorMessage(error) });
    }
  });

  router.get('/records', async (req, res) => {
    res.json(await engine.listActorRecords(String(req.query.actor ?? state.actor)));
  });

  return router;
}
