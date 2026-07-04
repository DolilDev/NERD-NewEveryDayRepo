const { randomUUID } = require('crypto');

/**
 * In-memory event store.
 *
 * Event model:
 *   - id:               string (UUID, generated)
 *   - title:            string
 *   - description:      string
 *   - date:             string (ISO 8601, when the event starts)
 *   - notificationTime: number (minutes before `date` to fire the notification)
 *   - email:            string | null (optional recipient for email notifications)
 *   - createdAt:        string (ISO 8601)
 *   - updatedAt:        string (ISO 8601, present after the first update)
 *
 * Data lives in a plain array, so it does NOT survive a process restart.
 */
const events = [];

function buildEvent(data, base = {}) {
  return {
    ...base,
    title: data.title,
    description: data.description || '',
    date: data.date,
    notificationTime: data.notificationTime,
    email: data.email || null,
  };
}

function create(data) {
  const now = new Date().toISOString();
  const event = buildEvent(data, { id: randomUUID(), createdAt: now });
  events.push(event);
  return event;
}

function findAll() {
  // Return a shallow copy so callers can't mutate the internal array.
  return events.map((event) => ({ ...event }));
}

function findById(id) {
  const event = events.find((e) => e.id === id);
  return event ? { ...event } : null;
}

function update(id, data) {
  const index = events.findIndex((e) => e.id === id);
  if (index === -1) {
    return null;
  }
  const existing = events[index];
  const updated = buildEvent(data, {
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  });
  events[index] = updated;
  return { ...updated };
}

function remove(id) {
  const index = events.findIndex((e) => e.id === id);
  if (index === -1) {
    return false;
  }
  events.splice(index, 1);
  return true;
}

/** Reset the store. Intended for tests. */
function clear() {
  events.length = 0;
}

module.exports = { create, findAll, findById, update, remove, clear };
