import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setupAuthenticatedPage } from '../fixtures/auth';

test.describe('Dashboard accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
  });

  test('has no detectable axe violations (mocked auth)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('text=Welcome back');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('.recharts-wrapper')
      .exclude('aside')
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
