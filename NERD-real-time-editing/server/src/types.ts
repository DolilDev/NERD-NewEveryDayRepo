export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: number;
}

export interface TextChange {
  from: number;
  to: number;
  insert: string;
}

export interface DocumentSnapshot {
  version: number;
  content: string;
  timestamp: number;
  author: string;
}

export interface DocumentRecord {
  id: string;
  ownerId: string;
  title: string;
  content: string;
  version: number;
  history: DocumentSnapshot[];
  createdAt: number;
  updatedAt: number;
}

export interface DbShape {
  users: User[];
  documents: DocumentRecord[];
}

// ---- WebSocket protocol ----

export type ClientMessage =
  | { type: 'join'; docId: string }
  | { type: 'edit'; docId: string; baseVersion: number; changes: TextChange[] }
  | { type: 'revert'; docId: string; toVersion: number };

export type ServerMessage =
  | { type: 'joined'; docId: string; content: string; version: number; history: DocumentSnapshot[] }
  | { type: 'remote-edit'; docId: string; changes: TextChange[]; version: number; author: string }
  | { type: 'reverted'; docId: string; content: string; version: number; history: DocumentSnapshot[] }
  | { type: 'error'; message: string }
  | { type: 'peer-joined'; username: string }
  | { type: 'peer-left'; username: string };
