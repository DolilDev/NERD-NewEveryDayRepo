const express = require('express');
const { name, version, description } = require('../../package.json');

const router = express.Router();

// GET / - API index / discovery, so the base URL is useful instead of a 404.
router.get('/', (req, res) => {
  res.json({
    name,
    version,
    description,
    status: 'ok',
    endpoints: {
      health: 'GET /health',
      listEvents: 'GET /events',
      getEvent: 'GET /events/:id',
      createEvent: 'POST /events',
      updateEvent: 'PUT /events/:id',
      deleteEvent: 'DELETE /events/:id',
    },
    documentation: 'See README.md',
  });
});

module.exports = router;
