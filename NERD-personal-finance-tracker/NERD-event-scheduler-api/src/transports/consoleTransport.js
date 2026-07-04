/**
 * Default notification transport: logs the reminder to the console.
 * Implements the transport contract: `name` + async `send(event)`.
 */
module.exports = {
  name: 'console',
  async send(event) {
    const suffix = event.description ? ` - ${event.description}` : '';
    // eslint-disable-next-line no-console
    console.log(
      `[notification] Reminder: "${event.title}" starts at ${event.date}${suffix}`
    );
    return { transport: 'console' };
  },
};
