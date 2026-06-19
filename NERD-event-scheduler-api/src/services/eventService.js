const store = require('../store/eventStore');
const { createNotificationService } = require('./notificationService');

/**
 * Event service: business logic layer between controllers and the store.
 */

// Single scheduler instance shared across the app (console transport by default).
const notifications = createNotificationService();

function createEvent(data) {
  const event = store.create(data);
  notifications.schedule(event);
  return event;
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
