import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { readDb, writeDb } from './db';
import { User } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_TTL = '12h';

export class AuthError extends Error {}

export function registerUser(username: string, password: string): { user: User; token: string } {
  if (!username || username.trim().length < 3) {
    throw new AuthError('Username must be at least 3 characters long.');
  }
  if (!password || password.length < 6) {
    throw new AuthError('Password must be at least 6 characters long.');
  }

  const db = readDb();
  const exists = db.users.some((u) => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    throw new AuthError('Username is already taken.');
  }

  const user: User = {
    id: randomUUID(),
    username,
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: Date.now(),
  };

  db.users.push(user);
  writeDb(db);

  const token = signToken(user);
  return { user, token };
}

export function loginUser(username: string, password: string): { user: User; token: string } {
  const db = readDb();
  const user = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    throw new AuthError('Invalid username or password.');
  }
  const token = signToken(user);
  return { user, token };
}

export function signToken(user: User): string {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export interface TokenPayload {
  sub: string;
  username: string;
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    throw new AuthError('Invalid or expired token.');
  }
}
