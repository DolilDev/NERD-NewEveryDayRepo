export interface User {
  id: string;
  username: string;
}

export interface DocumentModel {
  id: string;
  title: string;
  content: string;
  owner_id: string;
  collaborators: string[];
  created_at: string;
  updated_at: string;
}

export interface Snapshot {
  snapshot_id: string;
  content: string;
  saved_by: string;
  saved_at: string;
}

export interface Delta {
  doc_id: string;
  delta: string;
  cursor_position: number;
}

export interface CursorPosition {
  doc_id: string;
  cursor_position: number;
  username: string;
}

export interface SocketEvents {
  join_document: (payload: { doc_id: string }) => void;
  text_change: (payload: Delta) => void;
  cursor_move: (payload: { doc_id: string; cursor_position: number }) => void;
  save_snapshot: (payload: { doc_id: string }) => void;
}
