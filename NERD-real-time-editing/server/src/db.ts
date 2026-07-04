import fs from 'fs';
import path from 'path';
import { DbShape } from './types';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'db.json');

function ensureDbFile(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const empty: DbShape = { users: [], documents: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
  }
}

export function readDb(): DbShape {
  ensureDbFile();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw) as DbShape;
}

export function writeDb(db: DbShape): void {
  ensureDbFile();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
