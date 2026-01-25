import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads successfully with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Verbatim/);
  });

  test('displays navigation bar', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Logo and brand name
    await expect(nav.getByText('Verbatim')).toBeVisible();

    // Navigation links (use nav scope to avoid footer duplicates)
    await expect(nav.getByRole('link', { name: 'Features' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Pricing' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Docs' })).toBeVisible();

    // Auth links
    await expect(nav.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Get Started' })).toBeVisible();
  });

  test('displays hero section with correct content', async ({ page }) => {
    // Privacy badge - use first() since it appears in hero
    await expect(page.getByText('Privacy-first transcription').first()).toBeVisible();

    // Main headline - look for heading element
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Transcribe audio');

    // Description
    await expect(page.getByText('High-accuracy transcription powered by 5 open-source STT engines.')).toBeVisible();

    // CTA buttons
    await expect(page.getByRole('link', { name: 'Start for free' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View API Docs' })).toBeVisible();

    // Free tier mention
    await expect(page.getByText('500 free minutes/month')).toBeVisible();
  });

  test('displays features section', async ({ page }) => {
    // Scroll to features section
    await page.locator('#features').scrollIntoViewIfNeeded();

    // Section heading
    await expect(page.getByRole('heading', { name: 'Everything you need for transcription' })).toBeVisible();

    // Feature cards - use heading role to be specific
    await expect(page.getByRole('heading', { name: 'Privacy-First' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '5 STT Engines' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Developer API' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Export Anywhere' })).toBeVisible();
  });

  test('displays pricing section with all tiers', async ({ page }) => {
    // Scroll to pricing section
    await page.locator('#pricing').scrollIntoViewIfNeeded();

    // Section heading
    await expect(page.getByRole('heading', { name: 'Simple, transparent pricing' })).toBeVisible();

    // Pricing tiers - use heading role to be specific
    const pricingSection = page.locator('#pricing');

    // Free tier
    await expect(pricingSection.getByRole('heading', { name: 'Free' })).toBeVisible();
    await expect(pricingSection.getByText('$0')).toBeVisible();
    await expect(pricingSection.getByText('500 min/month')).toBeVisible();

    // Creator tier
    await expect(pricingSection.getByRole('heading', { name: 'Creator' })).toBeVisible();
    await expect(pricingSection.getByText('$8')).toBeVisible();
    await expect(pricingSection.getByText('3,000 min/month')).toBeVisible();

    // Pro tier
    await expect(pricingSection.getByRole('heading', { name: 'Pro' })).toBeVisible();
    await expect(pricingSection.getByText('$19')).toBeVisible();
    await expect(pricingSection.getByText('10,000 min/month')).toBeVisible();

    // Unlimited tier
    await expect(pricingSection.getByRole('heading', { name: 'Unlimited' })).toBeVisible();
    await expect(pricingSection.getByText('$39')).toBeVisible();
  });

  test('displays CTA section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Ready to get started?' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create free account' })).toBeVisible();
  });

  test('displays footer with links', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer.getByText('Verbatim', { exact: true })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Documentation' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Pricing' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Blog' })).toBeVisible();
    await expect(footer.getByText(/© \d{4} Verbatim/)).toBeVisible();
  });

  test('navigation links work correctly', async ({ page }) => {
    const nav = page.locator('nav');

    // Click Features link
    await nav.getByRole('link', { name: 'Features' }).click();
    await expect(page.locator('#features')).toBeInViewport();

    // Click Pricing link
    await nav.getByRole('link', { name: 'Pricing' }).click();
    await expect(page.locator('#pricing')).toBeInViewport();
  });

  test('Get Started button navigates to login', async ({ page }) => {
    const nav = page.locator('nav');
    await nav.getByRole('link', { name: 'Get Started' }).click();
    await expect(page).toHaveURL('/login');
  });

  test('Sign in link navigates to login', async ({ page }) => {
    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Landing Page - Responsive', () => {
  test('mobile: displays correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Logo visible
    await expect(page.getByText('Verbatim').first()).toBeVisible();

    // Hero content visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start for free' })).toBeVisible();
  });

  test('tablet: displays correctly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await expect(page.getByText('Verbatim').first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
