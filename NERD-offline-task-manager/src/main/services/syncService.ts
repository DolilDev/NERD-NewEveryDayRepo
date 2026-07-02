import { readFile, writeFile } from 'node:fs/promises';
import { SyncError } from '../../shared/errors';
import { validateTitle, normalizeDescription, validateStatus } from './validation';
import type { TaskRepository } from '../db/taskRepository';
import type { CloudGateway } from '../cloud/cloudGateway';
import type { Task, ImportSummary } from '../../shared/types';

/** Minimal file-IO seam so the service can be tested without touching disk. */
export interface FileGateway {
  readFile(path: string): Promise<string>;
  writeFile(path: string, contents: string): Promise<void>;
}

/** Default gateway backed by the real filesystem. */
export const nodeFileGateway: FileGateway = {
  readFile: (path) => readFile(path, 'utf8'),
  writeFile: (path, contents) => writeFile(path, contents, 'utf8'),
};

const EXPORT_VERSION = 1;

/**
 * Offline "sync" through JSON files: export all tasks to a file and import them
 * back, merging by id (existing tasks are updated, new ones inserted). All
 * records are validated before any database write, so a malformed file fails
 * cleanly without leaving a half-applied import.
 */
export class SyncService {
  constructor(
    private readonly repo: TaskRepository,
    private readonly files: FileGateway,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly cloud?: CloudGateway,
  ) {}

  /** Whether cloud sync is configured and available. */
  isCloudEnabled(): boolean {
    return this.cloud !== undefined;
  }

  /** Pushes every local task to the cloud and stamps them as synced. */
  async pushToCloud(): Promise<number> {
    const cloud = this.requireCloud();
    const tasks = this.repo.getAll();
    await cloud.push(tasks);
    const syncedAt = this.now();
    for (const task of tasks) {
      this.repo.update({ ...task, syncedAt });
    }
    return tasks.length;
  }

  /** Pulls tasks from the cloud and merges them by id, same as JSON import. */
  async pullFromCloud(): Promise<ImportSummary> {
    const cloud = this.requireCloud();
    const remote = await cloud.pull();
    const syncedAt = this.now();
    const tasks = remote.map((item, index) => ({
      ...this.validateImported(item, index),
      syncedAt,
    }));
    return this.merge(tasks);
  }

  private requireCloud(): CloudGateway {
    if (!this.cloud) {
      throw new SyncError('Cloud sync is not configured. Add Firebase credentials to .env.');
    }
    return this.cloud;
  }

  async exportToJson(filePath: string): Promise<number> {
    const tasks = this.repo.getAll();
    const payload = { version: EXPORT_VERSION, exportedAt: this.now(), tasks };
    await this.files.writeFile(filePath, JSON.stringify(payload, null, 2));
    return tasks.length;
  }

  async importFromJson(filePath: string): Promise<ImportSummary> {
    const raw = await this.files.readFile(filePath);
    const tasks = this.parseTasks(raw);
    return this.merge(tasks);
  }

  private parseTasks(raw: string): Task[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new SyncError('The selected file is not valid JSON.');
    }

    const list = Array.isArray(parsed) ? parsed : (parsed as { tasks?: unknown })?.tasks;
    if (!Array.isArray(list)) {
      throw new SyncError('The file does not contain a list of tasks.');
    }

    return list.map((item, index) => this.validateImported(item, index));
  }

  private validateImported(raw: unknown, index: number): Task {
    if (typeof raw !== 'object' || raw === null) {
      throw new SyncError(`Task #${index + 1} is not a valid object.`);
    }
    const record = raw as Record<string, unknown>;
    if (typeof record.id !== 'string' || record.id.trim() === '') {
      throw new SyncError(`Task #${index + 1} is missing a valid id.`);
    }

    try {
      const fallback = this.now();
      return {
        id: record.id,
        title: validateTitle(record.title),
        description: normalizeDescription(record.description),
        status: validateStatus(record.status),
        createdAt: typeof record.createdAt === 'string' ? record.createdAt : fallback,
        updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : fallback,
        syncedAt: typeof record.syncedAt === 'string' ? record.syncedAt : null,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'invalid data';
      throw new SyncError(`Task #${index + 1} is invalid: ${reason}`);
    }
  }

  private merge(tasks: Task[]): ImportSummary {
    let created = 0;
    let updated = 0;
    for (const task of tasks) {
      if (this.repo.getById(task.id)) {
        this.repo.update(task);
        updated += 1;
      } else {
        this.repo.create(task);
        created += 1;
      }
    }
    return { created, updated, total: tasks.length };
  }
}
