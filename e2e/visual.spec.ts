import { test, expect } from '@playwright/test';

// Visual regression tests - run with --update-snapshots first time
test.describe('Visual Regression', () => {
  test('landing page visual', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for animations to complete
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('landing-page.png', {
      fullPage: true,
      threshold: 0.3,
      maxDiffPixelRatio: 0.1,
    });
  });

  test('login page visual', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      threshold: 0.3,
      maxDiffPixelRatio: 0.1,
    });
  });

  test('login success state visual', async ({ page }) => {
    await page.route('/api/auth/send-link', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('test@example.com');
    await page.getByRole('button', { name: 'Continue with email' }).click();

    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('login-success.png', {
      fullPage: true,
      threshold: 0.3,
      maxDiffPixelRatio: 0.1,
    });
  });

  test('verify error state visual', async ({ page }) => {
    await page.goto('/verify');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('verify-error.png', {
      fullPage: true,
      threshold: 0.3,
      maxDiffPixelRatio: 0.1,
    });
  });
});

test.describe('Dark Mode', () => {
  test('landing page is in dark mode by default', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
  });

  test('login page is in dark mode by default', async ({ page }) => {
    await page.goto('/login');

    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
  });

  test('verify page is in dark mode by default', async ({ page }) => {
    await page.goto('/verify');

    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
  });

  test('background color is correct for dark mode', async ({ page }) => {
    await page.goto('/');

    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => getComputedStyle(el).backgroundColor);

    // Should be a dark background (check for low RGB values)
    // Parse rgb(r, g, b) format
    const match = bgColor.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/);
    if (match) {
      const [, r, g, b] = match.map(Number);
      // All values should be low (dark theme)
      expect(r).toBeLessThan(50);
      expect(g).toBeLessThan(50);
      expect(b).toBeLessThan(50);
    }
  });
});

test.describe('Responsive Design', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'wide', width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`landing page at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Hero should be visible
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // Navigation should be visible
      await expect(page.getByText('Verbatim').first()).toBeVisible();
    });
  }

  for (const viewport of viewports) {
    test(`login page at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Form should be visible
      await expect(page.getByRole('heading', { name: 'Sign in to Verbatim' })).toBeVisible();
      await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    });
  }
});
