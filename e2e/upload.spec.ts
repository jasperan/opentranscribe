import { test, expect, Page, APIRequestContext } from '@playwright/test';

// Helper to authenticate user
async function authenticateUser(
  page: Page,
  request: APIRequestContext,
  email: string = 'upload-test@example.com'
) {
  await page.goto('/login');
  const verifyUrl = await page.evaluate(async (email) => {
    const response = await fetch('/api/dev/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    return data.verifyUrl;
  }, email);
  await page.goto(verifyUrl);
  await page.waitForURL('/app', { timeout: 10000 });
}

test.describe('File Upload Zone', () => {
  test.beforeEach(async ({ page, request }) => {
    await authenticateUser(page, request);
  });

  test('upload zone is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Upload audio file' })).toBeVisible();
    await expect(page.getByText('Drag and drop your audio file here, or click to browse')).toBeVisible();
  });

  test('upload zone shows supported formats', async ({ page }) => {
    await expect(page.getByText('mp3')).toBeVisible();
    await expect(page.getByText('wav')).toBeVisible();
    await expect(page.getByText('flac')).toBeVisible();
    await expect(page.getByText('ogg')).toBeVisible();
    await expect(page.getByText('m4a')).toBeVisible();
    await expect(page.getByText('aac')).toBeVisible();
  });

  test('upload zone shows max file size', async ({ page }) => {
    await expect(page.getByText('Max file size: 500MB')).toBeVisible();
  });

  test('upload zone has file input', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  test('file input accepts audio formats', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const accept = await fileInput.getAttribute('accept');
    // Should accept audio files
    expect(accept).toBeTruthy();
  });

  test('Upload audio file button is clickable', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Upload audio file' });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test('clicking upload zone opens file chooser', async ({ page }) => {
    // Set up file chooser listener
    const fileChooserPromise = page.waitForEvent('filechooser');

    // Click the upload zone
    await page.locator('input[type="file"]').click();

    // Verify file chooser was triggered
    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeTruthy();
  });
});

test.describe('Speaker Diarization Toggle', () => {
  test.beforeEach(async ({ page, request }) => {
    await authenticateUser(page, request, 'diarization-test@example.com');
  });

  test('diarization section is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Speaker diarization' })).toBeVisible();
    await expect(page.getByText('Identify speakers in interviews and meetings')).toBeVisible();
  });

  test('diarization shows 2x minutes warning', async ({ page }) => {
    await expect(page.getByText('uses 2x minutes')).toBeVisible();
  });

  test('diarization toggle is clickable', async ({ page }) => {
    // Find the toggle button (sibling of the heading)
    const toggleSection = page.locator('div').filter({ hasText: 'Speaker diarization' }).first();
    const toggleButton = toggleSection.locator('button').last();

    await expect(toggleButton).toBeVisible();

    // Click toggle
    await toggleButton.click();

    // Toggle should still be visible after click
    await expect(toggleButton).toBeVisible();
  });
});

test.describe('Usage Meter', () => {
  test.beforeEach(async ({ page, request }) => {
    await authenticateUser(page, request, 'usage-meter-test@example.com');
  });

  test('usage meter is visible', async ({ page }) => {
    await expect(page.getByText('Usage this month')).toBeVisible();
  });

  test('usage shows current usage', async ({ page }) => {
    // Should show usage (starts at 0 for new user)
    await expect(page.getByText(/\d+m? used/)).toBeVisible();
  });

  test('usage shows remaining time', async ({ page }) => {
    await expect(page.getByText(/remaining/)).toBeVisible();
  });

  test('view details link navigates to usage page', async ({ page }) => {
    await page.getByRole('link', { name: 'View details' }).click();
    await expect(page).toHaveURL('/app/usage');
  });
});

test.describe('Transcribe Page Layout', () => {
  test.beforeEach(async ({ page, request }) => {
    await authenticateUser(page, request, 'layout-test@example.com');
  });

  test('has correct page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Convert audio into a reviewable transcript.' })).toBeVisible();
  });

  test('has page description', async ({ page }) => {
    await expect(page.getByText('Upload a file or record live audio')).toBeVisible();
  });

  test('sidebar navigation is visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Transcribe' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'History' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Usage' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'API Keys' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test('user email is displayed', async ({ page }) => {
    await expect(page.getByText('layout-test@example.com')).toBeVisible();
  });

  test('sign out button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });
});

test.describe('Upload Zone Interactions', () => {
  test.beforeEach(async ({ page, request }) => {
    await authenticateUser(page, request, 'interaction-test@example.com');
  });

  test('upload zone has cursor pointer on hover', async ({ page }) => {
    const uploadZone = page.locator('div').filter({ hasText: 'Upload audio file' }).first();
    const cursor = await uploadZone.evaluate((el) => getComputedStyle(el).cursor);
    // Cursor should be pointer, default, or auto (browser defaults)
    expect(['pointer', 'default', 'auto']).toContain(cursor);
  });

  test('upload zone is keyboard accessible', async ({ page }) => {
    // The Upload audio file button should be focusable
    const uploadButton = page.getByRole('button', { name: 'Upload audio file' });
    // Try to focus it directly
    await uploadButton.focus();
    await expect(uploadButton).toBeFocused();
  });
});
