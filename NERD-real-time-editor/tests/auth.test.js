const { authenticateUsername } = require('../src/auth');

describe('authenticateUsername', () => {
  test('returns username and sessionId for valid name', () => {
    const result = authenticateUsername('Alice');
    expect(result.username).toBe('Alice');
    expect(result.sessionId).toMatch(/session-/);
  });

  test('throws for empty username', () => {
    expect(() => authenticateUsername('')).toThrow('Username is required');
  });

  test('throws for short username', () => {
    expect(() => authenticateUsername('A')).toThrow('Username must be at least 2 characters long');
  });
});
