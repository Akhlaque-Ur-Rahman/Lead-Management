import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage } from '../fixtures/auth';

test.describe('Dialog keyboard accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
  });

  test('lead detail dialog traps focus and closes on Escape', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');
    await expect(page.getByText('Welcome back')).toBeVisible();
    await page.goto('/assigned');
    await expect(page.getByText('Acme Corp').first()).toBeVisible({ timeout: 15_000 });

    const viewButton = page.getByRole('button', { name: 'View' }).first();
    await viewButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedInDialog = await dialog.evaluate((el) => el.contains(document.activeElement));
    expect(focusedInDialog).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});
