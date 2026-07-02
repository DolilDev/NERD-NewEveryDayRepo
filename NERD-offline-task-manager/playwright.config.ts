import { defineConfig } from '@playwright/test';

// E2E tests launch the built Electron app and drive the real UI.
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
});
