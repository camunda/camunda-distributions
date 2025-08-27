import { test, expect } from '@playwright/test';

test('Validate login page', async ({ page }) => {
  test.setTimeout(60000);
  
  await page.goto('http://localhost:8088/operate');
  
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  await page.getByPlaceholder('Username').click();
  await page.getByPlaceholder('Username').fill('demo');
  await page.getByPlaceholder('Password').click();
  await page.getByPlaceholder('Password').fill('demo');
  await page.getByRole('button', { name: 'Login' }).click();
});
