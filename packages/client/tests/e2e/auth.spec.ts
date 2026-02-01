import { test, expect } from '@playwright/test';

// Note: These tests require a running backend server and database
// Set TEST_BASE_URL and TEST_API_URL in environment or use defaults

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.TEST_API_URL || 'http://localhost:3001/api';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(BASE_URL);
  });

  test('should redirect to login page by default', async ({ page }) => {
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display login page elements', async ({ page }) => {
    await expect(page.getByText('Digital Twin Editor')).toBeVisible();
    await expect(page.getByText('Sign In')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your username')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
  });

  test('should open register dialog', async ({ page }) => {
    await page.getByText(/Don't have an account/).click();

    await expect(page.getByText('Create Account')).toBeVisible();
    await expect(page.getByPlaceholder('Choose a username')).toBeVisible();
  });

  test('should register new user', async ({ page }) => {
    const timestamp = Date.now();
    const username = `testuser_${timestamp}`;

    // Open register dialog
    await page.getByText(/Don't have an account/).click();

    // Fill registration form
    await page.getByPlaceholder('Choose a username').fill(username);
    await page.getByPlaceholder('At least 6 characters').fill('Test123!');

    // Submit
    await page.getByRole('button', { name: /Register/ }).click();

    // Wait for dialog to close
    await expect(page.getByText('Create Account')).not.toBeVisible();
  });

  test('should create project and login', async ({ page }) => {
    const timestamp = Date.now();
    const username = `testuser_${timestamp}`;

    // Register
    await page.getByText(/Don't have an account/).click();
    await page.getByPlaceholder('Choose a username').fill(username);
    await page.getByPlaceholder('At least 6 characters').fill('Test123!');
    await page.getByRole('button', { name: /Register/ }).click();

    // Wait for registration to complete
    await page.waitForTimeout(1000);

    // Create project
    await page.getByText(/Create Your First Project|New Project/).first().click();
    await page.getByPlaceholder(/My Awesome Project|Project name/i).fill('Test Project');
    await page.getByRole('button', { name: /Create Project/ }).click();

    // Wait for project to be created
    await page.waitForTimeout(1000);

    // Select project and login
    await page.getByText('Test Project').click();
    await page.getByPlaceholder('Enter your username').fill(username);
    await page.getByPlaceholder('Enter your password').fill('Test123!');
    await page.getByRole('button', { name: /Sign In/ }).click();

    // Should redirect to editor
    await expect(page).toHaveURL(/\/editor\/\d+/);
  });

  test('should show error with wrong password', async ({ page }) => {
    // Assuming there's a test user created
    // This test might need manual setup or skip if no user exists

    await page.getByPlaceholder('Enter your username').fill('nonexistent');
    await page.getByPlaceholder('Enter your password').fill('WrongPass');

    // Need to select a project first - skip if no projects
    const projectCards = await page.getByRole('button').filter({ hasText: /.+/ }).count();
    if (projectCards === 0) {
      test.skip();
      return;
    }

    await page.getByRole('button').first().click(); // Select first project
    await page.getByRole('button', { name: /Sign In/ }).click();

    // Should show error
    await expect(page.getByText(/Invalid|Error|Failed/i)).toBeVisible();
  });

  test('should remember login with Remember Me', async ({ page, context }) => {
    // This test requires a pre-existing user
    test.skip(); // Skip for now - needs test database setup
  });
});
