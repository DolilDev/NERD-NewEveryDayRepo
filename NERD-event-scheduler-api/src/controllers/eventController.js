const eventService = require('../services/eventService');
const { validateEventInput } = require('../validation/eventValidation');
const ApiError = require('../errors/ApiError');

// POST /events - create a new event
function create(req, res) {
  const errors = validateEventInput(req.body);
  if (errors.length > 0) {
    throw new ApiError(400, 'Validation failed', errors);
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
    throw new ApiError(404, `Event with id '${req.params.id}' not found`);
  }
  return res.json(event);
}

// PUT /events/:id - replace an existing event
function update(req, res) {
  const errors = validateEventInput(req.body);
  if (errors.length > 0) {
    throw new ApiError(400, 'Validation failed', errors);
  }
  const event = eventService.updateEvent(req.params.id, req.body);
  if (!event) {
    throw new ApiError(404, `Event with id '${req.params.id}' not found`);
  }
  return res.json(event);
}

// DELETE /events/:id - remove an event
function remove(req, res) {
  const deleted = eventService.deleteEvent(req.params.id);
  if (!deleted) {
    throw new ApiError(404, `Event with id '${req.params.id}' not found`);
  }
  return res.status(204).send();
}

module.exports = { create, list, getOne, update, remove };
