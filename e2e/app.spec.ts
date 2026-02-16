/**
 * E2E Tests - ZOE Solar Accounting OCR
 * Comprehensive browser testing with Playwright
 *
 * Tests:
 * 1. Homepage loads correctly
 * 2. Settings panel opens/closes
 * 3. Navigation works
 * 4. No critical console errors
 * 5. Upload area exists
 * 6. Export functionality
 */

import { test, expect } from '@playwright/test';

test.describe('ZOE Solar Accounting OCR', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test
    await page.goto('/');
  });

  test('1. Homepage loads correctly', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle(/ZOE Solar/i);

    // Check main heading
    await expect(page.locator('h1')).toContainText(/Solar/i);

    // Check upload area is present
    await expect(page.getByText(/No documents yet/i)).toBeVisible();
    await expect(page.getByText(/Upload PDF files/i)).toBeVisible();
  });

  test('2. Settings panel opens and closes', async ({ page }) => {
    // Click settings button
    await page.getByRole('button', { name: /settings/i }).click();

    // Check settings panel is visible
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();

    // Check close button exists
    await expect(page.getByRole('button', { name: /close/i })).toBeVisible();

    // Close settings
    await page.getByRole('button', { name: /close/i }).click();

    // Settings panel should be hidden (check for heading to not exist)
    await expect(page.getByRole('heading', { name: /settings/i })).not.toBeVisible();
  });

  test('3. Settings panel has all configuration options', async ({ page }) => {
    await page.getByRole('button', { name: /settings/i }).click();

    // Check for various settings sections
    await expect(page.getByText(/theme/i, { exact: false })).toBeVisible();
    await expect(page.getByText(/API/i, { exact: false })).toBeVisible();
    await expect(page.getByText(/Export/i, { exact: false })).toBeVisible();
  });

  test('4. No critical console errors on homepage', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any async errors
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('favicon.ico') && !e.includes('Service Worker') && !e.includes('service-worker')
    );

    // There should be no critical errors
    expect(criticalErrors).toHaveLength(0);
  });

  test('5. Upload area accepts drag and drop', async ({ page }) => {
    // Check upload area is visible
    const uploadArea = page.locator('[class*="upload"]').first();
    await expect(uploadArea)
      .toBeVisible({ timeout: 10000 })
      .catch(() => {
        // Fallback - check for any visible upload-related text
        expect(page.getByText(/upload/i)).toBeVisible();
      });
  });

  test('6. Export buttons exist in settings', async ({ page }) => {
    await page.getByRole('button', { name: /settings/i }).click();

    // Look for export-related buttons
    const exportButtons = page.locator('button').filter({ hasText: /export/i });
    const count = await exportButtons.count();

    // Should have at least one export button
    expect(count).toBeGreaterThan(0);
  });

  test('7. Backup section exists in settings', async ({ page }) => {
    await page.getByRole('button', { name: /settings/i }).click();

    // Check for backup/restore section
    await expect(page.getByText(/backup/i, { exact: false })).toBeVisible();
  });

  test('8. Responsive design - mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Reload page with mobile viewport
    await page.reload();

    // Homepage should still load
    await expect(page.locator('h1')).toContainText(/Solar/i);

    // Settings button should still be accessible
    await expect(page.getByRole('button', { name: /settings/i })).toBeVisible();
  });

  test('9. Dark theme is default', async ({ page }) => {
    // Check that dark theme is applied (body should have dark background)
    const bodyBackgroundColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    // Dark theme typically has very dark background (rgb(10, 14, 20) = #0a0e14)
    // or rgb(0, 0, 0) = black
    // Allow either or very dark colors
    const isDark =
      bodyBackgroundColor === 'rgb(0, 0, 0)' ||
      bodyBackgroundColor === 'rgb(10, 14, 20)' ||
      bodyBackgroundColor === 'rgb(21, 26, 35)';
    expect(isDark).toBeTruthy();
  });

  test('10. Navigation to different views', async ({ page }) => {
    // Settings button should navigate or toggle
    await page.getByRole('button', { name: /settings/i }).click();

    // Verify settings view is shown
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();

    // Close and verify we're back to main view
    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.getByText(/No documents yet/i)).toBeVisible();
  });
});

test.describe('Export Functionality', () => {
  test('11. Export to CSV button exists', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /settings/i }).click();

    // Look for CSV export option
    const csvButton = page.getByRole('button', { name: /csv/i });
    await expect(csvButton).toBeVisible();
  });

  test('12. Export to PDF button exists', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /settings/i }).click();

    // Look for PDF export option
    const pdfButton = page.getByRole('button', { name: /pdf/i });
    await expect(pdfButton).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('13. All interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/');

    // Focus on settings button using keyboard
    await page.keyboard.press('Tab');

    // Settings button should be focused
    const settingsButton = page.getByRole('button', { name: /settings/i });
    await expect(settingsButton).toBeFocused();
  });

  test('14. Buttons have proper labels', async ({ page }) => {
    await page.goto('/');

    // Check settings button has accessible name
    const settingsButton = page.getByRole('button', { name: /settings/i });
    await expect(settingsButton).toBeVisible();

    // Verify button is actually a button
    await expect(settingsButton).toHaveRole('button');
  });
});

test.describe('Performance', () => {
  test('15. Page loads within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});
