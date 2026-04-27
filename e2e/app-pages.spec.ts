import { test, expect } from '@playwright/test';

test.describe('App Pages (Require Auth)', () => {
  // These pages require authentication, so we test that they redirect properly

  test('history page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/app/history');
    await expect(page).toHaveURL('/login');
  });

  test('usage page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/app/usage');
    await expect(page).toHaveURL('/login');
  });

  test('api-keys page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/app/api-keys');
    await expect(page).toHaveURL('/login');
  });

  test('settings page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/app/settings');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Dev Magic Link Flow', () => {
  test('can create magic link via dev API', async ({ request }) => {
    const response = await request.post('/api/dev/magic-link', {
      data: { email: 'playwright@test.com' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeTruthy();
    expect(body.verifyUrl).toContain('/verify?token=');
  });

  test('full auth flow with dev magic link', async ({ page, request }) => {
    // Get magic link
    const response = await request.post('/api/dev/magic-link', {
      data: { email: 'e2e-test@example.com' },
    });
    const { verifyUrl } = await response.json();

    // Navigate to verify URL
    await page.goto(verifyUrl);

    // Wait for redirect to app
    await page.waitForURL('/app', { timeout: 10000 });

    // Verify we're on the app page
    await expect(page.getByRole('heading', { name: 'Convert audio into a reviewable transcript.' })).toBeVisible();

    // Verify user info is shown
    await expect(page.getByText('e2e-test@example.com')).toBeVisible();
  });

  test('authenticated user can access history page', async ({ page, request }) => {
    // Authenticate
    const response = await request.post('/api/dev/magic-link', {
      data: { email: 'history-test@example.com' },
    });
    const { verifyUrl } = await response.json();
    await page.goto(verifyUrl);
    await page.waitForURL('/app', { timeout: 10000 });

    // Navigate to history
    await page.getByRole('link', { name: 'History' }).click();
    await expect(page).toHaveURL('/app/history');
    await expect(page.getByRole('heading', { name: 'Transcription History' })).toBeVisible();
  });

  test('authenticated user can access usage page', async ({ page, request }) => {
    // Authenticate
    const response = await request.post('/api/dev/magic-link', {
      data: { email: 'usage-test@example.com' },
    });
    const { verifyUrl } = await response.json();
    await page.goto(verifyUrl);
    await page.waitForURL('/app', { timeout: 10000 });

    // Navigate to usage
    await page.getByRole('link', { name: 'Usage' }).click();
    await expect(page).toHaveURL('/app/usage');
    await expect(page.getByRole('heading', { name: 'Usage & Billing' })).toBeVisible();
  });

  test('authenticated user can access api-keys page', async ({ page, request }) => {
    // Authenticate
    const response = await request.post('/api/dev/magic-link', {
      data: { email: 'apikeys-test@example.com' },
    });
    const { verifyUrl } = await response.json();
    await page.goto(verifyUrl);
    await page.waitForURL('/app', { timeout: 10000 });

    // Navigate to API keys
    await page.getByRole('link', { name: 'API Keys' }).click();
    await expect(page).toHaveURL('/app/api-keys');
    await expect(page.getByRole('heading', { name: 'API Keys', exact: true })).toBeVisible();
  });

  test('authenticated user can access settings page', async ({ page, request }) => {
    // Authenticate
    const response = await request.post('/api/dev/magic-link', {
      data: { email: 'settings-test@example.com' },
    });
    const { verifyUrl } = await response.json();
    await page.goto(verifyUrl);
    await page.waitForURL('/app', { timeout: 10000 });

    // Navigate to settings
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL('/app/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('user can sign out', async ({ page, request }) => {
    // Authenticate
    const response = await request.post('/api/dev/magic-link', {
      data: { email: 'signout-test@example.com' },
    });
    const { verifyUrl } = await response.json();
    await page.goto(verifyUrl);
    await page.waitForURL('/app', { timeout: 10000 });

    // Click sign out
    await page.getByRole('button', { name: 'Sign out' }).click();

    // Should redirect to home
    await expect(page).toHaveURL('/');
  });
});
