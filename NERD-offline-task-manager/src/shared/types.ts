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

/** Envelope returned by every IPC call so the renderer can handle errors safely. */
export interface IpcSuccess<T> {
  ok: true;
  data: T;
}
export interface IpcFailure {
  ok: false;
  error: { name: string; message: string };
}
export type IpcResult<T> = IpcSuccess<T> | IpcFailure;

/** Outcome of importing a JSON file: how many tasks were created vs updated. */
export interface ImportSummary {
  created: number;
  updated: number;
  total: number;
}

/** Result of an export action (may be cancelled from the file dialog). */
export interface ExportResult {
  canceled: boolean;
  count?: number;
  path?: string;
}

/** Result of an import action (may be cancelled from the file dialog). */
export interface ImportResult {
  canceled: boolean;
  summary?: ImportSummary;
}

/** The typed surface exposed to the renderer as `window.api`. */
export interface TaskApi {
  listTasks(): Promise<IpcResult<Task[]>>;
  addTask(input: CreateTaskInput): Promise<IpcResult<Task>>;
  editTask(id: string, input: UpdateTaskInput): Promise<IpcResult<Task>>;
  deleteTask(id: string): Promise<IpcResult<void>>;
  exportTasks(): Promise<IpcResult<ExportResult>>;
  importTasks(): Promise<IpcResult<ImportResult>>;
  cloudStatus(): Promise<IpcResult<{ enabled: boolean }>>;
  pushToCloud(): Promise<IpcResult<{ count: number }>>;
  pullFromCloud(): Promise<IpcResult<{ summary: ImportSummary }>>;
}
