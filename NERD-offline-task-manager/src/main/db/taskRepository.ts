import type { AppDatabase } from './connection';
import type { Task, TaskStatus } from '../../shared/types';

interface TaskRow {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    syncedAt: row.syncedAt,
  };
}

/**
 * Data-access layer: pure synchronous SQL CRUD over the `tasks` table.
 * No validation and no business logic live here — those belong in TaskService.
 */
export class TaskRepository {
  constructor(private readonly db: AppDatabase) {}

  create(task: Task): Task {
    this.db
      .prepare(
        `INSERT INTO tasks (id, title, description, status, createdAt, updatedAt, syncedAt)
         VALUES (@id, @title, @description, @status, @createdAt, @updatedAt, @syncedAt)`,
      )
      .run(task);
    return task;
  }

  getAll(): Task[] {
    const rows = this.db.prepare('SELECT * FROM tasks ORDER BY createdAt DESC').all() as TaskRow[];
    return rows.map(rowToTask);
  }

  getById(id: string): Task | undefined {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
    return row ? rowToTask(row) : undefined;
  }

  update(task: Task): Task {
    this.db
      .prepare(
        `UPDATE tasks
         SET title = @title, description = @description, status = @status,
             updatedAt = @updatedAt, syncedAt = @syncedAt
         WHERE id = @id`,
      )
      .run({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        updatedAt: task.updatedAt,
        syncedAt: task.syncedAt,
      });
    return task;
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
