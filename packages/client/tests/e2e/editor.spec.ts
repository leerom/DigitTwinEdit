import { test, expect } from '@playwright/test';

test('editor loads successfully', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Verify Header
  await expect(page.getByText('TWINENGINE')).toBeVisible();

  // Verify Panels
  await expect(page.getByText('层级视图 (Hierarchy)')).toBeVisible();
  await expect(page.getByText('属性检视器 (Inspector)')).toBeVisible();
  await expect(page.getByText('Assets', { exact: true })).toBeVisible();

  // Verify Canvas
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
});

test('delete selected cube should not crash UI (regression)', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // 打开“添加”菜单并添加立方体（按现有复现路径：添加 -> 3D对象 -> 立方体 (Cube)）
  await page.getByRole('button', { name: '添加' }).click();
  await page.getByRole('button', { name: '3D对象' }).click();
  await page.getByRole('button', { name: '立方体 (Cube)' }).click();

  // 在层级视图选中 Cube（名字可能重复，取第一个匹配）
  await page.getByText('Cube').first().click();

  // 触发删除并确认
  await page.keyboard.press('Delete');
  await page.getByRole('button', { name: '删除' }).click();

  // 关键断言：header / panels / canvas 仍存在（UI 未崩溃黑屏）
  await expect(page.getByText('TWINENGINE')).toBeVisible();
  await expect(page.getByText('层级视图 (Hierarchy)')).toBeVisible();
  await expect(page.getByText('属性检视器 (Inspector)')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
});
