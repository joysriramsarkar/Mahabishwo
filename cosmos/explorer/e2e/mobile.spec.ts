import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('mobile layout has no horizontal overflow and opens one bottom sheet', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'নিয়ন্ত্রণ খুলুন' }).click();
  await expect(page.getByRole('dialog', { name: 'Explorer নিয়ন্ত্রণ' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('all nine modes reachable through mobile Views sheet', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'সব ভিউ' }).click();
  const dialog = page.getByRole('dialog', { name: 'সব ভিউ মোড' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button')).toHaveCount(10); // 9 modes + close
  await dialog.getByRole('button', { name: /৯ · Model Lab/ }).click();
  await expect(page.getByText('Model Lab & Ensemble Compare')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Escape closes inspector without losing selection', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('combobox', { name: 'অনুসন্ধান' });
  await search.fill('Virgo');
  await page.getByRole('option', { name: /Virgo/ }).click();
  const dialog = page.getByRole('dialog', { name: 'নির্বাচিত বস্তুর তথ্য' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Virgo');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'তথ্য', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'নির্বাচিত বস্তুর তথ্য' })).toContainText('Virgo');
});

test('search supports keyboard selection and Escape dismissal', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('combobox', { name: 'অনুসন্ধান' });
  await search.fill('Virgo');
  await expect(page.getByRole('option', { name: /Virgo/ })).toBeVisible();
  await search.press('ArrowDown');
  await search.press('Enter');
  await expect(page.getByRole('dialog', { name: 'নির্বাচিত বস্তুর তথ্য' })).toContainText('Virgo');
  await page.keyboard.press('Escape');
  await search.fill('Virgo');
  await search.press('Escape');
  await expect(page.getByRole('option')).toHaveCount(0);
});

test('reduced motion disables autoplay but keeps manual time scrubbing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'সময়', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'সময় নিয়ন্ত্রণ' });
  await expect(dialog.getByRole('button', { name: /reduced-motion/ })).toBeDisabled();
  await expect(dialog.getByRole('slider', { name: 'redshift (z)' })).toBeEnabled();
});
