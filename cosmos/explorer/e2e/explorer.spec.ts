import { test, expect } from '@playwright/test';

test('loads with extragalactic badge and 9-mode nav', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toContainText('আকাশগঙ্গা: বাদ');
  await expect(page.getByRole('region', { name: 'মহাজাগতিক দৃশ্য' })).toBeVisible();
  await expect(page.getByRole('button', { name: '৯ · Model Lab' })).toBeVisible();
});

test('keyboard 1-9 switches view modes', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('8');
  await expect(page.getByText('Statistics & Physics Inspector')).toBeVisible();
  await page.keyboard.press('9');
  await expect(page.getByText('Model Lab & Ensemble Compare')).toBeVisible();
  await page.keyboard.press('3');
  await expect(page.getByText(/BAO রিং/)).toBeVisible();
});

test('dual-scope switch shows Local scope with L0 handoff', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Local', exact: true }).click();
  await expect(page.getByText('Local Universe Scope')).toBeVisible();
  await expect(page.getByText(/L0 সৌরজগৎ মডিউল/)).toBeVisible();
  await page.getByRole('button', { name: 'Extragalactic' }).click();
  await expect(page.getByRole('banner')).toContainText('আকাশগঙ্গা: বাদ');
});

test('frame toggle and caveat counter are visible', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Comoving-now/ }).click();
  await expect(page.getByText(/caveats/)).toBeVisible();
});

test('comoving view shows unphysical-viewpoint banner', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('5');
  await expect(page.getByRole('alert')).toContainText('অভৌত দৃষ্টিকোণ');
});
