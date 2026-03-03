import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Verbatim/);
  });

  test('displays login form', async ({ page }) => {
    // Logo
    await expect(page.locator('svg').first()).toBeVisible();

    // Heading
    await expect(page.getByRole('heading', { name: 'Sign in to Verbatim' })).toBeVisible();

    // Description
    await expect(page.getByText('Enter your email to receive a magic link')).toBeVisible();

    // Email input
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();

    // Submit button
    await expect(page.getByRole('button', { name: 'Continue with email' })).toBeVisible();
  });

  test('has back to home link', async ({ page }) => {
    // On desktop, there's a Verbatim logo link on the left panel
    // On mobile, there's a "Back" link
    const verbatimLink = page.getByRole('link', { name: 'Verbatim' });
    const backLink = page.getByRole('link', { name: 'Back' });

    // At least one of these should be visible
    const hasVerbatimLink = await verbatimLink.isVisible();
    const hasBackLink = await backLink.isVisible();
    expect(hasVerbatimLink || hasBackLink).toBeTruthy();

    // Click whichever is visible
    if (hasVerbatimLink) {
      await verbatimLink.click();
    } else {
      await backLink.click();
    }
    await expect(page).toHaveURL('/');
  });

  test('displays terms and privacy links', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Terms of Service' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
  });

  test('email input has proper validation', async ({ page }) => {
    const emailInput = page.getByPlaceholder('you@example.com');
    const submitButton = page.getByRole('button', { name: 'Continue with email' });

    // Button should be disabled when email is empty
    await expect(submitButton).toBeDisabled();

    // Enter invalid email - button should remain disabled
    await emailInput.fill('invalid-email');
    await expect(submitButton).toBeDisabled();

    // Enter valid email - button should be enabled
    await emailInput.fill('test@example.com');
    await expect(submitButton).toBeEnabled();
  });

  test('submits form and shows loading state', async ({ page }) => {
    const emailInput = page.getByPlaceholder('you@example.com');
    const submitButton = page.getByRole('button', { name: 'Continue with email' });

    await emailInput.fill('test@example.com');
    await submitButton.click();

    // Should show loading state
    await expect(page.getByText('Sending...')).toBeVisible();
  });

  test('shows error on API failure', async ({ page }) => {
    // Mock the API to return an error
    await page.route('/api/auth/send-link', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid email address' }),
      });
    });

    await page.getByPlaceholder('you@example.com').fill('test@example.com');
    await page.getByRole('button', { name: 'Continue with email' }).click();

    // Should show error message
    await expect(page.getByText('Invalid email address')).toBeVisible();
  });

  test('shows success state after magic link sent', async ({ page }) => {
    // Mock the API to return success
    await page.route('/api/auth/send-link', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.getByPlaceholder('you@example.com').fill('test@example.com');
    await page.getByRole('button', { name: 'Continue with email' }).click();

    // Should show success message
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    await expect(page.getByText('We sent a magic link to')).toBeVisible();
    await expect(page.getByText('test@example.com')).toBeVisible();
    await expect(page.getByText('The link expires in 15 minutes')).toBeVisible();
  });

  test('can try different email after success', async ({ page }) => {
    // Mock the API
    await page.route('/api/auth/send-link', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Send magic link
    await page.getByPlaceholder('you@example.com').fill('test@example.com');
    await page.getByRole('button', { name: 'Continue with email' }).click();

    // Wait for success
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

    // Click try different email
    await page.getByText('Try a different email').click();

    // Should show form again
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toHaveValue('');
  });
});

test.describe('Login Page - Accessibility', () => {
  test('email input has proper label', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByLabel('Email address');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('autocomplete', 'email');
  });

  test('form is keyboard navigable', async ({ page }) => {
    await page.goto('/login');

    // Tab to email input (should be auto-focused)
    await expect(page.getByPlaceholder('you@example.com')).toBeFocused();

    // Type email
    await page.keyboard.type('test@example.com');

    // Tab to submit button
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Continue with email' })).toBeFocused();
  });
});
