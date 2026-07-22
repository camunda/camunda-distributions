import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import {
  BASE_URL,
  getAccessToken,
  deployProcess,
  startProcessInstance,
  waitForInstanceCompleted,
} from './utils/api';

// Unique id per attempt so retries and leftover instances from failed runs never collide
const RUN_ID = `${Date.now()}`;
const PROCESS_ID = `single_user_task_${RUN_ID}`;
const PROCESS_NAME = `Single User Task ${RUN_ID}`;

async function loginViaKeycloak(page: Page, appUrl: string): Promise<void> {
  await page.goto(appUrl);
  const usernameField = page.locator(
    'input[name="username"], input[name="email"], input[id="username"]',
  );
  await usernameField.first().waitFor({ state: 'visible' });
  await usernameField.first().fill('demo');
  await page.locator('input[type="password"]').first().fill('demo');
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForLoadState('load');
}

test('cross-component happy path: deploy, complete user task in Tasklist, verify in Operate', async ({ page }) => {
  test.setTimeout(240000);

  const token = await getAccessToken();
  await deployProcess(
    token,
    path.resolve(__dirname, 'resources', 'single_user_task.bpmn'),
    'single_user_task.bpmn',
    (bpmn) =>
      bpmn
        .replaceAll('single_user_task_process', PROCESS_ID)
        .replaceAll('Single User Task Process', PROCESS_NAME),
  );
  const instanceKey = await startProcessInstance(token, PROCESS_ID);

  await loginViaKeycloak(page, `${BASE_URL}/tasklist`);
  await page.waitForURL(/\/tasklist(?!.*login)/);

  // The task entry shows the run-unique process name, so this cannot match tasks
  // from other runs or retries
  const taskEntry = page.getByText(PROCESS_NAME).first();
  await taskEntry.waitFor({ state: 'visible', timeout: 60000 });
  await taskEntry.click();

  await page.getByRole('button', { name: /assign to me/i }).click();
  const completeButton = page.getByRole('button', { name: /complete task/i });
  await expect(completeButton).toBeEnabled({ timeout: 30000 });
  await completeButton.click();

  await waitForInstanceCompleted(token, instanceKey);

  // Same browser session is reused by Operate through Keycloak SSO
  await page.goto(`${BASE_URL}/operate/processes/${instanceKey}`);
  await page.waitForURL(/\/operate\/processes\//);
  await expect(page.locator('input[type="password"]')).not.toBeVisible();
  // Operate renders the process name, not the BPMN process id
  await expect(page.getByText(PROCESS_NAME).first()).toBeVisible({ timeout: 30000 });
});
