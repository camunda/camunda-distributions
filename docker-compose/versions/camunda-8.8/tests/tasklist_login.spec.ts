import { test, expect } from '@playwright/test';

test('Tasklist login and dashboard access', async ({ page }) => {
  test.setTimeout(120000);
  
  // Navigate to Tasklist
  await page.goto('http://localhost:8088/tasklist');
  
  // Wait for page to load and verify login form
  await page.waitForLoadState('networkidle');
  await expect(page.getByPlaceholder('Username')).toBeVisible();
  await expect(page.getByPlaceholder('Password')).toBeVisible();
  
  // Perform login
  await page.getByPlaceholder('Username').fill('demo');
  await page.getByPlaceholder('Password').fill('demo');
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Wait for navigation after login
  await page.waitForLoadState('networkidle');
  
  // Verify successful login by checking URL and absence of login form
  await expect(page).toHaveURL(/.*tasklist(?!.*login).*$/);
  await expect(page.locator('input[placeholder="Username"]')).not.toBeVisible();
  
  // Verify no login errors
  await expect(page.locator('text=/invalid.*credential|login.*failed|authentication.*error|unauthorized/i')).not.toBeVisible();
  
  // Check page title for sanity
  const title = await page.title();
  expect(title).not.toBe('');
  expect(title.toLowerCase()).not.toContain('error');
  expect(title.toLowerCase()).not.toContain('not found');
});
