import { randomUUID } from 'crypto';
import { readDb, writeDb } from './db';
import { DocumentRecord, TextChange } from './types';

export class DocumentError extends Error {}

const MAX_HISTORY_ENTRIES = 100;

/** Applies an ordered list of position-based changes to a string. */
export function applyChanges(content: string, changes: TextChange[]): string {
  let result = content;
  for (const change of changes) {
    if (change.from < 0 || change.to > result.length || change.from > change.to) {
      throw new DocumentError(`Invalid change range [${change.from}, ${change.to}] for document of length ${result.length}.`);
    }
    result = result.slice(0, change.from) + change.insert + result.slice(change.to);
  }
  return result;
}

export function createDocument(ownerId: string, title: string): DocumentRecord {
  const db = readDb();
  const doc: DocumentRecord = {
    id: randomUUID(),
    ownerId,
    title: title || 'Untitled document',
    content: '',
    version: 0,
    history: [{ version: 0, content: '', timestamp: Date.now(), author: ownerId }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  db.documents.push(doc);
  writeDb(db);
  return doc;
}

export function listDocumentsForUser(userId: string): DocumentRecord[] {
  const db = readDb();
  return db.documents.filter((d) => d.ownerId === userId);
}

export function getDocument(docId: string): DocumentRecord {
  const db = readDb();
  const doc = db.documents.find((d) => d.id === docId);
  if (!doc) throw new DocumentError(`Document ${docId} was not found.`);
  return doc;
}

export function applyDocumentEdit(
  docId: string,
  baseVersion: number,
  changes: TextChange[],
  author: string
): DocumentRecord {
  const db = readDb();
  const doc = db.documents.find((d) => d.id === docId);
  if (!doc) throw new DocumentError(`Document ${docId} was not found.`);

  // The server is authoritative: it always applies incoming edits to the
  // current content and bumps the version. `baseVersion` is currently used
  // for diagnostics/telemetry and could be extended into full OT/CRDT
  // reconciliation later.
  void baseVersion;

  doc.content = applyChanges(doc.content, changes);
  doc.version += 1;
  doc.updatedAt = Date.now();
  doc.history.push({ version: doc.version, content: doc.content, timestamp: doc.updatedAt, author });
  if (doc.history.length > MAX_HISTORY_ENTRIES) {
    doc.history = doc.history.slice(doc.history.length - MAX_HISTORY_ENTRIES);
  }

  writeDb(db);
  return doc;
}

export function revertDocument(docId: string, toVersion: number, author: string): DocumentRecord {
  const db = readDb();
  const doc = db.documents.find((d) => d.id === docId);
  if (!doc) throw new DocumentError(`Document ${docId} was not found.`);

  const snapshot = doc.history.find((h) => h.version === toVersion);
  if (!snapshot) throw new DocumentError(`Version ${toVersion} does not exist for document ${docId}.`);

  doc.content = snapshot.content;
  doc.version += 1;
  doc.updatedAt = Date.now();
  doc.history.push({
    version: doc.version,
    content: doc.content,
    timestamp: doc.updatedAt,
    author: `${author} (reverted to v${toVersion})`,
  });

  writeDb(db);
  return doc;
}
