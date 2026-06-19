const express = require('express');
const healthRoutes = require('./routes/healthRoutes');
const eventRoutes = require('./routes/eventRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

/**
 * Build and configure the Express application.
 * Exported as a factory so tests can spin up an app without binding a port.
 */
function createApp() {
  const app = express();

  app.use(express.json());

  app.use('/health', healthRoutes);
  app.use('/events', eventRoutes);

  // 404 for unmatched routes, then the centralized error handler (must be last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
