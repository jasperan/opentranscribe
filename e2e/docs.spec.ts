import { test, expect } from '@playwright/test';

test.describe('Documentation Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/docs');
  });

  test('loads successfully', async ({ page }) => {
    await expect(page).toHaveURL('/docs');
    await expect(page.getByRole('heading', { name: 'Developer Documentation' })).toBeVisible();
  });

  test('displays header with navigation', async ({ page }) => {
    // Logo - use exact match
    await expect(page.getByRole('link', { name: 'Verbatim', exact: true })).toBeVisible();

    // Navigation links
    await expect(page.getByRole('link', { name: 'Back to Home' })).toBeVisible();
  });

  test('displays Get Started button on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible();
  });

  test('displays API Documentation badge', async ({ page }) => {
    await expect(page.getByText('API Documentation')).toBeVisible();
  });

  test('displays Quick Start section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Quick Start' })).toBeVisible();
    await expect(page.getByText('Get your API key')).toBeVisible();
    await expect(page.getByText('Make your first request')).toBeVisible();

    // Code example - use first() to avoid multiple matches
    await expect(page.getByText('curl -X POST').first()).toBeVisible();
  });

  test('displays Authentication section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Authentication' })).toBeVisible();
    await expect(page.getByText('Authorization: Bearer').first()).toBeVisible();

    // Security best practices
    await expect(page.getByRole('heading', { name: 'Security Best Practices' })).toBeVisible();
    await expect(page.getByText('Never expose API keys in client-side code')).toBeVisible();

    // Rate limits
    await expect(page.getByRole('heading', { name: 'Rate Limits' })).toBeVisible();
    await expect(page.getByText('Free tier')).toBeVisible();
    await expect(page.getByText('10 req/min')).toBeVisible();
  });

  test('displays API Endpoints section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'API Endpoints' })).toBeVisible();

    // Transcribe endpoint - use exact match
    await expect(page.getByText('/api/transcribe', { exact: true })).toBeVisible();
    await expect(page.getByText('Transcribe an audio file to text')).toBeVisible();

    // Export endpoint
    await expect(page.getByText('/api/export', { exact: true })).toBeVisible();

    // Usage endpoint
    await expect(page.getByText('/api/user/usage', { exact: true })).toBeVisible();

    // History endpoint
    await expect(page.getByText('/api/user/history', { exact: true })).toBeVisible();
  });

  test('displays Supported Formats section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Supported Formats' })).toBeVisible();

    // Audio formats
    await expect(page.getByRole('heading', { name: 'Audio Input Formats' })).toBeVisible();
    await expect(page.getByText('MP3', { exact: true })).toBeVisible();
    await expect(page.getByText('WAV', { exact: true })).toBeVisible();
    await expect(page.getByText('FLAC', { exact: true })).toBeVisible();

    // Export formats
    await expect(page.getByRole('heading', { name: 'Export Formats' })).toBeVisible();
    await expect(page.getByText('Plain text')).toBeVisible();
    await expect(page.getByText('SubRip subtitles')).toBeVisible();
  });

  test('displays STT Models section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'STT Models' })).toBeVisible();

    // Model cards
    await expect(page.getByRole('heading', { name: 'Faster Whisper' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'OpenAI Whisper' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vosk' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'whisper.cpp' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Wav2Vec2' })).toBeVisible();

    // Model IDs - use exact match
    await expect(page.getByText('faster-whisper', { exact: true })).toBeVisible();

    // Model badges
    await expect(page.getByText('Recommended')).toBeVisible();
    await expect(page.getByText('Lightweight', { exact: true })).toBeVisible();
  });

  test('displays Language Support section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Language Support' })).toBeVisible();

    // Popular languages
    await expect(page.getByText('English', { exact: true })).toBeVisible();
    await expect(page.getByText('Spanish', { exact: true })).toBeVisible();
    await expect(page.getByText('+89 more')).toBeVisible();
  });

  test('displays Speaker Diarization section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Speaker Diarization' })).toBeVisible();
    await expect(page.getByText('identify who said what')).toBeVisible();
    await expect(page.getByText('diarization=true')).toBeVisible();
  });

  test('displays footer with contact info', async ({ page }) => {
    await expect(page.getByText('Need help?')).toBeVisible();
    await expect(page.getByRole('link', { name: 'support@verbatim.app' })).toBeVisible();
  });

  test('copy buttons are present', async ({ page }) => {
    // Should have multiple copy buttons for code blocks
    const copyButtons = page.getByRole('button', { name: 'Copy to clipboard' });
    await expect(copyButtons.first()).toBeVisible();

    // Count should be multiple (we have several code blocks)
    const count = await copyButtons.count();
    expect(count).toBeGreaterThan(3);
  });

  test('navigation links work', async ({ page }) => {
    // Back to home
    await page.getByRole('link', { name: 'Back to Home' }).click();
    await expect(page).toHaveURL('/');
  });

  test('Get Started button navigates to login', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole('link', { name: 'Get Started' }).click();
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Documentation Page - Table of Contents', () => {
  test('displays table of contents sidebar on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/docs');

    await expect(page.getByText('On this page')).toBeVisible();

    // Check for TOC navigation items
    await expect(page.getByRole('button', { name: /Quick Start/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Authentication/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /API Endpoints/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Supported Formats/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /STT Models/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Languages/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Speaker Diarization/ })).toBeVisible();
  });

  test('displays quick links in sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/docs');

    await expect(page.getByText('Quick Links')).toBeVisible();
    await expect(page.getByRole('link', { name: /Get API Key/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /View Pricing/ })).toBeVisible();
  });

  test('hides table of contents on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/docs');

    // TOC should be hidden on mobile
    await expect(page.getByText('On this page')).not.toBeVisible();
  });
});

test.describe('Documentation Page - Code Blocks', () => {
  test('displays code blocks with terminal styling', async ({ page }) => {
    await page.goto('/docs');

    // Check for terminal window buttons (the macOS-style dots)
    const terminalDots = page.locator('.bg-red-500\\/60');
    await expect(terminalDots.first()).toBeVisible();
  });

  test('displays language labels on code blocks', async ({ page }) => {
    await page.goto('/docs');

    // Check for language labels
    await expect(page.getByText('bash').first()).toBeVisible();
    await expect(page.getByText('json').first()).toBeVisible();
  });
});

test.describe('Documentation Page - Responsive', () => {
  test('mobile: displays correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/docs');

    await expect(page.getByRole('heading', { name: 'Developer Documentation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quick Start' })).toBeVisible();
  });

  test('tablet: displays correctly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/docs');

    await expect(page.getByRole('heading', { name: 'Developer Documentation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'API Endpoints' })).toBeVisible();
  });
});
