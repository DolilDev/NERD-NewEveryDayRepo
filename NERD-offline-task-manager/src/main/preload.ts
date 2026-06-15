import { contextBridge, ipcRenderer } from 'electron';
import type { TaskApi, CreateTaskInput, UpdateTaskInput } from '../shared/types';

// Channel names mirror src/main/ipcChannels.ts. They are duplicated as literals
// on purpose: a sandboxed preload cannot require local modules.
const api: TaskApi = {
  listTasks: () => ipcRenderer.invoke('tasks:list'),
  addTask: (input: CreateTaskInput) => ipcRenderer.invoke('tasks:add', input),
  editTask: (id: string, input: UpdateTaskInput) => ipcRenderer.invoke('tasks:edit', id, input),
  deleteTask: (id: string) => ipcRenderer.invoke('tasks:delete', id),
};

// The only thing the renderer can reach. No Node, no database — just this API.
contextBridge.exposeInMainWorld('api', api);
