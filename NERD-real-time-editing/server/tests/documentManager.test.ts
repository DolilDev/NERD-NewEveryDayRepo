import fs from 'fs';
import os from 'os';
import path from 'path';

let documentManager: typeof import('../src/documentManager');

beforeEach(() => {
  // Isolate each test with its own throwaway JSON database file.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-editor-test-'));
  process.env.DB_PATH = path.join(tmpDir, 'db.json');
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  documentManager = require('../src/documentManager');
});

describe('applyChanges', () => {
  it('inserts text at the correct position', () => {
    const result = documentManager.applyChanges('hello world', [{ from: 5, to: 5, insert: ',' }]);
    expect(result).toBe('hello, world');
  });

  it('replaces a range of text', () => {
    const result = documentManager.applyChanges('hello world', [{ from: 6, to: 11, insert: 'there' }]);
    expect(result).toBe('hello there');
  });

  it('applies multiple changes in order', () => {
    const result = documentManager.applyChanges('abc', [
      { from: 0, to: 0, insert: 'X' },
      { from: 4, to: 4, insert: 'Y' },
    ]);
    expect(result).toBe('XabcY');
  });

  it('throws a DocumentError on an out-of-range change', () => {
    expect(() => documentManager.applyChanges('abc', [{ from: 0, to: 10, insert: 'x' }])).toThrow(
      documentManager.DocumentError
    );
  });
});

describe('document lifecycle', () => {
  it('creates a document owned by a user', () => {
    const doc = documentManager.createDocument('user-1', 'My Doc');
    expect(doc.ownerId).toBe('user-1');
    expect(doc.title).toBe('My Doc');
    expect(doc.version).toBe(0);
    expect(doc.content).toBe('');
  });

  it('lists only documents belonging to the requesting user', () => {
    documentManager.createDocument('user-1', 'Doc A');
    documentManager.createDocument('user-2', 'Doc B');
    const docs = documentManager.listDocumentsForUser('user-1');
    expect(docs).toHaveLength(1);
    expect(docs[0].title).toBe('Doc A');
  });

  it('synchronizes edits and bumps the version number', () => {
    const doc = documentManager.createDocument('user-1', 'Doc');
    const updated = documentManager.applyDocumentEdit(doc.id, 0, [{ from: 0, to: 0, insert: 'Hello' }], 'alice');
    expect(updated.content).toBe('Hello');
    expect(updated.version).toBe(1);
    expect(updated.history).toHaveLength(2);
  });

  it('applies edits from multiple simulated clients cumulatively', () => {
    const doc = documentManager.createDocument('user-1', 'Doc');
    documentManager.applyDocumentEdit(doc.id, 0, [{ from: 0, to: 0, insert: 'Hello' }], 'alice');
    const after = documentManager.applyDocumentEdit(doc.id, 1, [{ from: 5, to: 5, insert: ' world' }], 'bob');
    expect(after.content).toBe('Hello world');
    expect(after.version).toBe(2);
  });

  it('throws when editing a document that does not exist', () => {
    expect(() => documentManager.applyDocumentEdit('missing-id', 0, [], 'alice')).toThrow(documentManager.DocumentError);
  });

  it('reverts a document to a previous version and records the revert in history', () => {
    const doc = documentManager.createDocument('user-1', 'Doc');
    documentManager.applyDocumentEdit(doc.id, 0, [{ from: 0, to: 0, insert: 'Hello' }], 'alice');
    documentManager.applyDocumentEdit(doc.id, 1, [{ from: 5, to: 5, insert: ' world' }], 'bob');

    const reverted = documentManager.revertDocument(doc.id, 1, 'alice');
    expect(reverted.content).toBe('Hello');
    expect(reverted.version).toBe(3);
    expect(reverted.history[reverted.history.length - 1].author).toContain('reverted to v1');
  });

  it('throws when reverting to a version that does not exist', () => {
    const doc = documentManager.createDocument('user-1', 'Doc');
    expect(() => documentManager.revertDocument(doc.id, 99, 'alice')).toThrow(documentManager.DocumentError);
  });

  it('throws DocumentError when the requested document is missing', () => {
    expect(() => documentManager.getDocument('nope')).toThrow(documentManager.DocumentError);
  });
});
