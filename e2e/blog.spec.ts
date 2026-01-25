import { test, expect } from '@playwright/test';

test.describe('Blog Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog');
  });

  test('loads successfully', async ({ page }) => {
    await expect(page).toHaveURL('/blog');
  });

  test('displays page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'News, Updates & Insights', level: 1 })).toBeVisible();
    await expect(page.getByText('Learn about transcription technology, privacy-first AI')).toBeVisible();
  });

  test('displays Verbatim Blog badge', async ({ page }) => {
    await expect(page.getByText('Verbatim Blog')).toBeVisible();
  });

  test.describe('Navigation', () => {
    test('has Verbatim logo link', async ({ page }) => {
      const logoLink = page.getByRole('link', { name: 'Verbatim' });
      await expect(logoLink).toBeVisible();
      await expect(logoLink).toHaveAttribute('href', '/');
    });

    test('has Back to Home link', async ({ page }) => {
      const backLink = page.getByRole('link', { name: 'Back to Home' });
      await expect(backLink).toBeVisible();
      await expect(backLink).toHaveAttribute('href', '/');
    });

    test('Back to Home navigates to landing page', async ({ page }) => {
      await page.getByRole('link', { name: 'Back to Home' }).click();
      await expect(page).toHaveURL('/');
    });

    test('Logo navigates to landing page', async ({ page }) => {
      await page.getByRole('link', { name: 'Verbatim' }).click();
      await expect(page).toHaveURL('/');
    });

    test('has Get Started button on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await expect(page.getByRole('link', { name: 'Get Started' }).first()).toBeVisible();
    });
  });

  test.describe('Blog Articles', () => {
    test('displays multiple articles', async ({ page }) => {
      const articles = page.locator('article');
      const count = await articles.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    test('featured article: Introducing Verbatim', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Introducing Verbatim/ })).toBeVisible();
      await expect(page.getByText(/we believe your audio data should stay private/)).toBeVisible();
      // Check for Featured badge
      await expect(page.getByText('Featured')).toBeVisible();
    });

    test('article: Comparing STT Engines', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Comparing 5 Open-Source STT Engines/ })).toBeVisible();
      await expect(page.getByText(/deep dive into the speech-to-text engines/)).toBeVisible();
    });

    test('article: Best Practices', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Best Practices for Audio Transcription/ })).toBeVisible();
      await expect(page.getByText(/Tips and tricks for getting the best transcription results/)).toBeVisible();
    });

    test('article: Speaker Diarization', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Speaker Diarization/ })).toBeVisible();
      await expect(page.getByText(/Understanding how speaker diarization works/)).toBeVisible();
    });

    test('articles show date and read time', async ({ page }) => {
      // Check that articles have date metadata
      await expect(page.getByText('January 15, 2024')).toBeVisible();
      await expect(page.getByText('January 10, 2024')).toBeVisible();
      await expect(page.getByText('January 5, 2024')).toBeVisible();
      await expect(page.getByText('January 2, 2024')).toBeVisible();

      // Check that articles have read time
      await expect(page.getByText('5 min read')).toBeVisible();
      await expect(page.getByText('8 min read')).toBeVisible();
      await expect(page.getByText('4 min read')).toBeVisible();
      await expect(page.getByText('6 min read')).toBeVisible();
    });

    test('articles have category tags', async ({ page }) => {
      // Use locator within article elements to avoid matching sidebar categories
      const articles = page.locator('article');
      await expect(articles.getByText('Announcement')).toBeVisible();
      await expect(articles.getByText('Technical')).toBeVisible();
      await expect(articles.getByText('Tutorial')).toBeVisible();
      await expect(articles.getByText('Feature').first()).toBeVisible();
    });

    test('articles have Read more links', async ({ page }) => {
      const readMoreLinks = page.getByText('Read more');
      const count = await readMoreLinks.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Sidebar', () => {
    test('displays Categories section', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
      await expect(page.getByRole('button', { name: /All/ })).toBeVisible();
    });

    test('displays newsletter signup', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Stay Updated' })).toBeVisible();
      await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Subscribe' })).toBeVisible();
    });

    test('displays Quick Links section', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Quick Links' })).toBeVisible();
      await expect(page.getByText('API Documentation')).toBeVisible();
      await expect(page.getByText('Pricing')).toBeVisible();
    });
  });

  test('shows "More articles coming soon" message', async ({ page }) => {
    await expect(page.getByText('More articles coming soon')).toBeVisible();
  });
});

test.describe('Blog Page - SEO', () => {
  test('has proper meta tags', async ({ page }) => {
    await page.goto('/blog');

    // Check title
    await expect(page).toHaveTitle(/Verbatim/);

    // Check for heading structure
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    const h2Count = await page.locator('h2').count();
    expect(h2Count).toBeGreaterThanOrEqual(3); // Article titles are h2
  });
});

test.describe('Blog Page - Responsive', () => {
  test('mobile: displays correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/blog');

    await expect(page.getByRole('heading', { name: 'News, Updates & Insights', level: 1 })).toBeVisible();

    // Articles should stack vertically on mobile
    const articles = page.locator('article');
    const count = await articles.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Header Get Started button should be hidden on mobile (use header scope)
    const header = page.locator('header');
    await expect(header.getByRole('link', { name: 'Get Started' })).toBeHidden();
  });

  test('tablet: displays correctly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/blog');

    await expect(page.getByRole('heading', { name: 'News, Updates & Insights', level: 1 })).toBeVisible();
  });

  test('desktop: displays correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/blog');

    await expect(page.getByRole('heading', { name: 'News, Updates & Insights', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get Started' }).first()).toBeVisible();
  });
});

test.describe('Blog Page - Accessibility', () => {
  test('articles use semantic HTML', async ({ page }) => {
    await page.goto('/blog');

    // Should use article elements
    const articles = page.locator('article');
    const count = await articles.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('headings follow hierarchy', async ({ page }) => {
    await page.goto('/blog');

    // H1 for page title
    await expect(page.locator('h1')).toHaveCount(1);

    // H2 for article titles
    const h2Elements = page.locator('h2');
    const h2Count = await h2Elements.count();
    expect(h2Count).toBeGreaterThanOrEqual(3);
  });

  test('newsletter form has accessible input', async ({ page }) => {
    await page.goto('/blog');

    const emailInput = page.getByPlaceholder('you@example.com');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');
  });
});
