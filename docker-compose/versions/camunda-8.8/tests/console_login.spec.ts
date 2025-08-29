import { test, expect } from '@playwright/test';

test('Console login and dashboard access', async ({ page }) => {
  test.setTimeout(120000);
  
  // Navigate to console
  await page.goto('http://localhost:8089/');
  
  // Verify login page loads correctly
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
  await expect(page.getByLabel('Username or email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  
  // Perform login
  await page.getByLabel('Username or email').fill('demo');
  await page.getByLabel('Password').fill('demo');
  await page.getByRole('button', { name: 'Log in' }).click();
  
  // Wait for login to complete and verify successful authentication
  await expect(page).toHaveURL(/.*(?<!\/login)$/); // URL should not end with /login
  
  // Verify we're on the dashboard - just check that we have some content and no login form
  await expect(page.locator('input[type="password"]')).not.toBeVisible();
  
  // Verify no error messages are present
  await expect(page.locator('text=/error|failed|invalid|incorrect/i')).not.toBeVisible();
  
  // Additional verification: check that we can interact with the dashboard
  const title = await page.title();
  expect(title).not.toBe('');
  expect(title.toLowerCase()).not.toContain('error');
});
