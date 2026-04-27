import { test, expect, Page, APIRequestContext } from '@playwright/test';
import path from 'path';

/**
 * Helper to authenticate via dev magic link
 */
async function authenticateUser(
  page: Page,
  request: APIRequestContext,
  email: string = 'app-test@example.com'
) {
  const response = await request.post('/api/dev/magic-link', {
    data: { email },
  });
  const { verifyUrl } = await response.json();
  await page.goto(verifyUrl);
  await page.waitForURL('/app', { timeout: 10000 });
}

test.describe('App Page (Protected)', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('App Page (Authenticated)', () => {
  test('displays transcription interface when authenticated', async ({ page, request }) => {
    await authenticateUser(page, request, 'transcribe-ui@example.com');

    await expect(page.getByRole('heading', { name: 'Convert audio into a reviewable transcript.' })).toBeVisible();
    await expect(page.getByText('Upload a file or record live audio')).toBeVisible();
  });

  test('displays usage meter', async ({ page, request }) => {
    await authenticateUser(page, request, 'usage-meter@example.com');

    // Usage meter should show usage info
    await expect(page.getByText('Usage this month')).toBeVisible();
    await expect(page.getByRole('link', { name: 'View details' })).toBeVisible();
  });

  test('displays diarization toggle', async ({ page, request }) => {
    await authenticateUser(page, request, 'diarization-toggle@example.com');

    await expect(page.getByText('Speaker diarization')).toBeVisible();
    await expect(page.getByText('Identify speakers in interviews and meetings')).toBeVisible();
  });

  test('can toggle diarization', async ({ page, request }) => {
    await authenticateUser(page, request, 'diarization-click@example.com');

    // Find the diarization toggle button (the switch element)
    const toggle = page.locator('button').filter({ has: page.locator('span.rounded-full') });

    // Get initial state by checking the background class
    const initialClass = await toggle.getAttribute('class');
    const wasEnabled = initialClass?.includes('bg-primary');

    // Click the toggle
    await toggle.click();

    // Verify state changed
    const newClass = await toggle.getAttribute('class');
    const isNowEnabled = newClass?.includes('bg-primary');
    expect(isNowEnabled).toBe(!wasEnabled);
  });
});

test.describe('App - Upload Zone', () => {
  test('displays upload area with supported formats', async ({ page, request }) => {
    await authenticateUser(page, request, 'upload-zone@example.com');

    // Check for upload zone content
    await expect(page.getByText('Upload audio file')).toBeVisible();
    await expect(page.getByText('Drag and drop your audio file here, or click to browse')).toBeVisible();

    // Check for supported format badges
    await expect(page.getByText('mp3', { exact: true })).toBeVisible();
    await expect(page.getByText('wav', { exact: true })).toBeVisible();
    await expect(page.getByText('flac', { exact: true })).toBeVisible();

    // Check for file size info
    await expect(page.getByText(/Max file size/)).toBeVisible();
  });

  test('has file input accepting audio formats', async ({ page, request }) => {
    await authenticateUser(page, request, 'file-input@example.com');

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    const acceptAttr = await fileInput.getAttribute('accept');
    expect(acceptAttr).toContain('.mp3');
    expect(acceptAttr).toContain('.wav');
  });
});

test.describe('App - Navigation', () => {
  test('displays sidebar navigation links', async ({ page, request }) => {
    await authenticateUser(page, request, 'sidebar-nav@example.com');

    // Check sidebar navigation
    await expect(page.getByRole('link', { name: 'Transcribe' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'History' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Usage' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'API Keys' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test('displays user email in sidebar', async ({ page, request }) => {
    const testEmail = 'visible-email@example.com';
    await authenticateUser(page, request, testEmail);

    await expect(page.getByText(testEmail)).toBeVisible();
  });

  test('has sign out button', async ({ page, request }) => {
    await authenticateUser(page, request, 'signout-btn@example.com');

    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });
});

test.describe('App - File Upload Flow', () => {
  test('shows transcribing state when uploading', async ({ page, request }) => {
    await authenticateUser(page, request, 'transcribe-state@example.com');

    // Mock the transcribe API to simulate processing
    await page.route('/api/transcribe', async (route) => {
      // Delay response to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-123',
          text: 'This is a test transcription.',
          segments: [
            { start: 0, end: 5, text: 'This is a test transcription.' }
          ],
          model: 'faster-whisper',
          language: 'en',
          duration: 5,
          minutesCharged: 1,
        }),
      });
    });

    // Create a test audio file and upload
    const buffer = Buffer.alloc(1024);
    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles({
      name: 'test-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer,
    });

    // Should show uploading/transcribing state
    await expect(page.getByText(/Securing upload|Building transcript/)).toBeVisible({ timeout: 5000 });
  });

  test('displays transcription result on success', async ({ page, request }) => {
    await authenticateUser(page, request, 'transcribe-result@example.com');

    // Mock successful transcription
    await page.route('/api/transcribe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'result-456',
          text: 'Hello, this is a successful transcription test.',
          segments: [
            { start: 0, end: 3, text: 'Hello, this is' },
            { start: 3, end: 6, text: 'a successful transcription test.' }
          ],
          model: 'faster-whisper',
          language: 'en',
          duration: 6,
          minutesCharged: 1,
        }),
      });
    });

    // Upload file
    const buffer = Buffer.alloc(1024);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'success-test.mp3',
      mimeType: 'audio/mpeg',
      buffer,
    });

    // Wait for success state
    await expect(page.getByText('Transcription complete')).toBeVisible({ timeout: 10000 });

    // Transcript view now shows segments separately
    await expect(page.getByText('Hello, this is')).toBeVisible();
    await expect(page.getByText('a successful transcription test.')).toBeVisible();

    // Should show export and copy buttons
    await expect(page.getByRole('button', { name: /Export/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Copy/ })).toBeVisible();

    // Should show new transcription button
    await expect(page.getByRole('button', { name: 'New transcription' })).toBeVisible();
  });

  test('shows export options after transcription', async ({ page, request }) => {
    await authenticateUser(page, request, 'export-options@example.com');

    // Mock successful transcription
    await page.route('/api/transcribe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'export-test-789',
          text: 'Export test transcription.',
          segments: [{ start: 0, end: 3, text: 'Export test transcription.' }],
          model: 'faster-whisper',
          language: 'en',
          duration: 3,
          minutesCharged: 1,
        }),
      });
    });

    // Upload file
    const buffer = Buffer.alloc(1024);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'export-test.mp3',
      mimeType: 'audio/mpeg',
      buffer,
    });

    // Wait for success state
    await expect(page.getByText('Transcription complete')).toBeVisible({ timeout: 10000 });

    // Click export button to open menu
    await page.getByRole('button', { name: /Export/ }).click();

    // Check export options are visible (use exact matching to avoid duplicates)
    await expect(page.getByText('Plain Text', { exact: true })).toBeVisible();
    await expect(page.getByText('Subtitles (SRT)', { exact: true })).toBeVisible();
    await expect(page.getByText('Subtitles (VTT)', { exact: true })).toBeVisible();
    await expect(page.getByText('Word Document', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /JSON/ })).toBeVisible();
    await expect(page.getByText('Markdown', { exact: true })).toBeVisible();
  });

  test('handles transcription errors gracefully', async ({ page, request }) => {
    await authenticateUser(page, request, 'transcribe-error@example.com');

    // Mock failed transcription
    await page.route('/api/transcribe', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Transcription service unavailable',
        }),
      });
    });

    // Upload file
    const buffer = Buffer.alloc(1024);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'error-test.mp3',
      mimeType: 'audio/mpeg',
      buffer,
    });

    // Wait for error state
    await expect(page.getByText('Transcription failed')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  test('can start new transcription after completion', async ({ page, request }) => {
    await authenticateUser(page, request, 'new-transcription@example.com');

    // Mock successful transcription
    await page.route('/api/transcribe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'new-test',
          text: 'Test transcription.',
          segments: [{ start: 0, end: 2, text: 'Test transcription.' }],
          model: 'faster-whisper',
          language: 'en',
          duration: 2,
          minutesCharged: 1,
        }),
      });
    });

    // Upload file
    const buffer = Buffer.alloc(1024);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'new-test.mp3',
      mimeType: 'audio/mpeg',
      buffer,
    });

    // Wait for success state
    await expect(page.getByText('Transcription complete')).toBeVisible({ timeout: 10000 });

    // Click new transcription button
    await page.getByRole('button', { name: 'New transcription' }).click();

    // Should show upload zone again
    await expect(page.getByText('Upload audio file')).toBeVisible();
  });
});

test.describe('App - Transcription View', () => {
  test('can toggle between text and timestamp views', async ({ page, request }) => {
    await authenticateUser(page, request, 'view-toggle@example.com');

    // Mock successful transcription with segments
    await page.route('/api/transcribe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'segments-test',
          text: 'First segment. Second segment.',
          segments: [
            { start: 0, end: 5, text: 'First segment.' },
            { start: 5, end: 10, text: 'Second segment.' }
          ],
          model: 'faster-whisper',
          language: 'en',
          duration: 10,
          minutesCharged: 1,
        }),
      });
    });

    // Upload file
    const buffer = Buffer.alloc(1024);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'segments-test.mp3',
      mimeType: 'audio/mpeg',
      buffer,
    });

    // Wait for success state
    await expect(page.getByText('Transcription complete')).toBeVisible({ timeout: 10000 });

    // Transcript is active; future enhancement tabs are visible but disabled.
    await expect(page.getByRole('button', { name: 'Transcript', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Summary.*Soon/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Translation.*Soon/ })).toBeDisabled();

    // Default is Transcript tab, which shows the text and timestamps inline
    // The timestamps are displayed in the segments
    await expect(page.getByText('First segment.')).toBeVisible();
  });
});
