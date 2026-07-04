// Simple, dependency-free validation for event payloads.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_RE.test(value);
}

/**
 * Validate the body of a create/update request.
 *
 * Required:  title (non-empty string), date (ISO 8601 string),
 *            notificationTime (number >= 0, minutes before the event)
 * Optional:  description (string), email (valid email string)
 *
 * @returns {string[]} list of human-readable error messages (empty when valid)
 */
function validateEventInput(data) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return ['Request body must be a JSON object'];
  }

  const errors = [];
  const { title, date, notificationTime, description, email } = data;

  if (typeof title !== 'string' || title.trim() === '') {
    errors.push('title is required and must be a non-empty string');
  }

  if (typeof date !== 'string' || Number.isNaN(Date.parse(date))) {
    errors.push('date is required and must be a valid ISO 8601 date string');
  }

  if (
    typeof notificationTime !== 'number' ||
    !Number.isFinite(notificationTime) ||
    notificationTime < 0
  ) {
    errors.push(
      'notificationTime is required and must be a number >= 0 (minutes before the event)'
    );
  }

  if (description !== undefined && typeof description !== 'string') {
    errors.push('description must be a string');
  }

  if (email !== undefined && email !== null && !isValidEmail(email)) {
    errors.push('email must be a valid email address');
  }

  return errors;
}

module.exports = { validateEventInput, isValidEmail };
