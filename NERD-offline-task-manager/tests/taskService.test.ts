import { openDatabase } from '../src/main/db/connection';
import { TaskRepository } from '../src/main/db/taskRepository';
import { TaskService } from '../src/main/services/taskService';
import { ValidationError, NotFoundError } from '../src/shared/errors';

function makeService(): TaskService {
  const repo = new TaskRepository(openDatabase(':memory:'));
  let counter = 0;
  return new TaskService(repo, {
    now: () => '2026-06-15T00:00:00.000Z',
    newId: () => `id-${(counter += 1)}`,
  });
}

describe('TaskService', () => {
  it('adds a task with trimmed fields and sensible defaults', () => {
    const service = makeService();
    const task = service.add({ title: '  Buy milk  ' });

    expect(task.title).toBe('Buy milk');
    expect(task.description).toBe('');
    expect(task.status).toBe('todo');
    expect(task.id).toBe('id-1');
    expect(task.syncedAt).toBeNull();
    expect(task.createdAt).toBe('2026-06-15T00:00:00.000Z');
  });

  it('persists and lists tasks (newest first)', () => {
    const service = makeService();
    service.add({ title: 'First' });
    service.add({ title: 'Second' });

    expect(service.list()).toHaveLength(2);
  });

  it('updates a task and keeps unspecified fields', () => {
    const service = makeService();
    const created = service.add({ title: 'Original', description: 'keep me' });

    const updated = service.edit(created.id, { status: 'done' });

    expect(updated.status).toBe('done');
    expect(updated.title).toBe('Original');
    expect(updated.description).toBe('keep me');
  });

  it('deletes a task', () => {
    const service = makeService();
    const created = service.add({ title: 'Temporary' });

    service.remove(created.id);

    expect(service.list()).toHaveLength(0);
  });

  describe('validation', () => {
    it('rejects an empty title', () => {
      const service = makeService();
      expect(() => service.add({ title: '   ' })).toThrow(ValidationError);
    });

    it('rejects a missing title', () => {
      const service = makeService();
      // @ts-expect-error intentionally invalid input
      expect(() => service.add({})).toThrow(ValidationError);
    });

    it('rejects an invalid status', () => {
      const service = makeService();
      // @ts-expect-error intentionally invalid input
      expect(() => service.add({ title: 'ok', status: 'urgent' })).toThrow(ValidationError);
    });

    it('rejects a title beyond the length limit', () => {
      const service = makeService();
      expect(() => service.add({ title: 'a'.repeat(201) })).toThrow(ValidationError);
    });

    it('rejects a description beyond the length limit', () => {
      const service = makeService();
      expect(() => service.add({ title: 'ok', description: 'a'.repeat(2001) })).toThrow(
        ValidationError,
      );
    });

    it('rejects an invalid status on edit', () => {
      const service = makeService();
      const created = service.add({ title: 'ok' });
      // @ts-expect-error intentionally invalid input
      expect(() => service.edit(created.id, { status: 'nope' })).toThrow(ValidationError);
    });
  });

  describe('missing tasks', () => {
    it('throws NotFoundError when editing a missing task', () => {
      const service = makeService();
      expect(() => service.edit('missing', { title: 'x' })).toThrow(NotFoundError);
    });

    it('throws NotFoundError when deleting a missing task', () => {
      const service = makeService();
      expect(() => service.remove('missing')).toThrow(NotFoundError);
    });
  });
});
