import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The tests build on one another (add -> edit -> filter -> delete), so run serially.
test.describe.configure({ mode: 'serial' });

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  // Isolate the SQLite database in a throwaway userData directory.
  const userDataDir = mkdtempSync(join(tmpdir(), 'nerd-e2e-'));
  app = await electron.launch({ args: ['.', `--user-data-dir=${userDataDir}`] });
  page = await app.firstWindow();
  // Auto-accept the delete confirmation dialog.
  page.on('dialog', (dialog) => {
    void dialog.accept();
  });
});

test.afterAll(async () => {
  await app.close();
});

test('adds a task and shows it with a status badge', async () => {
  await page.fill('#title', 'Write E2E tests');
  await page.selectOption('#status', 'in_progress');
  await page.click('#submit-button');

  await expect(page.locator('#task-list .task')).toHaveCount(1);
  await expect(page.locator('#task-list .task__title').first()).toHaveText('Write E2E tests');
  await expect(page.locator('#task-list .badge').first()).toHaveText('In progress');
  await expect(page.locator('#message')).toHaveText('Task added.');
  await expect(page.locator('#task-count')).toHaveText('1 task · 0 done');
});

test('rejects an empty title with a validation message', async () => {
  await page.fill('#title', '   ');
  await page.click('#submit-button');

  await expect(page.locator('#message')).toHaveText('Title cannot be empty.');
  await expect(page.locator('#task-list .task')).toHaveCount(1);
});

test('edits a task to done', async () => {
  await page.click('#task-list .task .btn--ghost');
  await page.selectOption('#status', 'done');
  await page.click('#submit-button');

  await expect(page.locator('#task-list .badge').first()).toHaveText('Done');
  await expect(page.locator('#task-list .task__title--done')).toHaveCount(1);
  await expect(page.locator('#task-count')).toHaveText('1 task · 1 done');
});

test('filters the list by status', async () => {
  await page.selectOption('#filter', 'todo');
  await expect(page.locator('#task-list .task')).toHaveCount(0);
  await expect(page.locator('#empty-state')).toBeVisible();

  await page.selectOption('#filter', 'all');
  await expect(page.locator('#task-list .task')).toHaveCount(1);
});

test('deletes a task', async () => {
  await page.click('#task-list .task .btn--danger');

  await expect(page.locator('#task-list .task')).toHaveCount(0);
  await expect(page.locator('#message')).toHaveText('Task deleted.');
  await expect(page.locator('#task-count')).toHaveText('No tasks');
});
