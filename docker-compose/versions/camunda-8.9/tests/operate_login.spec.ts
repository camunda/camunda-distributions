import { test, expect } from '@playwright/test';

test('Operate login and dashboard access', async ({ page }) => {
  test.setTimeout(120000);

  // Navigate to Operate
  await page.goto('http://localhost:8088/operate');

  // Wait for page to load and verify login form is present
  await page.waitForLoadState('networkidle');
  await expect(page.getByLabel('Username or email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();

  // Perform login
  await page.getByLabel('Username or email').fill('demo');
  await page.getByLabel('Password').fill('demo');
  await page.getByRole('button', { name: 'Log in' }).click();

  // Wait for navigation after successful login
  await page.waitForLoadState('networkidle');

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
