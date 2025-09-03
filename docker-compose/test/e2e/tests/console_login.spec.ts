import { test, expect } from '@playwright/test';

test('Validate login page', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('http://localhost:8087/');
  await page.getByRole('heading', { name: 'Log in' }).waitFor();
  await page.getByLabel('Username or email').click();
  await page.getByLabel('Username or email').fill('demo');
  await page.getByLabel('Password').click();
  await page.getByLabel('Password').fill('demo');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByText('Cluster health').waitFor();
});
