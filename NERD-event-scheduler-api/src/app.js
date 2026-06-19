const express = require('express');
const healthRoutes = require('./routes/healthRoutes');

/**
 * Build and configure the Express application.
 * Exported as a factory so tests can spin up an app without binding a port.
 */
function createApp() {
  const app = express();

  app.use(express.json());

  app.use('/health', healthRoutes);

  return app;
}

module.exports = createApp;
