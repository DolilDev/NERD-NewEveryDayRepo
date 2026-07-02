import { randomUUID } from 'node:crypto';
import type { TaskRepository } from '../db/taskRepository';
import type { Task, CreateTaskInput, UpdateTaskInput } from '../../shared/types';
import { NotFoundError } from '../../shared/errors';
import { validateTitle, normalizeDescription, validateStatus } from './validation';

export interface TaskServiceOptions {
  /** Clock returning an ISO 8601 timestamp. Injectable for deterministic tests. */
  now?: () => string;
  /** Id generator. Injectable for deterministic tests. */
  newId?: () => string;
}

/**
 * Business-logic layer. Owns all validation rules and timestamp/id assignment,
 * then delegates persistence to the repository. The rest of the app talks to
 * tasks exclusively through this service.
 */
export class TaskService {
  private readonly now: () => string;
  private readonly newId: () => string;

  constructor(
    private readonly repo: TaskRepository,
    options: TaskServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.newId = options.newId ?? (() => randomUUID());
  }

  list(): Task[] {
    return this.repo.getAll();
  }

  add(input: CreateTaskInput): Task {
    const title = validateTitle(input.title);
    const description = normalizeDescription(input.description);
    const status = input.status === undefined ? 'todo' : validateStatus(input.status);
    const timestamp = this.now();

    const task: Task = {
      id: this.newId(),
      title,
      description,
      status,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncedAt: null,
    };
    return this.repo.create(task);
  }

  edit(id: string, input: UpdateTaskInput): Task {
    const existing = this.repo.getById(id);
    if (!existing) {
      throw new NotFoundError(`Task ${id} was not found.`);
    }

    const updated: Task = {
      ...existing,
      title: input.title === undefined ? existing.title : validateTitle(input.title),
      description:
        input.description === undefined
          ? existing.description
          : normalizeDescription(input.description),
      status: input.status === undefined ? existing.status : validateStatus(input.status),
      updatedAt: this.now(),
    };
    return this.repo.update(updated);
  }

  remove(id: string): void {
    const deleted = this.repo.delete(id);
    if (!deleted) {
      throw new NotFoundError(`Task ${id} was not found.`);
    }
  }
}
