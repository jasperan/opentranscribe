import { test, expect } from '@playwright/test';

test.describe('Theme System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('default theme renders correctly', async ({ page }) => {
    // Check that the app loads
    await expect(page.locator('text=OpenTranscribe')).toBeVisible();

    // Take screenshot of default state
    await expect(page).toHaveScreenshot('default-theme.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test('dark mode renders correctly', async ({ page }) => {
    // Click dark theme button in status bar
    await page.click('[title="Dark theme"]');

    // Verify theme attribute
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Take screenshot
    await expect(page).toHaveScreenshot('dark-theme.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test('light mode renders correctly', async ({ page }) => {
    // Click light theme button in status bar
    await page.click('[title="Light theme"]');

    // Verify theme attribute
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Take screenshot
    await expect(page).toHaveScreenshot('light-theme.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test('theme persists across page reload', async ({ page }) => {
    // Set dark theme
    await page.click('[title="Dark theme"]');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Reload page
    await page.reload();

    // Theme should persist
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
