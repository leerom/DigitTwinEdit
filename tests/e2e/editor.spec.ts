import { test, expect } from '@playwright/test';

test('editor loads successfully', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Verify Header
  await expect(page.getByText('DigitalTwinEditor')).toBeVisible();

  // Verify Panels
  await expect(page.getByText('HIERARCHY')).toBeVisible();
  await expect(page.getByText('INSPECTOR')).toBeVisible();
  await expect(page.getByText('PROJECT / ASSETS')).toBeVisible();

  // Verify Canvas
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
});
