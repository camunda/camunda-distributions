import { test, expect } from '@playwright/test';

test('Tasklist login and dashboard access', async ({ page }) => {
  test.setTimeout(120000);

  // Wait for Tasklist readiness before navigating (served via orchestration on 8088)
  const readinessUrl = 'http://localhost:9600/actuator/health/readiness';
  const tasklistUrl = 'http://localhost:8088/tasklist';
  const readinessTimeoutMs = 120_000;
  const pollIntervalMs = 2_000;
  const start = Date.now();
  while (true) {
    try {
      const response = await page.request.get(readinessUrl);
      if (response.ok()) {
        break;
      }
    } catch {
      // ignore until service is up
    }
    if (Date.now() - start > readinessTimeoutMs) {
      throw new Error(`Timed out waiting for Tasklist readiness at ${readinessUrl}`);
    }
    await page.waitForTimeout(pollIntervalMs);
  }

  const portStart = Date.now();
  while (true) {
    try {
      const response = await page.request.get(tasklistUrl, { maxRedirects: 0 });
      if (response.status() < 500) {
        break;
      }
    } catch {
      // ignore until the port opens
    }
    if (Date.now() - portStart > readinessTimeoutMs) {
      throw new Error(`Timed out waiting for Tasklist web port at ${tasklistUrl}`);
    }
    await page.waitForTimeout(pollIntervalMs);
  }

  await page.goto(tasklistUrl);

  // Wait for page to load and verify login form
  await page.waitForLoadState('networkidle');
  await expect(page.getByLabel('Username or email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();

  // Perform login
  await page.getByLabel('Username or email').fill('demo');
  await page.getByLabel('Password').fill('demo');
  await page.getByRole('button', { name: 'Log in' }).click();

  // Wait for navigation after login
  await page.waitForLoadState('networkidle');

  // Verify successful login by checking URL and absence of login form
  await expect(page).toHaveURL(/.*tasklist(?!.*login).*$/);
  await expect(page.locator('input[type="password"]')).not.toBeVisible();

  // Verify no login errors
  await expect(page.locator('text=/invalid.*credential|login.*failed|authentication.*error|unauthorized/i')).not.toBeVisible();

  // Check page title for sanity
  const title = await page.title();
  expect(title).not.toBe('');
  expect(title.toLowerCase()).not.toContain('error');
  expect(title.toLowerCase()).not.toContain('not found');
});
