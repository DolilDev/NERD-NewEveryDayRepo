import { openDatabase } from '../src/main/db/connection';
import { TaskRepository } from '../src/main/db/taskRepository';
import { TaskService } from '../src/main/services/taskService';
import { SyncService } from '../src/main/services/syncService';
import type { FileGateway } from '../src/main/services/syncService';
import type { CloudGateway } from '../src/main/cloud/cloudGateway';
import { SyncError } from '../src/shared/errors';
import type { Task } from '../src/shared/types';

const FIXED_NOW = '2026-06-15T12:00:00.000Z';

function makeFakeFs() {
  const files = new Map<string, string>();
  const gateway: FileGateway = {
    readFile: async (path) => {
      const contents = files.get(path);
      if (contents === undefined) {
        throw new Error(`ENOENT ${path}`);
      }
      return contents;
    },
    writeFile: async (path, contents) => {
      files.set(path, contents);
    },
  };
  return { files, gateway };
}

function setup(cloud?: CloudGateway) {
  const repo = new TaskRepository(openDatabase(':memory:'));
  let counter = 0;
  const tasks = new TaskService(repo, {
    now: () => FIXED_NOW,
    newId: () => `id-${(counter += 1)}`,
  });
  const { files, gateway } = makeFakeFs();
  const sync = new SyncService(repo, gateway, () => FIXED_NOW, cloud);
  return { repo, tasks, files, sync };
}

describe('SyncService — JSON', () => {
  it('round-trips export then import, merging by id', async () => {
    const { tasks, sync, repo } = setup();
    const keep = tasks.add({ title: 'Keep' });
    const removed = tasks.add({ title: 'Removed' });

    const exported = await sync.exportToJson('/out.json');
    expect(exported).toBe(2);

    // Simulate the user deleting a task in the app, then importing the backup.
    tasks.remove(removed.id);
    expect(repo.getAll()).toHaveLength(1);

    const summary = await sync.importFromJson('/out.json');

    expect(summary).toEqual({ created: 1, updated: 1, total: 2 });
    expect(repo.getAll()).toHaveLength(2);
    expect(repo.getById(removed.id)?.title).toBe('Removed');
    expect(repo.getById(keep.id)?.title).toBe('Keep');
  });

  it('rejects a file that is not valid JSON', async () => {
    const { sync, files } = setup();
    files.set('/bad.json', '{ not valid json');
    await expect(sync.importFromJson('/bad.json')).rejects.toThrow(SyncError);
  });

  it('rejects a record with invalid data', async () => {
    const { sync, files } = setup();
    files.set('/invalid.json', JSON.stringify({ tasks: [{ id: 'z', status: 'todo' }] }));
    await expect(sync.importFromJson('/invalid.json')).rejects.toThrow(SyncError);
  });

  it('rejects a file that is not a list of tasks', async () => {
    const { sync, files } = setup();
    files.set('/weird.json', JSON.stringify({ nope: true }));
    await expect(sync.importFromJson('/weird.json')).rejects.toThrow(SyncError);
  });
});

describe('SyncService — cloud', () => {
  it('pushes local tasks and stamps them as synced', async () => {
    let pushed: Task[] = [];
    const cloud: CloudGateway = {
      push: async (t) => {
        pushed = t;
      },
      pull: async () => [],
    };
    const { tasks, sync, repo } = setup(cloud);
    const created = tasks.add({ title: 'Sync me' });

    const count = await sync.pushToCloud();

    expect(count).toBe(1);
    expect(pushed).toHaveLength(1);
    expect(repo.getById(created.id)?.syncedAt).toBe(FIXED_NOW);
  });

  it('pulls cloud tasks and merges them by id', async () => {
    const cloud: CloudGateway = {
      push: async () => {},
      pull: async () => [
        {
          id: 'remote-1',
          title: 'From cloud',
          description: '',
          status: 'done',
          createdAt: 'x',
          updatedAt: 'y',
          syncedAt: null,
        },
      ],
    };
    const { sync, repo } = setup(cloud);

    const summary = await sync.pullFromCloud();

    expect(summary).toEqual({ created: 1, updated: 0, total: 1 });
    expect(repo.getById('remote-1')?.title).toBe('From cloud');
    expect(repo.getById('remote-1')?.syncedAt).toBe(FIXED_NOW);
  });

  it('reports cloud as disabled and refuses to push without configuration', async () => {
    const { sync } = setup();
    expect(sync.isCloudEnabled()).toBe(false);
    await expect(sync.pushToCloud()).rejects.toThrow(SyncError);
  });
});
