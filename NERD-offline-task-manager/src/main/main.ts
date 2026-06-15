import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { openDatabase } from './db/connection';
import { TaskRepository } from './db/taskRepository';
import { TaskService } from './services/taskService';
import { SyncService, nodeFileGateway } from './services/syncService';
import { FirestoreCloudGateway } from './cloud/firestoreCloudGateway';
import { getFirebaseConfig, getTasksCollection } from './config';
import type { CloudGateway } from './cloud/cloudGateway';
import { registerTaskIpc, registerSyncIpc } from './ipc';

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
  const repository = new TaskRepository(openDatabase(dbPath));

  const firebaseConfig = getFirebaseConfig();
  let cloud: CloudGateway | undefined;
  if (firebaseConfig) {
    cloud = new FirestoreCloudGateway(firebaseConfig, getTasksCollection());
  }

  registerTaskIpc(new TaskService(repository));
  registerSyncIpc(new SyncService(repository, nodeFileGateway, undefined, cloud));

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
