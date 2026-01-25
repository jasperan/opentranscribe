import { test, expect } from '@playwright/test';

test.describe('Navigation Flow', () => {
  test('complete sign-up flow: landing -> login -> (verify)', async ({ page }) => {
    // Start at landing page
    await page.goto('/');
    await expect(page).toHaveTitle(/Verbatim/);

    // Click Get Started (use nav scope to avoid duplicate matches)
    const nav = page.locator('nav');
    await nav.getByRole('link', { name: 'Get Started' }).click();
    await expect(page).toHaveURL('/login');

    // Verify login page loaded
    await expect(page.getByRole('heading', { name: 'Sign in to Verbatim' })).toBeVisible();
  });

  test('landing page CTA buttons work correctly', async ({ page }) => {
    await page.goto('/');

    // Test "Start for free" button
    await page.getByRole('link', { name: 'Start for free' }).click();
    await expect(page).toHaveURL('/login');

    // Go back to landing
    await page.goto('/');

    // Test pricing tier CTA buttons
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    const ctaButtons = page.locator('#pricing').getByRole('link');
    const firstCta = ctaButtons.first();
    await firstCta.click();
    await expect(page).toHaveURL('/login');
  });

  test('login back button returns to landing', async ({ page }) => {
    await page.goto('/login');

    // On desktop, the Verbatim logo links back to home
    // On mobile, there's a "Back" link
    const verbatimLink = page.getByRole('link', { name: 'Verbatim' });
    const backLink = page.getByRole('link', { name: 'Back' });

    const hasVerbatimLink = await verbatimLink.isVisible();
    if (hasVerbatimLink) {
      await verbatimLink.click();
    } else {
      await backLink.click();
    }
    await page.waitForURL('/', { timeout: 15000 });
    await expect(page).toHaveURL('/');
  });

  test('verify page Try again goes to login', async ({ page }) => {
    await page.goto('/verify');

    // Wait for error state (no token)
    await expect(page.getByRole('heading', { name: 'Verification failed' })).toBeVisible();

    await page.getByRole('link', { name: 'Try again' }).click();
    await page.waitForURL('/login', { timeout: 15000 });
    await expect(page).toHaveURL('/login');
  });
});

test.describe('404 and Error Pages', () => {
  test('non-existent page shows 404', async ({ page }) => {
    const response = await page.goto('/non-existent-page');

    // Next.js returns 404 for non-existent pages
    expect(response?.status()).toBe(404);
  });
});

test.describe('Deep Linking', () => {
  test('can directly access landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Verbatim/);
  });

  test('can directly access login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to Verbatim' })).toBeVisible();
  });

  test('can directly access verify page', async ({ page }) => {
    await page.goto('/verify');
    // Should show error since no token
    await expect(page.getByRole('heading', { name: 'Verification failed' })).toBeVisible();
  });

  test('verify page with token parameter', async ({ page }) => {
    await page.route('/api/auth/verify*', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid token' }),
      });
    });

    await page.goto('/verify?token=some-test-token');
    await expect(page.getByRole('heading', { name: 'Verification failed' })).toBeVisible();
  });
});
