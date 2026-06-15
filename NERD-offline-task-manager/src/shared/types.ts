// Shared domain types used across the main process, preload and renderer.
// This module is type-only (no runtime code) so it can be referenced from any
// compilation target without emitting conflicting JavaScript.

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  /** ISO 8601 timestamp set when the task is first created. */
  createdAt: string;
  /** ISO 8601 timestamp refreshed on every change. */
  updatedAt: string;
  /** ISO 8601 timestamp of the last successful cloud sync, or null if never synced. */
  syncedAt: string | null;
}

/** Fields a caller may provide when creating a task. */
export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
}

/** Fields a caller may change when updating a task. */
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
}
