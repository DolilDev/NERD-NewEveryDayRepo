const eventService = require('../services/eventService');
const { validateEventInput } = require('../validation/eventValidation');

// POST /events - create a new event
function create(req, res) {
  const errors = validateEventInput(req.body);
  if (errors.length > 0) {
    return res
      .status(400)
      .json({ error: { message: 'Validation failed', details: errors } });
  }
  const event = eventService.createEvent(req.body);
  return res.status(201).json(event);
}

// GET /events - list all events
function list(req, res) {
  return res.json(eventService.getAllEvents());
}

// GET /events/:id - fetch a single event
function getOne(req, res) {
  const event = eventService.getEventById(req.params.id);
  if (!event) {
    return res.status(404).json({
      error: { message: `Event with id '${req.params.id}' not found` },
    });
  }
  return res.json(event);
}

// PUT /events/:id - replace an existing event
function update(req, res) {
  const errors = validateEventInput(req.body);
  if (errors.length > 0) {
    return res
      .status(400)
      .json({ error: { message: 'Validation failed', details: errors } });
  }
  const event = eventService.updateEvent(req.params.id, req.body);
  if (!event) {
    return res.status(404).json({
      error: { message: `Event with id '${req.params.id}' not found` },
    });
  }
  return res.json(event);
}

module.exports = { create, list, getOne, update };
