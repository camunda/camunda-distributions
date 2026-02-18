import { test, expect } from '@playwright/test';

test('Operate login and dashboard access', async ({ page }) => {
  test.setTimeout(120000);

  // Wait until Operate publishes a healthy readiness endpoint before hitting the UI.
  const readinessUrl = 'http://localhost:9600/actuator/health/readiness';
  const operateUrl = 'http://localhost:8088/operate';
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
      // ignore errors while the service starts
    }
    if (Date.now() - start > readinessTimeoutMs) {
      throw new Error(`Timed out waiting for Operate readiness at ${readinessUrl}`);
    }
    await page.waitForTimeout(pollIntervalMs);
  }

  // Navigate to Operate (will redirect through Identity / Keycloak)
  await page.goto(operateUrl);

  // Keycloak page shows either "Username or email" or "Username"
  const usernameField = page.locator('input[name="username"], input[name="email"], input[id="username"], input[label="Username or email"]');
  await usernameField.first().waitFor({ state: 'visible' });
  const passwordField = page.locator('input[type="password"]');
  await passwordField.first().waitFor({ state: 'visible' });

  // Perform login
  await usernameField.first().fill('demo');
  await passwordField.first().fill('demo');
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Wait for navigation after successful login
  await page.waitForLoadState('load');
  await page.waitForURL(/http:\/\/localhost:8088\/operate(?!.*login).*$/);

  // Verify successful login by checking URL change and absence of login form
  await expect(page).toHaveURL(/.*operate(?!.*login).*$/);
  await expect(page.locator('input[type="password"]')).not.toBeVisible();

  // Verify no authentication errors
  await expect(page.locator('text=/invalid.*credential|login.*failed|authentication.*error|unauthorized/i')).not.toBeVisible();

  // Verify page title is reasonable
  const title = await page.title();
  expect(title).not.toBe('');
  expect(title.toLowerCase()).not.toContain('error');
  expect(title.toLowerCase()).not.toContain('not found');
});
