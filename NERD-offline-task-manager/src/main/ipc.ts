import { ipcMain } from 'electron';
import type { TaskService } from './services/taskService';
import type { IpcResult } from '../shared/types';
import { IpcChannels } from './ipcChannels';

// Errors whose messages are safe and useful to show the user verbatim.
const USER_FACING_ERRORS = new Set(['ValidationError', 'NotFoundError', 'SyncError']);

function serializeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error && USER_FACING_ERRORS.has(error.name)) {
    return { name: error.name, message: error.message };
  }
  // Unexpected (e.g. raw SQL) errors are logged but never leaked to the UI.
  console.error('[ipc] Unexpected error:', error);
  return { name: 'Error', message: 'An unexpected error occurred. Please try again.' };
}

/** Runs a handler and wraps the outcome in the IpcResult envelope. */
function run<T>(fn: () => T): IpcResult<T> {
  try {
    return { ok: true, data: fn() };
  } catch (error) {
    return { ok: false, error: serializeError(error) };
  }
}

/** Bridges the renderer to the task service over typed IPC channels. */
export function registerTaskIpc(taskService: TaskService): void {
  ipcMain.handle(IpcChannels.listTasks, () => run(() => taskService.list()));
  ipcMain.handle(IpcChannels.addTask, (_event, input) => run(() => taskService.add(input)));
  ipcMain.handle(IpcChannels.editTask, (_event, id, input) =>
    run(() => taskService.edit(id, input)),
  );
  ipcMain.handle(IpcChannels.deleteTask, (_event, id) => run(() => taskService.remove(id)));
}
