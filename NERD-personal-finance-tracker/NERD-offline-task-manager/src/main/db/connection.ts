import Database from 'better-sqlite3';

export type AppDatabase = Database.Database;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS tasks (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'todo',
    createdAt   TEXT NOT NULL,
    updatedAt   TEXT NOT NULL,
    syncedAt    TEXT
  );
`;

/**
 * Opens (or creates) the SQLite database at `filePath` and applies the schema
 * migration. Pass an absolute path for the real app (e.g. under userData) or
 * ':memory:' for tests. This module never imports Electron, so it stays
 * testable under plain Node.
 */
export function openDatabase(filePath: string): AppDatabase {
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  return db;
}
