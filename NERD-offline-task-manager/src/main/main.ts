import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { openDatabase } from './db/connection';
import { TaskRepository } from './db/taskRepository';
import { TaskService } from './services/taskService';
import { registerTaskIpc } from './ipc';

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 920,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.loadFile(path.join(__dirname, '../renderer/index.html'));
  return window;
}

app.whenReady().then(() => {
  const dbPath = path.join(app.getPath('userData'), 'tasks.sqlite');
  const taskService = new TaskService(new TaskRepository(openDatabase(dbPath)));
  registerTaskIpc(taskService);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
