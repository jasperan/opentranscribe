import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Transcription Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays upload area on initial load', async ({ page }) => {
    // Check main elements are visible
    await expect(page.locator('text=OpenTranscribe')).toBeVisible();
    await expect(page.locator('text=Convert Audio to Text')).toBeVisible();
    await expect(page.locator('[data-testid="audio-uploader"]')).toBeVisible();
  });

  test('language selector is functional', async ({ page }) => {
    // Find and interact with language selector
    const languageSelect = page.locator('select');
    await expect(languageSelect).toBeVisible();

    // Change language
    await languageSelect.selectOption('en');
    await expect(languageSelect).toHaveValue('en');

    // Change to Spanish
    await languageSelect.selectOption('es');
    await expect(languageSelect).toHaveValue('es');
  });

  test('history button opens sidebar', async ({ page }) => {
    // Click history button
    await page.click('text=History');

    // Sidebar should be visible
    await expect(page.locator('text=No history yet')).toBeVisible();
  });

  test('history sidebar can be closed', async ({ page }) => {
    // Open history
    await page.click('text=History');
    await expect(page.locator('text=No history yet')).toBeVisible();

    // Close by clicking backdrop
    await page.click('.fixed.inset-0.z-40');

    // Sidebar should be hidden
    await expect(page.locator('text=No history yet')).not.toBeVisible();
  });

  test('drag and drop zone responds to hover', async ({ page }) => {
    const dropZone = page.locator('[data-testid="audio-uploader"]');

    // Check initial state
    await expect(dropZone).toBeVisible();

    // Simulate drag enter
    await dropZone.dispatchEvent('dragover', {
      dataTransfer: { types: ['Files'] },
    });

    // Should show drag state (visual check via class changes)
    await expect(dropZone).toHaveClass(/border-\[var\(--accent\)\]/);
  });

  test.skip('file upload triggers transcription', async ({ page }) => {
    // This test requires a running backend
    // Skip in CI unless backend is available

    const testFilePath = path.join(__dirname, '../fixtures/sample.mp3');

    // Upload file
    await page.setInputFiles('[data-testid="file-input"]', testFilePath);

    // Should show transcribing state
    await expect(page.locator('text=Transcribing...')).toBeVisible({ timeout: 5000 });

    // Wait for completion
    await expect(page.locator('[data-testid="transcription-result"]')).toBeVisible({
      timeout: 60000,
    });

    // Verify result has content
    const resultText = page.locator('[data-testid="transcription-text"]');
    await expect(resultText).toContainText(/\w+/);
  });
});
