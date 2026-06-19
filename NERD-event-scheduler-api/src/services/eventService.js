const store = require('../store/eventStore');

/**
 * Event service: business logic layer between controllers and the store.
 */

function createEvent(data) {
  return store.create(data);
}

function getAllEvents() {
  return store.findAll();
}

function getEventById(id) {
  return store.findById(id);
}

function updateEvent(id, data) {
  return store.update(id, data);
}

function deleteEvent(id) {
  return store.remove(id);
}

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
};
