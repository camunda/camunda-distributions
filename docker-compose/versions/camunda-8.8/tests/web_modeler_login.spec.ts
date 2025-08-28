import { test, expect } from '@playwright/test';

test('Validate login page', async ({ page }) => {
  test.setTimeout(60000);
  
  await page.goto('http://localhost:8070/');
  await page.getByRole('heading', { name: 'Log in' }).waitFor();
  await page.getByLabel('Username or email').click();
  await page.getByLabel('Username or email').fill('demo');
  await page.getByLabel('Password').click();
  await page.getByLabel('Password').fill('demo');
  await page.getByRole('button', { name: 'Log in' }).click();
  
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  await page.getByText('Projects').waitFor();
  
  const newProjectLocator = page.locator('a:has-text("New project"), button:has-text("New project")').first();
  await newProjectLocator.waitFor({ timeout: 30000 });
  await newProjectLocator.click();
});
