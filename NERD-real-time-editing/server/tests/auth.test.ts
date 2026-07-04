import fs from 'fs';
import os from 'os';
import path from 'path';

let auth: typeof import('../src/auth');

beforeEach(() => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-editor-auth-test-'));
  process.env.DB_PATH = path.join(tmpDir, 'db.json');
  process.env.JWT_SECRET = 'test-secret';
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  auth = require('../src/auth');
});

describe('registerUser', () => {
  it('creates a user and returns a valid token', () => {
    const { user, token } = auth.registerUser('alice', 'password123');
    expect(user.username).toBe('alice');
    expect(typeof token).toBe('string');
    const payload = auth.verifyToken(token);
    expect(payload.username).toBe('alice');
  });

  it('rejects a duplicate username', () => {
    auth.registerUser('alice', 'password123');
    expect(() => auth.registerUser('alice', 'anotherPass1')).toThrow(auth.AuthError);
  });

  it('rejects a short password', () => {
    expect(() => auth.registerUser('bob', '123')).toThrow(auth.AuthError);
  });

  it('rejects a short username', () => {
    expect(() => auth.registerUser('ab', 'password123')).toThrow(auth.AuthError);
  });
});

describe('loginUser', () => {
  it('logs in with correct credentials', () => {
    auth.registerUser('alice', 'password123');
    const { user, token } = auth.loginUser('alice', 'password123');
    expect(user.username).toBe('alice');
    expect(typeof token).toBe('string');
  });

  it('rejects an incorrect password', () => {
    auth.registerUser('alice', 'password123');
    expect(() => auth.loginUser('alice', 'wrongpassword')).toThrow(auth.AuthError);
  });

  it('rejects a nonexistent user', () => {
    expect(() => auth.loginUser('ghost', 'password123')).toThrow(auth.AuthError);
  });
});

describe('verifyToken', () => {
  it('rejects a malformed token', () => {
    expect(() => auth.verifyToken('not-a-real-token')).toThrow(auth.AuthError);
  });
});
