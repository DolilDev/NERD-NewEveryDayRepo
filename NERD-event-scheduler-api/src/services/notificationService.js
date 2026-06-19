const consoleTransport = require('../transports/consoleTransport');

// setTimeout stores the delay in a signed 32-bit integer. Anything larger than
// ~24.8 days overflows and fires almost immediately, so we clamp to the max.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * Create a notification scheduler.
 *
 * Transports are injectable so they can be swapped (console <-> email) and
 * mocked in tests. When an event carries an `email` and an `emailTransport`
 * is configured, the email transport is used; otherwise the default transport.
 *
 * @param {object}   [options]
 * @param {object}   [options.transport]      default transport (has async send(event))
 * @param {object}   [options.emailTransport] optional transport used when event.email is set
 */
function createNotificationService({
  transport = consoleTransport,
  emailTransport = null,
} = {}) {
  const timers = new Map();

  function pickTransport(event) {
    if (event.email && emailTransport) {
      return emailTransport;
    }
    return transport;
  }

  function cancel(id) {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
  }

  function fire(event) {
    timers.delete(event.id);
    Promise.resolve()
      .then(() => pickTransport(event).send(event))
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(
          `[notification] Failed to notify for "${event.title}":`,
          err.message
        );
      });
  }

  function schedule(event) {
    cancel(event.id);

    const fireAt =
      new Date(event.date).getTime() - event.notificationTime * 60 * 1000;
    const delay = fireAt - Date.now();

    // Notification moment already passed (or invalid date): nothing to schedule.
    if (Number.isNaN(delay) || delay <= 0) {
      return null;
    }

    const timer = setTimeout(() => fire(event), Math.min(delay, MAX_TIMEOUT_MS));
    // Don't keep the process alive solely for a pending notification.
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
    timers.set(event.id, timer);
    return timer;
  }

  function reschedule(event) {
    return schedule(event);
  }

  function pendingCount() {
    return timers.size;
  }

  return { schedule, cancel, reschedule, pendingCount };
}

module.exports = { createNotificationService };
