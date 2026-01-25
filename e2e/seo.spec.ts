import { test, expect, Page } from '@playwright/test';

// Helper to get meta tags from page
async function getMetaTags(page: Page) {
  return await page.evaluate(() => {
    const meta: Record<string, string> = {};
    document.querySelectorAll('meta').forEach((tag) => {
      const name = tag.getAttribute('name') || tag.getAttribute('property');
      const content = tag.getAttribute('content');
      if (name && content) {
        meta[name] = content;
      }
    });
    meta['title'] = document.title;
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) meta['canonical'] = canonical.getAttribute('href') || '';
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleIcon) meta['apple-touch-icon'] = appleIcon.getAttribute('href') || '';
    return meta;
  });
}

test.describe('SEO Meta Tags', () => {
  test.describe('Landing Page', () => {
    test('has essential meta tags', async ({ page }) => {
      await page.goto('/');
      const meta = await getMetaTags(page);

      expect(meta['title']).toContain('Verbatim');
      expect(meta['description']).toBeTruthy();
      expect(meta['description'].length).toBeGreaterThan(50);
      expect(meta['viewport']).toContain('width=device-width');
    });

    test('has Open Graph tags', async ({ page }) => {
      await page.goto('/');
      const meta = await getMetaTags(page);

      expect(meta['og:title']).toBeTruthy();
      expect(meta['og:description']).toBeTruthy();
      expect(meta['og:type']).toBe('website');
      expect(meta['og:site_name']).toBe('Verbatim');
      expect(meta['og:locale']).toBe('en_US');
    });

    test('has Twitter Card tags', async ({ page }) => {
      await page.goto('/');
      const meta = await getMetaTags(page);

      expect(meta['twitter:card']).toBe('summary_large_image');
      expect(meta['twitter:title']).toBeTruthy();
      expect(meta['twitter:description']).toBeTruthy();
    });

    test('has theme color', async ({ page }) => {
      await page.goto('/');
      const meta = await getMetaTags(page);

      expect(meta['theme-color']).toBeTruthy();
    });

    test('has keywords meta tag', async ({ page }) => {
      await page.goto('/');
      const meta = await getMetaTags(page);

      expect(meta['keywords']).toBeTruthy();
      expect(meta['keywords']).toContain('transcription');
    });

    test('has robots meta tag allowing indexing', async ({ page }) => {
      await page.goto('/');
      const meta = await getMetaTags(page);

      expect(meta['robots']).toContain('index');
      expect(meta['robots']).toContain('follow');
    });

    test('has apple touch icon', async ({ page }) => {
      await page.goto('/');
      const meta = await getMetaTags(page);

      expect(meta['apple-touch-icon']).toBeTruthy();
      expect(meta['apple-touch-icon']).toContain('apple-icon');
    });
  });

  test.describe('Login Page', () => {
    test('has appropriate meta tags', async ({ page }) => {
      await page.goto('/login');
      const meta = await getMetaTags(page);

      expect(meta['title']).toContain('Verbatim');
      expect(meta['description']).toBeTruthy();
    });
  });

  test.describe('Docs Page', () => {
    test('has appropriate meta tags', async ({ page }) => {
      await page.goto('/docs');
      const meta = await getMetaTags(page);

      expect(meta['title']).toContain('Verbatim');
      expect(meta['description']).toBeTruthy();
    });
  });

  test.describe('Pricing Page', () => {
    test('has appropriate meta tags', async ({ page }) => {
      await page.goto('/pricing');
      const meta = await getMetaTags(page);

      expect(meta['title']).toContain('Verbatim');
      expect(meta['description']).toBeTruthy();
    });
  });

  test.describe('Terms Page', () => {
    test('has appropriate meta tags', async ({ page }) => {
      await page.goto('/terms');
      const meta = await getMetaTags(page);

      expect(meta['title']).toContain('Verbatim');
    });
  });

  test.describe('Privacy Page', () => {
    test('has appropriate meta tags', async ({ page }) => {
      await page.goto('/privacy');
      const meta = await getMetaTags(page);

      expect(meta['title']).toContain('Verbatim');
    });
  });
});

test.describe('Structured Data', () => {
  test('landing page has proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Should have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    // H1 should be in the hero section
    const h1 = page.locator('h1');
    await expect(h1).toContainText('Transcribe');
  });

  test('app page has proper heading hierarchy', async ({ page }) => {
    // Need to authenticate first
    await page.goto('/login');
    const verifyUrl = await page.evaluate(async () => {
      const response = await fetch('/api/dev/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'seo-test@example.com' }),
      });
      const data = await response.json();
      return data.verifyUrl;
    });
    await page.goto(verifyUrl);
    await page.waitForURL('/app', { timeout: 10000 });

    // Should have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });
});

test.describe('Accessibility SEO', () => {
  test('images have alt text', async ({ page }) => {
    await page.goto('/');

    // Check that all images have alt attributes (or are decorative with empty alt)
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      // Should have alt attribute (can be empty for decorative images)
      expect(alt).not.toBeNull();
    }
  });

  test('links have accessible names', async ({ page }) => {
    await page.goto('/');

    // Check main navigation links
    const nav = page.locator('nav');
    const links = await nav.locator('a').all();

    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      // Link should have either text content or aria-label
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });

  test('page has lang attribute', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    const lang = await html.getAttribute('lang');
    expect(lang).toBeTruthy();
    expect(lang).toBe('en');
  });
});
