import path from 'node:path';
import express, { type Router } from 'express';
import type { LyceumEngine } from '@lyceumjs/lms/runtime';
import type { H5PUser } from './fixture.js';

/**
 * The HTTP-mounting seam (ADR 0001): the host mounts Lyceum's framework-agnostic
 * H5P handlers behind its own routing. Mounted under `/h5p` so the paths line up
 * with the H5PConfig defaults the player model references.
 */
export function createH5PRouter(engine: LyceumEngine, user: H5PUser, h5pDataDir: string): Router {
  const router = express.Router();

  // The host chooses the render shape: the FE component consumes the raw model.
  engine.h5p.player.setRenderer((model: unknown) => model);

  router.get('/play/:contentId', async (req, res) => {
    try {
      res.json(await engine.h5p.player.render(req.params.contentId, user));
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'content not found' });
    }
  });

  router.get('/ajax', async (req, res) => {
    try {
      res.json(
        await engine.h5p.ajaxEndpoint.getAjax(
          String(req.query.action ?? ''),
          req.query.machineName as string | undefined,
          req.query.majorVersion as string | undefined,
          req.query.minorVersion as string | undefined,
          req.query.language as string | undefined,
          user,
        ),
      );
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'bad request' });
    }
  });

  router.post('/ajax', express.json(), async (req, res) => {
    try {
      res.json(
        await engine.h5p.ajaxEndpoint.postAjax(
          String(req.query.action ?? ''),
          req.body,
          String(req.query.language ?? 'en'),
          user,
        ),
      );
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'bad request' });
    }
  });

  // The player probes for saved user state on load; this minimal host keeps none.
  router.get('/contentUserData/:contentId/:dataType/:subContentId', (_req, res) => {
    res.json({ success: true, data: false });
  });

  // Static assets the player model points at (H5PConfig default URL roots).
  router.use('/core', express.static(path.join(h5pDataDir, 'core')));
  router.use('/editor', express.static(path.join(h5pDataDir, 'editor')));
  router.use('/libraries', express.static(path.join(h5pDataDir, 'libraries')));
  router.use('/content', express.static(path.join(h5pDataDir, 'content')));

  return router;
}
