import { test, expect } from '@playwright/test';

test.describe('Application', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/');

    // Title should be set
    await expect(page).toHaveTitle(/OpenTranscribe/i);

    // Main content should be visible
    await expect(page.locator('text=OpenTranscribe')).toBeVisible();
  });

  test('has correct footer', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('text=Created by')).toBeVisible();
    await expect(page.locator('text=jasperan')).toBeVisible();
  });

  test('status bar is visible', async ({ page }) => {
    await page.goto('/');

    // Status bar should show backend status
    await expect(page.locator('text=Backend:')).toBeVisible();
  });

  test('theme toggle buttons are visible', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('[title="Light theme"]')).toBeVisible();
    await expect(page.locator('[title="Dark theme"]')).toBeVisible();
    await expect(page.locator('[title="System theme"]')).toBeVisible();
  });

  test('keyboard shortcut hint is visible in web mode', async ({ page }) => {
    await page.goto('/');

    // In web mode, the shortcut hint should not be visible (Electron only)
    // This is a negative test - the hint should NOT appear in browser
    const shortcutHint = page.locator('text=Ctrl+Shift+T');
    // Count should be 0 in web mode
    await expect(shortcutHint).toHaveCount(0);
  });
});
