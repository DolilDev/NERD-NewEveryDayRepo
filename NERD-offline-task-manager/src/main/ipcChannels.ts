// Canonical IPC channel names, used by the main-process handlers.
// preload.ts mirrors these as string literals because a sandboxed preload
// cannot require local modules — keep the two in sync.
export const IpcChannels = {
  listTasks: 'tasks:list',
  addTask: 'tasks:add',
  editTask: 'tasks:edit',
  deleteTask: 'tasks:delete',
} as const;
