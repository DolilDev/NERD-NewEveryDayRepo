function authenticateUsername(rawUsername) {
  const username = String(rawUsername || '').trim();
  if (!username) {
    throw new Error('Username is required');
  }

  if (username.length < 2) {
    throw new Error('Username must be at least 2 characters long');
  }

  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { username, sessionId };
}

module.exports = { authenticateUsername };
