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

module.exports = { create };
