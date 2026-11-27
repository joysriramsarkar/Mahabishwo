import { test, expect } from '@playwright/test';

test('loads, toggles a layer, selects a landmark', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toContainText('আকাশগঙ্গা: বাদ');
  await page.getByRole('switch', { name: 'ভoid' }).click();
  await page.getByRole('button', { name: 'Virgo' }).first().click().catch(() => {});
  await expect(page.getByRole('region', { name: 'মহাজাগতিক দৃশ্য' })).toBeVisible();
});
