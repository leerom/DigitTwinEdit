import { test, expect } from '@playwright/test';

test('layout renders correctly on different viewport sizes', async ({ page }) => {
  await page.goto('/');

  // Check 1920x1080 (Desktop)
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page.getByText('Hierarchy')).toBeVisible();
  await expect(page.getByText('Inspector')).toBeVisible();
  await expect(page.getByText('Project')).toBeVisible();

  // Check 1366x768 (Laptop)
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.getByText('Hierarchy')).toBeVisible();
  await expect(page.getByText('Inspector')).toBeVisible();

  // Check visibility of key UI elements
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByTitle('Hand Tool (Q)')).toBeVisible();
});
