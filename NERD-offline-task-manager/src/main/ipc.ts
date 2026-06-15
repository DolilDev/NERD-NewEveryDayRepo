import { ipcMain, dialog, BrowserWindow } from 'electron';
import type { TaskService } from './services/taskService';
import type { SyncService } from './services/syncService';
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

/** Runs a sync handler and wraps the outcome in the IpcResult envelope. */
function run<T>(fn: () => T): IpcResult<T> {
  try {
    return { ok: true, data: fn() };
  } catch (error) {
    return { ok: false, error: serializeError(error) };
  }
}

/** Runs an async handler and wraps the outcome in the IpcResult envelope. */
async function runAsync<T>(fn: () => Promise<T>): Promise<IpcResult<T>> {
  try {
    return { ok: true, data: await fn() };
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

/** Bridges the renderer to JSON export/import, including the file dialogs. */
export function registerSyncIpc(syncService: SyncService): void {
  ipcMain.handle(IpcChannels.exportTasks, () =>
    runAsync(async () => {
      const window = BrowserWindow.getFocusedWindow();
      const options = {
        title: 'Export tasks',
        defaultPath: 'tasks.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      };
      const result = window
        ? await dialog.showSaveDialog(window, options)
        : await dialog.showSaveDialog(options);
      if (result.canceled || !result.filePath) {
        return { canceled: true };
      }
      const count = await syncService.exportToJson(result.filePath);
      return { canceled: false, count, path: result.filePath };
    }),
  );

  ipcMain.handle(IpcChannels.importTasks, () =>
    runAsync(async () => {
      const window = BrowserWindow.getFocusedWindow();
      const options = {
        title: 'Import tasks',
        properties: ['openFile' as const],
        filters: [{ name: 'JSON', extensions: ['json'] }],
      };
      const result = window
        ? await dialog.showOpenDialog(window, options)
        : await dialog.showOpenDialog(options);
      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true };
      }
      const summary = await syncService.importFromJson(result.filePaths[0]);
      return { canceled: false, summary };
    }),
  );

  ipcMain.handle(IpcChannels.cloudStatus, () =>
    run(() => ({ enabled: syncService.isCloudEnabled() })),
  );
  ipcMain.handle(IpcChannels.cloudPush, () =>
    runAsync(async () => ({ count: await syncService.pushToCloud() })),
  );
  ipcMain.handle(IpcChannels.cloudPull, () =>
    runAsync(async () => ({ summary: await syncService.pullFromCloud() })),
  );
}
