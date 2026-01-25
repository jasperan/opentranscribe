import { test, expect, Page } from '@playwright/test';

// Helper to authenticate user
async function authenticateUser(page: Page, email: string = 'apikeys-test@example.com') {
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

test.describe('API Keys Page - Basic', () => {
  test('displays page header', async ({ page }) => {
    await authenticateUser(page, `header-${Date.now()}@example.com`);
    await page.goto('/app/api-keys');
    await expect(page.getByRole('heading', { name: 'API Keys', exact: true })).toBeVisible();
    await expect(page.getByText('Manage API keys for programmatic access')).toBeVisible();
  });

  test('displays stats cards', async ({ page }) => {
    await authenticateUser(page, `stats-${Date.now()}@example.com`);
    await page.goto('/app/api-keys');
    await expect(page.getByText('Active Keys')).toBeVisible();
    await expect(page.getByText('Keys Used')).toBeVisible();
    await expect(page.getByText('256-bit')).toBeVisible();
    await expect(page.getByText('Encryption')).toBeVisible();
  });

  test('displays create key section', async ({ page }) => {
    await authenticateUser(page, `create-heading-${Date.now()}@example.com`);
    await page.goto('/app/api-keys');
    await expect(page.getByText('Create New API Key')).toBeVisible();
    await expect(page.getByText('Generate a new key for API access')).toBeVisible();
  });

  test('has key name input field', async ({ page }) => {
    await authenticateUser(page, `input-field-${Date.now()}@example.com`);
    await page.goto('/app/api-keys');
    const input = page.getByRole('textbox', { name: /Key name/ });
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', /Production|Development/);
  });

  test('Create Key button is disabled when name is empty', async ({ page }) => {
    await authenticateUser(page, `btn-disabled-${Date.now()}@example.com`);
    await page.goto('/app/api-keys');
    const button = page.getByRole('button', { name: 'Create Key' });
    await expect(button).toBeDisabled();
  });

  test('Create Key button enables when name is entered', async ({ page }) => {
    await authenticateUser(page, `btn-enabled-${Date.now()}@example.com`);
    await page.goto('/app/api-keys');
    const input = page.getByRole('textbox', { name: /Key name/ });
    await input.fill('My Test Key');

    const button = page.getByRole('button', { name: 'Create Key' });
    await expect(button).toBeEnabled();
  });

  test('displays your api keys heading', async ({ page }) => {
    await authenticateUser(page, `keys-heading-${Date.now()}@example.com`);
    await page.goto('/app/api-keys');
    await expect(page.getByRole('heading', { name: 'Your API Keys' })).toBeVisible();
  });
});

test.describe('API Keys Page - Key Creation', () => {
  test('can create a new API key', async ({ page }) => {
    await authenticateUser(page, `create-key-${Date.now()}@example.com`);
    await page.goto('/app/api-keys');

    const input = page.getByRole('textbox', { name: /Key name/ });
    await input.fill('Production Key');

    await page.getByRole('button', { name: 'Create Key' }).click();

    // Should show the new key with warning
    await expect(page.getByText(/Save this key now/)).toBeVisible();

    // Should show the full key (contains vbt_)
    await expect(page.locator('code').filter({ hasText: /vbt_/ }).first()).toBeVisible();
  });

  test('shows copy button for new key', async ({ page }) => {
    await authenticateUser(page, `copy-btn-${Date.now()}@example.com`);
    await page.goto('/app/api-keys');

    const input = page.getByRole('textbox', { name: /Key name/ });
    await input.fill('Copy Test Key');

    await page.getByRole('button', { name: 'Create Key' }).click();

    // Should have a copy button near the key
    await expect(page.getByText(/Save this key now/)).toBeVisible();
    // The key display section has a code element and a copy button
    const codeElement = page.locator('code').filter({ hasText: /vbt_/ }).first();
    await expect(codeElement).toBeVisible();
    // Copy button is a sibling button to the code element in the same container
    const copyButton = codeElement.locator('..').locator('button');
    await expect(copyButton).toBeVisible();
  });
});

test.describe('API Keys Page - Empty State', () => {
  test('shows empty state when no keys exist', async ({ page }) => {
    // Use fresh user with no keys
    await authenticateUser(page, `empty-state-${Date.now()}@example.com`);
    await page.goto('/app/api-keys');

    await expect(page.getByText('No API keys yet')).toBeVisible();
    await expect(page.getByText('Create your first API key above')).toBeVisible();
  });
});

test.describe('API Keys Page - Key Management', () => {
  test('shows created key in list', async ({ page }) => {
    await authenticateUser(page, `list-key-${Date.now()}@example.com`);
    await page.goto('/app/api-keys');

    // Create a key first
    const input = page.getByRole('textbox', { name: /Key name/ });
    await input.fill('Listed Key');
    await page.getByRole('button', { name: 'Create Key' }).click();

    // Wait for key to appear
    await expect(page.getByText('Listed Key')).toBeVisible();

    // Should show masked key prefix
    await expect(page.locator('code').filter({ hasText: /vbt_.*\.\.\./ })).toBeVisible();

    // Should show creation date (e.g., "Jan 22, 2026")
    await expect(page.getByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)).toBeVisible();
  });

  test('shows delete button for each key on hover', async ({ page }) => {
    await authenticateUser(page, `delete-btn-${Date.now()}@example.com`);
    await page.goto('/app/api-keys');

    // Create a key first
    const input = page.getByRole('textbox', { name: /Key name/ });
    await input.fill('Delete Test Key');
    await page.getByRole('button', { name: 'Create Key' }).click();

    await expect(page.getByText('Delete Test Key')).toBeVisible();

    // Hover over the key row to reveal delete button
    const keyRow = page.locator('.group').filter({ hasText: 'Delete Test Key' });
    await keyRow.hover();

    // Should have delete button (title="Delete key")
    await expect(page.getByRole('button', { name: 'Delete key' })).toBeVisible();
  });

  test('can delete an API key with confirmation modal', async ({ page }) => {
    await authenticateUser(page, `can-delete-${Date.now()}@example.com`);
    await page.goto('/app/api-keys');

    // Create a key first
    const input = page.getByRole('textbox', { name: /Key name/ });
    await input.fill('To Be Deleted');
    await page.getByRole('button', { name: 'Create Key' }).click();

    await expect(page.getByText('To Be Deleted')).toBeVisible();

    // Hover and click delete
    const keyRow = page.locator('.group').filter({ hasText: 'To Be Deleted' });
    await keyRow.hover();
    await page.getByRole('button', { name: 'Delete key' }).click();

    // Confirmation modal should appear
    await expect(page.getByRole('heading', { name: 'Delete API Key?' })).toBeVisible();
    await expect(page.getByText('This action cannot be undone')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    // Use exact match to get the modal button, not the title="Delete key" icon button
    await expect(page.getByRole('button', { name: 'Delete Key', exact: true })).toBeVisible();

    // Confirm deletion
    await page.getByRole('button', { name: 'Delete Key', exact: true }).click();

    // Wait for modal to close (indicates deletion completed)
    await expect(page.getByRole('heading', { name: 'Delete API Key?' })).not.toBeVisible({ timeout: 15000 });

    // Key should no longer be visible (or show empty state)
    await expect(page.getByText('To Be Deleted')).not.toBeVisible();
  });

  test('can cancel delete via modal', async ({ page }) => {
    await authenticateUser(page, `cancel-delete-${Date.now()}@example.com`);
    await page.goto('/app/api-keys');

    // Create a key first
    const input = page.getByRole('textbox', { name: /Key name/ });
    await input.fill('Keep This Key');
    await page.getByRole('button', { name: 'Create Key' }).click();

    await expect(page.getByText('Keep This Key')).toBeVisible();

    // Hover and click delete
    const keyRow = page.locator('.group').filter({ hasText: 'Keep This Key' });
    await keyRow.hover();
    await page.getByRole('button', { name: 'Delete key' }).click();

    // Cancel the deletion
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Modal should close and key should still be visible
    await expect(page.getByRole('heading', { name: 'Delete API Key?' })).not.toBeVisible();
    await expect(page.getByText('Keep This Key')).toBeVisible();
  });

});

test.describe('API Keys Page - Documentation Link', () => {
  test('has link to documentation', async ({ page }) => {
    await authenticateUser(page, `docs-link-${Date.now()}@example.com`);
    await page.goto('/app/api-keys');

    await expect(page.getByText('API Documentation')).toBeVisible();
    await expect(page.getByText('Learn how to integrate Verbatim into your applications')).toBeVisible();
  });

  test('documentation link navigates to docs', async ({ page }) => {
    await authenticateUser(page, `docs-nav-${Date.now()}@example.com`);
    await page.goto('/app/api-keys');

    await page.getByRole('link', { name: 'API Documentation' }).click();
    await expect(page).toHaveURL('/docs');
  });
});

test.describe('API Keys Page - Multiple Keys', () => {
  test('can create multiple API keys', async ({ page }) => {
    await authenticateUser(page, `multi-keys-${Date.now()}@example.com`);
    await page.goto('/app/api-keys');

    // Create first key
    const input = page.getByRole('textbox', { name: /Key name/ });
    await input.fill('Development');
    await page.getByRole('button', { name: 'Create Key' }).click();
    await expect(page.getByText('Development')).toBeVisible();

    // Wait for input to be cleared and button to be disabled, then fill again
    await expect(input).toHaveValue('');
    await input.fill('Production');
    await page.getByRole('button', { name: 'Create Key' }).click();
    await expect(page.getByText('Production')).toBeVisible();

    // Both keys should be visible
    await expect(page.getByText('Development')).toBeVisible();
    await expect(page.getByText('Production')).toBeVisible();
  });
});

test.describe('API Keys Page - Responsive', () => {
  test('mobile: api keys page is usable', async ({ page }) => {
    await authenticateUser(page, 'apikeys-mobile@example.com');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/app/api-keys');

    await expect(page.getByRole('heading', { name: 'API Keys', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /Key name/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Key' })).toBeVisible();
  });
});
