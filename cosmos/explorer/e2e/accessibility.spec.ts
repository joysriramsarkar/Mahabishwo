import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** WCAG 2.1 AA automated checks. Manual screen-reader testing remains required. */
test('desktop Explorer has no serious/critical axe violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
  expect(serious.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
  }))).toEqual([]);
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('mobile controls sheet has no serious/critical axe violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'নিয়ন্ত্রণ খুলুন' }).click();
    await expect(page.getByRole('dialog', { name: 'Explorer নিয়ন্ত্রণ' })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([]);
  });
});
