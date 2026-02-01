import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';

// Helper: Register and login
async function registerAndLogin(page: any, username: string, password: string) {
  await page.goto(BASE_URL);

  // Register
  await page.getByText(/Don't have an account/).click();
  await page.getByPlaceholder('Choose a username').fill(username);
  await page.getByPlaceholder('At least 6 characters').fill(password);
  await page.getByRole('button', { name: /Register/ }).click();
  await page.waitForTimeout(500);
}

async function createProject(page: any, projectName: string) {
  // Click create project button
  const createButton = page.getByText(/Create Your First Project|New Project/).first();
  await createButton.click();

  // Fill form
  await page.getByPlaceholder(/My Awesome Project|Project name/i).fill(projectName);
  await page.getByRole('button', { name: /Create Project/ }).click();
  await page.waitForTimeout(500);
}

test.describe('Project Management', () => {
  const timestamp = Date.now();
  const username = `testuser_${timestamp}`;
  const password = 'Test123!';

  test('complete project workflow', async ({ page }) => {
    // Register user
    await registerAndLogin(page, username, password);

    // Create first project
    await createProject(page, 'Project 1');
    await expect(page.getByText('Project 1')).toBeVisible();

    // Create second project
    await createProject(page, 'Project 2');
    await expect(page.getByText('Project 2')).toBeVisible();

    // Select and login to first project
    await page.getByText('Project 1').click();
    await page.getByPlaceholder('Enter your username').fill(username);
    await page.getByPlaceholder('Enter your password').fill(password);
    await page.getByRole('button', { name: /Sign In/ }).click();

    // Should enter editor
    await expect(page).toHaveURL(/\/editor\/\d+/);

    // Verify editor loaded
    await expect(page.getByText(username)).toBeVisible(); // User menu
  });

  test('should display project list after login', async ({ page }) => {
    await registerAndLogin(page, `user_${Date.now()}`, password);
    await createProject(page, 'Test Project');

    // Verify project card is displayed
    const projectCard = page.getByText('Test Project');
    await expect(projectCard).toBeVisible();

    // Verify project has update date
    await expect(page.getByText(/Updated/)).toBeVisible();
  });

  test('should highlight selected project', async ({ page }) => {
    await registerAndLogin(page, `user_${Date.now()}`, password);
    await createProject(page, 'Test Project');

    const projectCard = page.getByText('Test Project').locator('..');

    // Click to select
    await projectCard.click();

    // Should have selected styling (blue border)
    await expect(projectCard).toHaveClass(/border-blue-500/);
  });
});
