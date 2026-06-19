const store = require('../store/eventStore');

/**
 * Event service: business logic layer between controllers and the store.
 */

function createEvent(data) {
  return store.create(data);
}

module.exports = { createEvent };
