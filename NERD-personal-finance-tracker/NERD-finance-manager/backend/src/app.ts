// Express application factory.
//
// `createApp()` builds and configures the app WITHOUT starting a listener, so it
// can be driven directly by supertest in route tests. The process entry point
// (server.ts) is what actually binds a port.

import path from 'node:path';
import express, { type Express } from 'express';
import cors from 'cors';
import { recordsRouter } from './routes/records.ts';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.ts';

/** Directory holding the built frontend (index.html + bundle). */
const FRONTEND_DIR = path.resolve(process.cwd(), 'frontend', 'public');

export function createApp(): Express {
  const app = express();

  // Allow the local frontend dev server (a different origin/port) to call us.
  app.use(cors());

  // Parse JSON request bodies into req.body.
  app.use(express.json());

  // Health/liveness probe.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Records REST API.
  app.use('/api/records', recordsRouter);

  // Serve the built frontend so `npm start` serves the whole app on one origin.
  // (Populated by `npm run build:frontend`; harmless if not built yet.)
  app.use(express.static(FRONTEND_DIR));

  // 404 for anything that matched no route or static file...
  app.use(notFoundHandler);
  // ...and the centralized error handler must come last.
  app.use(errorHandler);

  return app;
}
