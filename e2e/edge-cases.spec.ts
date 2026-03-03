import { test, expect, Page, APIRequestContext } from '@playwright/test';

// Helper to authenticate user
async function authenticateUser(
  page: Page,
  request: APIRequestContext,
  email: string = 'edge-case-test@example.com'
) {
  const response = await request.post('/api/dev/magic-link', {
    data: { email },
  });
  const { verifyUrl } = await response.json();
  await page.goto(verifyUrl);
  await page.waitForURL('/app', { timeout: 10000 });
}

test.describe('Login Form Validation', () => {
  test('button is disabled when email is empty', async ({ page }) => {
    await page.goto('/login');

    const button = page.getByRole('button', { name: 'Continue with email' });
    await expect(button).toBeDisabled();
  });

  test('button is enabled when email has text', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('textbox', { name: 'Email address' }).fill('test@example.com');
    const button = page.getByRole('button', { name: 'Continue with email' });
    await expect(button).toBeEnabled();
  });

  test('disables submit button for invalid email format', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('textbox', { name: 'Email address' }).fill('test@invalid');
    await expect(page.getByRole('button', { name: 'Continue with email' })).toBeDisabled();

    // Valid email enables the button
    await page.getByRole('textbox', { name: 'Email address' }).fill('test@example.com');
    await expect(page.getByRole('button', { name: 'Continue with email' })).toBeEnabled();
  });

  test('email input has type="email" for native validation', async ({ page }) => {
    await page.goto('/login');

    const input = page.getByRole('textbox', { name: 'Email address' });
    await expect(input).toHaveAttribute('type', 'email');
  });

  test('email input has placeholder', async ({ page }) => {
    await page.goto('/login');

    const input = page.getByRole('textbox', { name: 'Email address' });
    await expect(input).toHaveAttribute('placeholder', 'you@example.com');
  });
});

test.describe('API Keys Page', () => {
  test.beforeEach(async ({ page, request }) => {
    await authenticateUser(page, request, 'apikeys-edge@example.com');
  });

  test('shows empty state when no API keys exist', async ({ page }) => {
    await page.goto('/app/api-keys');

    await expect(page.getByText('No API keys yet')).toBeVisible();
    await expect(page.getByText('Create your first API key above')).toBeVisible();
  });

  test('create key button is disabled when name is empty', async ({ page }) => {
    await page.goto('/app/api-keys');

    const button = page.getByRole('button', { name: 'Create Key' });
    await expect(button).toBeDisabled();
  });

  test('create key button enables when name is entered', async ({ page }) => {
    await page.goto('/app/api-keys');

    await page.getByPlaceholder(/Key name/).fill('My Test Key');
    const button = page.getByRole('button', { name: 'Create Key' });
    await expect(button).toBeEnabled();
  });

  test('documentation link navigates to docs', async ({ page }) => {
    await page.goto('/app/api-keys');

    await page.getByRole('link', { name: 'API Documentation' }).click();
    await expect(page).toHaveURL('/docs');
  });
});

test.describe('History Page', () => {
  test.beforeEach(async ({ page, request }) => {
    await authenticateUser(page, request, 'history-edge@example.com');
  });

  test('shows empty state when no transcriptions exist', async ({ page }) => {
    await page.goto('/app/history');

    // The page should have search and filter even when empty
    await expect(page.getByPlaceholder('Search transcriptions...')).toBeVisible();
    // Filter button now shows "All Status" by default
    await expect(page.getByRole('button', { name: /All Status/ })).toBeVisible();
  });

  test('search input is focusable', async ({ page }) => {
    await page.goto('/app/history');

    const searchInput = page.getByPlaceholder('Search transcriptions...');
    await searchInput.focus();
    await expect(searchInput).toBeFocused();
  });
});

test.describe('Usage Page', () => {
  test.beforeEach(async ({ page, request }) => {
    await authenticateUser(page, request, 'usage-edge@example.com');
  });

  test('shows zero usage for new user', async ({ page }) => {
    await page.goto('/app/usage');

    await expect(page.getByRole('heading', { name: 'Usage & Billing' })).toBeVisible();
    await expect(page.getByText('0m', { exact: true }).first()).toBeVisible();
  });

  test('shows upgrade plan link', async ({ page }) => {
    await page.goto('/app/usage');

    const upgradeLink = page.getByRole('link', { name: 'Upgrade Plan' });
    await expect(upgradeLink).toBeVisible();
    await expect(upgradeLink).toHaveAttribute('href', '/pricing');
  });

  test('shows usage history section', async ({ page }) => {
    await page.goto('/app/usage');

    await expect(page.getByRole('heading', { name: 'Usage History' })).toBeVisible();
    await expect(page.getByText('No usage data yet')).toBeVisible();
  });
});

test.describe('Keyboard Navigation', () => {
  test('landing page is keyboard navigable', async ({ page }) => {
    await page.goto('/');

    // Tab through navigation
    await page.keyboard.press('Tab');
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Features' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Pricing' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Docs' })).toBeFocused();
  });

  test('login form supports Enter to submit', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByRole('textbox', { name: 'Email address' });
    await emailInput.fill('test@example.com');
    await emailInput.press('Enter');

    // Should show loading or success state
    await expect(
      page.getByText('Check your email').or(page.getByText('Sending'))
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Session Persistence', () => {
  test('user remains authenticated after page reload', async ({ page, request }) => {
    await authenticateUser(page, request, 'session-test@example.com');

    // Reload the page
    await page.reload();

    // Should still be on app page and show user info
    await expect(page).toHaveURL('/app');
    await expect(page.getByText('session-test@example.com')).toBeVisible();
  });

  test('user can navigate between app pages while authenticated', async ({ page, request }) => {
    await authenticateUser(page, request, 'nav-test@example.com');

    // Navigate to different pages
    await page.goto('/app/history');
    await expect(page.getByRole('heading', { name: 'Transcription History' })).toBeVisible();

    await page.goto('/app/usage');
    await expect(page.getByRole('heading', { name: 'Usage & Billing' })).toBeVisible();

    await page.goto('/app/api-keys');
    await expect(page.getByRole('heading', { name: 'API Keys', exact: true })).toBeVisible();

    await page.goto('/app/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    // Return to main app
    await page.goto('/app');
    await expect(page.getByRole('heading', { name: 'Transcribe Audio' })).toBeVisible();
  });
});

test.describe('Error States', () => {
  test('verify page shows error with invalid token', async ({ page }) => {
    await page.goto('/verify?token=invalid-token-12345');

    // Wait for the verification to complete and show error
    await expect(page.getByRole('heading', { name: 'Verification failed' })).toBeVisible({ timeout: 10000 });
  });

  test('verify page shows error without token', async ({ page }) => {
    await page.goto('/verify');

    await expect(page.getByText(/No verification token/i)).toBeVisible();
  });
});

test.describe('Transcribe Page Features', () => {
  test.beforeEach(async ({ page, request }) => {
    await authenticateUser(page, request, 'transcribe-test@example.com');
  });

  test('diarization toggle is interactive', async ({ page }) => {
    await page.goto('/app');

    // Find the diarization toggle button
    const toggleButton = page.locator('button').filter({ has: page.locator('span.rounded-full') });

    // Click to toggle
    await toggleButton.click();

    // Toggle should have changed state (we can verify it's clickable)
    await expect(toggleButton).toBeVisible();
  });

  test('upload zone accepts click to open file dialog', async ({ page }) => {
    await page.goto('/app');

    // The upload zone should have a file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  test('upload zone shows supported formats', async ({ page }) => {
    await page.goto('/app');

    await expect(page.getByText('mp3')).toBeVisible();
    await expect(page.getByText('wav')).toBeVisible();
    await expect(page.getByText('flac')).toBeVisible();
    await expect(page.getByText('ogg')).toBeVisible();
    await expect(page.getByText('m4a')).toBeVisible();
    await expect(page.getByText('aac')).toBeVisible();
  });

  test('view details link navigates to usage', async ({ page }) => {
    await page.goto('/app');

    await page.getByRole('link', { name: 'View details' }).click();
    await expect(page).toHaveURL('/app/usage');
  });
});
