import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './node_modules/@camunda/e2e-test-suite/dist/tests/c8Run-8.8',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  /* The shared suite's tests are not isolated across workers */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['html']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    /* Set timeout for individual actions */
    actionTimeout: 10000,
    /* Set timeout for navigation */
    navigationTimeout: 30000,
  },

  /* Global test timeout: the 8.8 webhook connector specs wait 5 minutes synchronously.
     Keep attempts x timeout + job setup below the 45-minute CI job timeout. */
  timeout: 8 * 60 * 1000,

  /* Expect timeout for assertions */
  expect: {
    timeout: 10000
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      /* The stack runs Tasklist in V2 mode; @tasklistV1 tests target the V1 UI */
      grep: /^(?!.*@tasklistV1).*$/,
    },
  ],
});
