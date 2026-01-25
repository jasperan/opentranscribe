import { test, expect, Page } from '@playwright/test';

// Helper to authenticate user
async function authenticateUser(page: Page, email: string = 'settings-test@example.com') {
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

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/app/settings');
  });

  test('displays page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByText('Manage your account and preferences')).toBeVisible();
  });

  test.describe('Account Section', () => {
    test('displays account heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();
      await expect(page.getByText('Your account information')).toBeVisible();
    });

    test('shows user email in disabled field', async ({ page }) => {
      const emailField = page.locator('input[disabled]').first();
      await expect(emailField).toHaveValue('settings-test@example.com');
    });

    test('shows email cannot be changed message', async ({ page }) => {
      await expect(page.getByText('Email cannot be changed')).toBeVisible();
    });

    test('shows member since date', async ({ page }) => {
      await expect(page.getByText('Member since')).toBeVisible();
      // Should show a date
      await expect(page.getByText(/January|February|March|April|May|June|July|August|September|October|November|December/)).toBeVisible();
    });
  });

  test.describe('Preferences Section', () => {
    test('displays preferences heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Preferences' })).toBeVisible();
      await expect(page.getByText('Customize your experience')).toBeVisible();
    });

    test('has STT model dropdown with all options', async ({ page }) => {
      await expect(page.getByText('Default STT Model')).toBeVisible();

      // Find the custom dropdown button (shows "Faster Whisper" by default)
      const modelDropdown = page.locator('button').filter({ hasText: /Faster Whisper/ }).first();
      await expect(modelDropdown).toBeVisible();

      // Click to open dropdown
      await modelDropdown.click();

      // Check all model options exist in dropdown (use .first() to avoid strict mode)
      await expect(page.getByText('Faster Whisper (Recommended)').first()).toBeVisible();
      await expect(page.getByText('OpenAI Whisper').first()).toBeVisible();
      await expect(page.getByText('Vosk').first()).toBeVisible();
      await expect(page.getByText('whisper.cpp').first()).toBeVisible();
      await expect(page.getByText('Wav2Vec2').first()).toBeVisible();
    });

    test('can change STT model selection', async ({ page }) => {
      // Find and click the model dropdown
      const modelDropdown = page.locator('button').filter({ hasText: /Faster Whisper/ }).first();
      await expect(modelDropdown).toBeVisible();
      await modelDropdown.click();

      // Select OpenAI Whisper
      await page.getByRole('button', { name: 'OpenAI Whisper' }).click();

      // Verify dropdown now shows OpenAI Whisper
      await expect(page.locator('button').filter({ hasText: 'OpenAI Whisper' }).first()).toBeVisible();
    });

    test('has language dropdown with all options', async ({ page }) => {
      await expect(page.getByText('Default Language')).toBeVisible();

      // Find and click the language dropdown (defaults to "Auto-detect")
      const languageDropdown = page.locator('button').filter({ hasText: /Auto-detect/ }).first();
      await expect(languageDropdown).toBeVisible();
      await languageDropdown.click();

      // Check common language options exist in the dropdown menu
      // Using locator within the dropdown menu to avoid matching the button itself
      const dropdownMenu = page.locator('.absolute.top-full');
      await expect(dropdownMenu.getByText('Auto-detect')).toBeVisible();
      await expect(dropdownMenu.getByText('English')).toBeVisible();
      await expect(dropdownMenu.getByText('Spanish')).toBeVisible();
      await expect(dropdownMenu.getByText('French')).toBeVisible();
    });

    test('can change language selection', async ({ page }) => {
      // Find and click the language dropdown (defaults to Auto-detect)
      const languageDropdown = page.locator('button').filter({ hasText: /Auto-detect/ }).first();
      await expect(languageDropdown).toBeVisible();
      await languageDropdown.click();

      // Select English
      await page.getByRole('button', { name: 'English' }).click();

      // Verify dropdown now shows English
      await expect(page.locator('button').filter({ hasText: 'English' }).first()).toBeVisible();
    });

    test('has theme selector', async ({ page }) => {
      await expect(page.getByText('Theme')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Light' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Dark' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'System' })).toBeVisible();
    });
  });

  test.describe('Notifications Section', () => {
    test('displays notifications heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
      await expect(page.getByText('Manage email notifications')).toBeVisible();
    });

    test('has email notifications toggle', async ({ page }) => {
      await expect(page.getByText('Email Notifications', { exact: true })).toBeVisible();
      await expect(page.getByText('Receive emails about usage limits and updates')).toBeVisible();
    });

    test('notifications toggle is clickable', async ({ page }) => {
      // Find the toggle button in notifications section
      const toggleButton = page.locator('.card').filter({ hasText: 'Notifications' }).locator('button').first();

      await expect(toggleButton).toBeVisible();
      await toggleButton.click();
      // Toggle should still be visible after click
      await expect(toggleButton).toBeVisible();
    });
  });

  test.describe('Data & Privacy Section', () => {
    test('displays data and privacy heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Data & Privacy' })).toBeVisible();
      await expect(page.getByText('Manage your data and privacy settings')).toBeVisible();
    });

    test('has export data button', async ({ page }) => {
      await expect(page.getByText('Export Data')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Export' })).toBeVisible();
    });

    test('shows storage used section', async ({ page }) => {
      await expect(page.getByText('Storage Used')).toBeVisible();
    });
  });

  test.describe('Danger Zone', () => {
    test('displays danger zone heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Danger Zone' })).toBeVisible();
    });

    test('has delete account button', async ({ page }) => {
      await expect(page.getByText('Delete Account')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
    });

    test('delete button opens confirmation modal', async ({ page }) => {
      await page.getByRole('button', { name: 'Delete' }).click();

      // Modal should appear
      await expect(page.getByRole('heading', { name: 'Delete Account?' })).toBeVisible();
      await expect(page.getByText('This action cannot be undone')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Delete Account' })).toBeVisible();
    });

    test('cancel button closes delete modal', async ({ page }) => {
      await page.getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByRole('heading', { name: 'Delete Account?' })).toBeVisible();

      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('heading', { name: 'Delete Account?' })).not.toBeVisible();
    });
  });

  test.describe('Action Buttons', () => {
    test('has Save Changes button', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
    });

    test('has Sign Out button', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
    });

    test('Sign Out button logs user out', async ({ page }) => {
      await page.getByRole('button', { name: 'Sign Out' }).click();

      // Should redirect to landing or login page
      await page.waitForURL(/\/(login)?$/, { timeout: 10000 });
    });
  });
});

test.describe('Settings Page - Responsive', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, 'settings-responsive@example.com');
  });

  test('mobile: settings page is usable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/app/settings');

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    // Check for custom dropdown (not combobox)
    await expect(page.locator('button').filter({ hasText: /Faster Whisper/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
  });
});
