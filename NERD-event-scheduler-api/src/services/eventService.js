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
  const event = store.update(id, data);
  if (event) {
    // Replace any pending notification with one for the updated event.
    notifications.reschedule(event);
  }
  return event;
}

function deleteEvent(id) {
  const deleted = store.remove(id);
  if (deleted) {
    notifications.cancel(id);
  }
  return deleted;
}

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
};
