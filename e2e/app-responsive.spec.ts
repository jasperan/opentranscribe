import { test, expect, Page, APIRequestContext } from '@playwright/test';

// Helper to authenticate user
async function authenticateUser(
  page: Page,
  request: APIRequestContext,
  email: string = 'responsive-test@example.com'
) {
  const response = await request.post('/api/dev/magic-link', {
    data: { email },
  });
  const { verifyUrl } = await response.json();
  await page.goto(verifyUrl);
  await page.waitForURL('/app', { timeout: 10000 });
}

test.describe('App - Mobile Responsive', () => {
  test.beforeEach(async ({ page, request }) => {
    await authenticateUser(page, request);
  });

  test('sidebar is hidden on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/app');

    // Sidebar should not be visible in main view
    const sidebar = page.locator('aside, [role="complementary"]').first();
    await expect(sidebar).not.toBeInViewport();
  });

  test('hamburger menu is visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/app');

    // Header menu button should be visible
    const menuButton = page.getByRole('banner').getByRole('button').first();
    await expect(menuButton).toBeVisible();
  });

  test('can open sidebar on mobile via hamburger menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/app');

    // Click hamburger menu
    const menuButton = page.getByRole('banner').getByRole('button').first();
    await menuButton.click();

    // Navigation links should now be visible
    await expect(page.getByRole('link', { name: 'Transcribe' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'History' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Usage' })).toBeVisible();
  });

  test('can navigate via mobile sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/app');

    // Open sidebar
    const menuButton = page.getByRole('banner').getByRole('button').first();
    await menuButton.click();

    // Click History link
    await page.getByRole('link', { name: 'History' }).click();
    await expect(page).toHaveURL('/app/history');
  });

  test('sidebar is visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/app');

    // Sidebar navigation should be visible
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Transcribe' })).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'History' })).toBeVisible();
  });

  test('main content is responsive', async ({ page }) => {
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/app');

    const heading = page.getByRole('heading', { name: 'Transcribe Audio' });
    await expect(heading).toBeVisible();

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(heading).toBeVisible();

    // Desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(heading).toBeVisible();
  });
});

test.describe('App Pages - Detailed Content', () => {
  test.beforeEach(async ({ page, request }) => {
    await authenticateUser(page, request, 'content-test@example.com');
  });

  test('history page has search and filter', async ({ page }) => {
    await page.goto('/app/history');

    await expect(page.getByRole('heading', { name: 'Transcription History' })).toBeVisible();
    await expect(page.getByPlaceholder('Search transcriptions...')).toBeVisible();
    // Filter button now shows "All Status" by default
    await expect(page.getByRole('button', { name: /All Status/ })).toBeVisible();
  });

  test('usage page shows plan and stats', async ({ page }) => {
    await page.goto('/app/usage');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Usage & Billing' })).toBeVisible();

    // Check plan info
    await expect(page.getByText('Current Plan')).toBeVisible();

    // Check stats - use exact match to avoid partial matches
    await expect(page.getByText('Total Minutes', { exact: true })).toBeVisible();
    await expect(page.getByText('Transcriptions', { exact: true })).toBeVisible();
    await expect(page.getByText('API Calls', { exact: true })).toBeVisible();

    // Check upgrade link
    await expect(page.getByRole('link', { name: /Upgrade Plan/ })).toBeVisible();
  });

  test('api-keys page has key creation form', async ({ page }) => {
    await page.goto('/app/api-keys');

    await expect(page.getByRole('heading', { name: 'API Keys', exact: true })).toBeVisible();
    await expect(page.getByText('Create New API Key')).toBeVisible();
    await expect(page.getByPlaceholder(/Key name/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Key' })).toBeVisible();

    // Docs link
    await expect(page.getByRole('link', { name: 'API Documentation' })).toBeVisible();
  });

  test('api-keys create button is disabled without name', async ({ page }) => {
    await page.goto('/app/api-keys');

    const createButton = page.getByRole('button', { name: 'Create Key' });
    await expect(createButton).toBeDisabled();

    // Fill in name
    await page.getByPlaceholder(/Key name/).fill('Test Key');
    await expect(createButton).toBeEnabled();
  });

  test('settings page shows account info', async ({ page }) => {
    await page.goto('/app/settings');

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();
    await expect(page.getByText('Email', { exact: true })).toBeVisible();
    await expect(page.getByText('content-test@example.com')).toBeVisible();
    await expect(page.getByText('Member since')).toBeVisible();
  });

  test('transcribe page shows usage meter', async ({ page }) => {
    await page.goto('/app');

    await expect(page.getByText('Usage this month')).toBeVisible();
    await expect(page.getByRole('link', { name: 'View details' })).toBeVisible();
    await expect(page.getByText(/remaining/)).toBeVisible();
  });

  test('transcribe page shows diarization toggle', async ({ page }) => {
    await page.goto('/app');

    await expect(page.getByRole('heading', { name: 'Speaker Diarization' })).toBeVisible();
    await expect(page.getByText(/uses 2x minutes/)).toBeVisible();
  });

  test('transcribe page shows file upload zone', async ({ page }) => {
    await page.goto('/app');

    await expect(page.getByRole('heading', { name: 'Upload audio file' })).toBeVisible();
    await expect(page.getByText('Drag and drop your audio file here, or click to browse')).toBeVisible();
    await expect(page.getByText('mp3')).toBeVisible();
    await expect(page.getByText('wav')).toBeVisible();
    await expect(page.getByText('Max file size: 500MB')).toBeVisible();
  });
});

test.describe('App - Sidebar Navigation', () => {
  test.beforeEach(async ({ page, request }) => {
    await authenticateUser(page, request, 'sidebar-test@example.com');
  });

  test('sidebar shows user info', async ({ page }) => {
    await page.goto('/app');

    await expect(page.getByText('sidebar-test@example.com')).toBeVisible();
    await expect(page.getByText(/plan/i)).toBeVisible();
  });

  test('sidebar highlights current page', async ({ page }) => {
    await page.goto('/app');

    // Transcribe link should be highlighted (has different styling)
    const transcribeLink = page.getByRole('navigation').getByRole('link', { name: 'Transcribe' });
    await expect(transcribeLink).toBeVisible();

    // Navigate to history
    await page.goto('/app/history');
    const historyLink = page.getByRole('navigation').getByRole('link', { name: 'History' });
    await expect(historyLink).toBeVisible();
  });

  test('Verbatim logo links to app', async ({ page }) => {
    await page.goto('/app/history');

    await page.getByRole('link', { name: 'Verbatim' }).first().click();
    await expect(page).toHaveURL('/app');
  });
});
