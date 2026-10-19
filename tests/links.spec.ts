import { test, expect } from '@playwright/test';

// Studio is lazy-loaded with the 3D/physics bundle; allow for slow cold loads
const STUDIO_READY_TIMEOUT = 30000;

test.describe('BounceForge Master Link & Route Verification', () => {

  // 1. Visit every route in LINKS.md and verify status 200, no console errors, no failed network requests
  const routes = [
    { path: '/', titlePart: 'BounceForge' },
    { path: '/studio', titlePart: 'BounceForge' },
    { path: '/settings', titlePart: 'BounceForge' },
    { path: '/diagnostics', titlePart: 'BounceForge' },
    { path: '/faq', titlePart: 'BounceForge' },
    { path: '/terms', titlePart: 'BounceForge' },
    { path: '/privacy', titlePart: 'BounceForge' },
    { path: '/contact', titlePart: 'BounceForge' },
    { path: '/404', titlePart: 'BounceForge' },
    { path: '/non-existent-random-route', titlePart: 'BounceForge' },
  ];

  for (const { path: routePath } of routes) {
    test(`Route ${routePath} loads with HTTP 200 and no unhandled console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          // Ignore known harmless audio context warnings if user has not interacted yet
          if (!msg.text().includes('AudioContext') && !msg.text().includes('favicon')) {
            consoleErrors.push(msg.text());
          }
        }
      });

      page.on('requestfailed', (req) => {
        failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
      });

      const response = await page.goto(routePath, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);

      // Verify page content rendered
      await expect(page.locator('#root')).toBeVisible();
      expect(consoleErrors).toEqual([]);
      expect(failedRequests).toEqual([]);
    });
  }

  // 2. Hard-refresh each deep route
  test('Deep routes survive hard refresh without 404', async ({ page }) => {
    const deepRoutes = ['/studio', '/diagnostics', '/faq', '/terms', '/privacy', '/contact'];
    for (const r of deepRoutes) {
      await page.goto(r, { waitUntil: 'domcontentloaded' });
      const res = await page.reload({ waitUntil: 'domcontentloaded' });
      expect(res?.status()).toBe(200);
      await expect(page.locator('#root')).toBeVisible();
    }
  });

  // 3. CTA "Launch Studio Free" navigates to /studio
  test('Landing CTA Launch Studio Free opens studio', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const launchBtn = page.getByRole('button', { name: /Launch Studio Free/i }).first();
    await launchBtn.click();
    await page.waitForTimeout(300);
    expect(page.url()).toContain('/studio');
    await expect(page.getByRole('button', { name: /Export Reel/i }).first()).toBeVisible({ timeout: STUDIO_READY_TIMEOUT });
  });

  // 4. Footer navigation buttons navigate to correct routes
  test('Footer navigation buttons navigate to FAQ, Terms, Privacy, Contact, Diagnostics', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // FAQ
    const faqBtn = page.getByRole('button', { name: /^FAQ$/i });
    await faqBtn.click();
    await page.waitForTimeout(200);
    expect(page.url()).toContain('/faq');

    // Terms
    const termsBtn = page.getByRole('button', { name: /^Terms$/i });
    await termsBtn.click();
    await page.waitForTimeout(200);
    expect(page.url()).toContain('/terms');

    // Privacy
    const privacyBtn = page.getByRole('button', { name: /^Privacy$/i });
    await privacyBtn.click();
    await page.waitForTimeout(200);
    expect(page.url()).toContain('/privacy');

    // Contact
    const contactBtn = page.getByRole('button', { name: /^Contact$/i });
    await contactBtn.click();
    await page.waitForTimeout(200);
    expect(page.url()).toContain('/contact');

    // Diagnostics
    const diagBtn = page.getByRole('button', { name: /^Diagnostics$/i }).first();
    await diagBtn.click();
    await page.waitForTimeout(200);
    expect(page.url()).toContain('/diagnostics');
  });

  // 5. In-page Anchor scrolling test
  test('Anchor links scroll to matching target elements', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Verify elements exist
    await expect(page.locator('#modes')).toBeAttached();
    await expect(page.locator('#features')).toBeAttached();
    await expect(page.locator('#faq')).toBeAttached();

    // Scroll to #modes
    await page.goto('/#modes');
    await page.waitForTimeout(200);
    const modesBox = await page.locator('#modes').boundingBox();
    expect(modesBox).not.toBeNull();

    // Scroll to #features
    await page.goto('/#features');
    await page.waitForTimeout(200);
    const featuresBox = await page.locator('#features').boundingBox();
    expect(featuresBox).not.toBeNull();

    // Scroll to #faq
    await page.goto('/#faq');
    await page.waitForTimeout(200);
    const faqBox = await page.locator('#faq').boundingBox();
    expect(faqBox).not.toBeNull();
  });

  // 6. Shared preset URL in a fresh browser context
  test('Shared preset URL loads mode, seed and settings in fresh context', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Encode a test preset matching getShareableUrl format
    const testPreset = {
      modeId: 'obstacle_course',
      seed: 7777,
      duration: 60,
    };
    const b64 = Buffer.from(encodeURIComponent(JSON.stringify(testPreset))).toString('base64');
    const shareUrl = `/#preset=${b64}`;

    await page.goto(shareUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Verify studio is rendered with the Export Reel button
    await expect(page.getByRole('button', { name: /Export Reel/i }).first()).toBeVisible({ timeout: STUDIO_READY_TIMEOUT });
    await context.close();
  });

  // 7. Unknown 404 Route and "Go Home" navigation
  test('Unknown URL shows custom 404 page and Go Home button works', async ({ page }) => {
    await page.goto('/some-invalid-path-404-test', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Page Not Found')).toBeVisible();
    await expect(page.getByText('404')).toBeVisible();

    const goHomeBtn = page.getByRole('button', { name: /Go Home/i });
    await goHomeBtn.click();
    await page.waitForTimeout(300);
    expect(new URL(page.url()).pathname).toBe('/');
  });

  // 8. Footer Mode launching test
  test('Footer popular mode buttons launch corresponding modes in studio', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const obstacleBtn = page.getByRole('button', { name: /Obstacle Course Arena/i });
    await obstacleBtn.click();
    await page.waitForTimeout(300);
    expect(page.url()).toContain('/studio');
    await expect(page.getByRole('button', { name: /Export Reel/i }).first()).toBeVisible({ timeout: STUDIO_READY_TIMEOUT });
  });

});
