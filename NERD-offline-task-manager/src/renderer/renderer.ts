import type { Task, TaskStatus, TaskApi, IpcResult } from '../shared/types';

declare global {
  interface Window {
    api: TaskApi;
  }
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing element #${id}`);
  }
  return node as T;
}

const form = el<HTMLFormElement>('task-form');
const titleInput = el<HTMLInputElement>('title');
const descriptionInput = el<HTMLTextAreaElement>('description');
const statusSelect = el<HTMLSelectElement>('status');
const submitButton = el<HTMLButtonElement>('submit-button');
const cancelButton = el<HTMLButtonElement>('cancel-button');
const exportButton = el<HTMLButtonElement>('export-button');
const importButton = el<HTMLButtonElement>('import-button');
const pushButton = el<HTMLButtonElement>('push-button');
const pullButton = el<HTMLButtonElement>('pull-button');
const cloudStatusEl = el<HTMLParagraphElement>('cloud-status');
const listEl = el<HTMLUListElement>('task-list');
const emptyState = el<HTMLParagraphElement>('empty-state');
const messageEl = el<HTMLDivElement>('message');
const filterSelect = el<HTMLSelectElement>('filter');
const sortSelect = el<HTMLSelectElement>('sort');
const taskCountEl = el<HTMLSpanElement>('task-count');

type FilterValue = 'all' | TaskStatus;
type SortValue = 'newest' | 'oldest' | 'title';

let allTasks: Task[] = [];
let currentFilter: FilterValue = 'all';
let currentSort: SortValue = 'newest';
let editingId: string | null = null;
let messageTimer: number | undefined;

function showMessage(text: string, kind: 'error' | 'success'): void {
  messageEl.textContent = text;
  messageEl.className = `message message--${kind}`;
  messageEl.hidden = false;
  if (messageTimer !== undefined) {
    window.clearTimeout(messageTimer);
  }
  if (kind === 'success') {
    messageTimer = window.setTimeout(() => {
      messageEl.hidden = true;
    }, 2500);
  }
}

function clearMessage(): void {
  messageEl.hidden = true;
  messageEl.textContent = '';
}

function setEditing(task: Task | null): void {
  if (task) {
    editingId = task.id;
    titleInput.value = task.title;
    descriptionInput.value = task.description;
    statusSelect.value = task.status;
    submitButton.textContent = 'Save changes';
    cancelButton.hidden = false;
    titleInput.focus();
  } else {
    editingId = null;
    form.reset();
    statusSelect.value = 'todo';
    submitButton.textContent = 'Add task';
    cancelButton.hidden = true;
  }
}

function renderTasks(tasks: Task[]): void {
  listEl.replaceChildren();

  for (const task of tasks) {
    const item = document.createElement('li');
    item.className = 'task';

    const main = document.createElement('div');
    main.className = 'task__main';

    const row = document.createElement('div');
    row.className = 'task__row';

    const title = document.createElement('span');
    title.className = 'task__title';
    title.textContent = task.title;
    if (task.status === 'done') {
      title.classList.add('task__title--done');
    }

    const badge = document.createElement('span');
    badge.className = `badge badge--${task.status}`;
    badge.textContent = STATUS_LABELS[task.status];

    row.append(title, badge);
    main.append(row);

    if (task.description) {
      const description = document.createElement('p');
      description.className = 'task__description';
      description.textContent = task.description;
      main.append(description);
    }

    const actions = document.createElement('div');
    actions.className = 'task__actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'btn btn--ghost';
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => setEditing(task));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn btn--danger';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
      void handleDelete(task);
    });

    actions.append(editButton, deleteButton);
    item.append(main, actions);
    listEl.append(item);
  }
}

function sortTasks(tasks: Task[]): Task[] {
  const sorted = [...tasks];
  switch (currentSort) {
    case 'oldest':
      return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'newest':
    default:
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

function updateCount(shown: number): void {
  const total = allTasks.length;
  const done = allTasks.filter((task) => task.status === 'done').length;
  if (total === 0) {
    taskCountEl.textContent = 'No tasks';
    return;
  }
  const base = `${total} task${total === 1 ? '' : 's'} · ${done} done`;
  taskCountEl.textContent = currentFilter === 'all' ? base : `${base} · ${shown} shown`;
}

function render(): void {
  const filtered =
    currentFilter === 'all' ? allTasks : allTasks.filter((task) => task.status === currentFilter);
  const sorted = sortTasks(filtered);

  renderTasks(sorted);
  updateCount(filtered.length);

  if (allTasks.length === 0) {
    emptyState.textContent = 'No tasks yet. Add your first one above.';
    emptyState.hidden = false;
  } else if (sorted.length === 0) {
    emptyState.textContent = 'No tasks match this filter.';
    emptyState.hidden = false;
  } else {
    emptyState.hidden = true;
  }
}

async function refresh(): Promise<void> {
  const result = await window.api.listTasks();
  if (result.ok) {
    allTasks = result.data;
    render();
  } else {
    showMessage(result.error.message, 'error');
  }
}

async function handleDelete(task: Task): Promise<void> {
  if (!window.confirm(`Delete "${task.title}"?`)) {
    return;
  }
  const result = await window.api.deleteTask(task.id);
  if (result.ok) {
    if (editingId === task.id) {
      setEditing(null);
    }
    showMessage('Task deleted.', 'success');
    await refresh();
  } else {
    showMessage(result.error.message, 'error');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  clearMessage();

  const payload = {
    title: titleInput.value,
    description: descriptionInput.value,
    status: statusSelect.value as TaskStatus,
  };

  void (async () => {
    const result: IpcResult<Task> = editingId
      ? await window.api.editTask(editingId, payload)
      : await window.api.addTask(payload);

    if (result.ok) {
      showMessage(editingId ? 'Task updated.' : 'Task added.', 'success');
      setEditing(null);
      await refresh();
    } else {
      showMessage(result.error.message, 'error');
    }
  })();
});

cancelButton.addEventListener('click', () => {
  setEditing(null);
  clearMessage();
});

exportButton.addEventListener('click', () => {
  void (async () => {
    const result = await window.api.exportTasks();
    if (!result.ok) {
      showMessage(result.error.message, 'error');
      return;
    }
    if (result.data.canceled) {
      return;
    }
    showMessage(`Exported ${result.data.count} task(s).`, 'success');
  })();
});

importButton.addEventListener('click', () => {
  void (async () => {
    const result = await window.api.importTasks();
    if (!result.ok) {
      showMessage(result.error.message, 'error');
      return;
    }
    if (result.data.canceled || !result.data.summary) {
      return;
    }
    const { created, updated } = result.data.summary;
    showMessage(`Imported: ${created} new, ${updated} updated.`, 'success');
    await refresh();
  })();
});

pushButton.addEventListener('click', () => {
  void (async () => {
    const result = await window.api.pushToCloud();
    if (result.ok) {
      showMessage(`Pushed ${result.data.count} task(s) to the cloud.`, 'success');
    } else {
      showMessage(result.error.message, 'error');
    }
  })();
});

pullButton.addEventListener('click', () => {
  void (async () => {
    const result = await window.api.pullFromCloud();
    if (!result.ok) {
      showMessage(result.error.message, 'error');
      return;
    }
    const { created, updated } = result.data.summary;
    showMessage(`Pulled from cloud: ${created} new, ${updated} updated.`, 'success');
    await refresh();
  })();
});

async function updateCloudStatus(): Promise<void> {
  const result = await window.api.cloudStatus();
  const enabled = result.ok && result.data.enabled;
  pushButton.disabled = !enabled;
  pullButton.disabled = !enabled;
  cloudStatusEl.textContent = enabled
    ? 'Cloud sync: ready (Firebase configured).'
    : 'Cloud sync: not configured — add Firebase keys to .env to enable.';
}

filterSelect.addEventListener('change', () => {
  currentFilter = filterSelect.value as FilterValue;
  render();
});

sortSelect.addEventListener('change', () => {
  currentSort = sortSelect.value as SortValue;
  render();
});

void refresh();
void updateCloudStatus();
