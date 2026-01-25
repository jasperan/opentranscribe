import { test, expect } from '@playwright/test';

test.describe('Blog Page', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/blog');
    await expect(page).toHaveURL('/blog');
    await expect(page.getByRole('heading', { name: 'News, Updates & Insights', level: 1 })).toBeVisible();
  });

  test('displays blog posts', async ({ page }) => {
    await page.goto('/blog');

    // Check for blog post titles
    await expect(page.getByRole('heading', { name: /Introducing Verbatim/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Comparing 5 Open-Source STT Engines/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Best Practices for Audio Transcription/ })).toBeVisible();
  });

  test('displays post metadata', async ({ page }) => {
    await page.goto('/blog');

    // Check for dates and read times
    await expect(page.getByText('January 15, 2024')).toBeVisible();
    await expect(page.getByText('5 min read')).toBeVisible();
  });

  test('has navigation back to home', async ({ page }) => {
    await page.goto('/blog');

    await page.getByRole('link', { name: 'Back to Home' }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Terms of Service Page', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/terms');
    await expect(page).toHaveURL('/terms');
    await expect(page.getByRole('heading', { name: 'Terms of Service', level: 1 })).toBeVisible();
  });

  test('displays summary card', async ({ page }) => {
    await page.goto('/terms');

    await expect(page.getByRole('heading', { name: 'Summary' })).toBeVisible();
    await expect(page.getByText('By using Verbatim, you agree to these terms')).toBeVisible();
  });

  test('displays all sections', async ({ page }) => {
    await page.goto('/terms');

    await expect(page.getByRole('heading', { name: '1. Acceptance of Terms' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '2. Description of Service' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '3. User Accounts' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '4. Acceptable Use' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '5. Privacy' })).toBeVisible();
  });

  test('displays table of contents on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/terms');

    await expect(page.getByText('On this page')).toBeVisible();
    // Check for table of contents navigation items
    await expect(page.getByRole('button', { name: /Acceptance of Terms/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /User Accounts/ })).toBeVisible();
  });

  test('displays related links', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/terms');

    await expect(page.getByText('Related')).toBeVisible();
    await expect(page.getByRole('link', { name: 'API Documentation' })).toBeVisible();
  });

  test('links to privacy policy', async ({ page }) => {
    await page.goto('/terms');

    // Use the main content link, not the sidebar
    const mainContent = page.locator('main');
    const privacyLink = mainContent.getByRole('link', { name: 'Privacy Policy' }).first();
    await expect(privacyLink).toBeVisible();
    await privacyLink.click();
    await expect(page).toHaveURL('/privacy');
  });

  test('has contact email link', async ({ page }) => {
    await page.goto('/terms');

    const emailLink = page.getByRole('link', { name: 'legal@verbatim.app' });
    await expect(emailLink).toBeVisible();
    await expect(emailLink).toHaveAttribute('href', 'mailto:legal@verbatim.app');
  });

  test('has navigation back to home', async ({ page }) => {
    await page.goto('/terms');

    await page.getByRole('link', { name: 'Back to Home' }).click();
    await expect(page).toHaveURL('/');
  });

  test('has Get Started button on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/terms');

    const header = page.locator('header');
    await expect(header.getByRole('link', { name: 'Get Started' })).toBeVisible();
  });
});

test.describe('Privacy Policy Page', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page).toHaveURL('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeVisible();
  });

  test('displays privacy promise', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page.getByRole('heading', { name: 'Our Privacy Promise' })).toBeVisible();
    await expect(page.getByText('never sent to third-party APIs')).toBeVisible();
  });

  test('displays all sections', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page.getByRole('heading', { name: '1. Information We Collect' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '2. How We Use Your Information' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '3. Data Storage & Security' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '4. Data Sharing' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '5. Your Rights' })).toBeVisible();
  });

  test('displays security features', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page.getByText('Audio files deleted immediately after transcription')).toBeVisible();
    await expect(page.getByText('No third-party API calls for transcription')).toBeVisible();
  });

  test('has navigation back to home', async ({ page }) => {
    await page.goto('/privacy');

    await page.getByRole('link', { name: 'Back to Home' }).click();
    await expect(page).toHaveURL('/');
  });

  test('displays table of contents on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/privacy');

    await expect(page.getByText('On this page')).toBeVisible();
    // Check for TOC navigation items
    await expect(page.getByRole('button', { name: /Information We Collect/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Data Storage/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Your Rights/ })).toBeVisible();
  });

  test('displays related links on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/privacy');

    await expect(page.getByText('Related')).toBeVisible();
    // Use sidebar locator to scope the links
    const sidebar = page.getByRole('complementary');
    await expect(sidebar.getByRole('link', { name: /Terms of Service/ })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /API Documentation/ })).toBeVisible();
  });

  test('displays information collection cards', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page.getByRole('heading', { name: 'Account Information' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Audio Files' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Usage Data' })).toBeVisible();
  });

  test('displays your rights cards', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page.getByText('Access Data')).toBeVisible();
    await expect(page.getByText('Delete Account')).toBeVisible();
    await expect(page.getByText('Export History')).toBeVisible();
  });

  test('has contact email link', async ({ page }) => {
    await page.goto('/privacy');

    const emailLink = page.getByRole('link', { name: 'privacy@verbatim.app' });
    await expect(emailLink).toBeVisible();
    await expect(emailLink).toHaveAttribute('href', 'mailto:privacy@verbatim.app');
  });

  test('has Get Started button on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/privacy');

    const header = page.locator('header');
    await expect(header.getByRole('link', { name: 'Get Started' })).toBeVisible();
  });
});

test.describe('Pricing Page', () => {
  test('redirects to landing page pricing section', async ({ page }) => {
    await page.goto('/pricing');

    // Should redirect to landing page with pricing anchor
    await expect(page).toHaveURL('/#pricing');
  });
});

test.describe('Footer Links Integration', () => {
  test('documentation link works from footer', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    await footer.getByRole('link', { name: 'Documentation' }).click();
    await expect(page).toHaveURL('/docs');
  });

  test('pricing link works from footer', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    await footer.getByRole('link', { name: 'Pricing' }).click();
    await expect(page).toHaveURL('/#pricing');
  });

  test('blog link works from footer', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    await footer.getByRole('link', { name: 'Blog' }).click();
    await expect(page).toHaveURL('/blog');
  });
});

test.describe('Login Page Legal Links', () => {
  test('terms link works from login page', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: 'Terms of Service' }).click();
    await expect(page).toHaveURL('/terms');
  });

  test('privacy link works from login page', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: 'Privacy Policy' }).click();
    await expect(page).toHaveURL('/privacy');
  });
});
