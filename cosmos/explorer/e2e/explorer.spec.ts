import { test, expect } from '@playwright/test';
import { tableFromArrays, tableToIPC } from 'apache-arrow';

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

test('dual-scope switch shows Local scope with embedded L0 handoff', async ({ page }) => {
  await page.route('http://localhost:3000/**', (route) => route.fulfill({
    status: 200, contentType: 'text/html', body: '<title>L0 test</title><p>Solar System test harness</p>',
  }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Local', exact: true }).click();
  await expect(page.getByText('Local Universe Scope')).toBeVisible();
  await expect(page.getByText(/L0 সৌরজগৎ মডিউল/)).toBeVisible();
  await page.getByRole('button', { name: 'L0 এখানেই খুলুন' }).click();
  await expect(page.frameLocator('iframe[title="COSMOS L0 Solar System"]').locator('body')).toContainText('Solar System test harness');
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

test('all desktop modes run without uncaught browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  for (const key of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(120);
  }
  expect(errors).toEqual([]);
});

test('Model Lab loads a real Arrow IPC tile and labels it SIM', async ({ page }) => {
  const fixture = tableFromArrays({
    id: new Uint32Array([1, 2, 3]),
    ra: new Float32Array([10, 20, 30]),
    dec: new Float32Array([-5, 0, 5]),
    z_cos: new Float32Array([0.01, 0.02, 0.03]),
    chi: new Float32Array([4.3, 8.6, 12.9]),
    log_mstar: new Float32Array([9, 10, 11]),
    evidence: ['SIM', 'SIM', 'SIM'],
  });
  await page.route('**/v1/lightcone/tiles/2/7', (route) => route.fulfill({
    status: 200,
    contentType: 'application/vnd.apache.arrow.stream',
    body: Buffer.from(tableToIPC(fixture, 'stream')),
    headers: { 'X-Evidence': 'SIM' },
  }));
  await page.goto('/');
  await page.keyboard.press('9');
  await page.getByRole('button', { name: 'Arrow tile লোড' }).click();
  await expect(page.getByText('লোডকৃত SIM বস্তু: 3')).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.getByText('SIM · সিমুলেটেড').first()).toBeVisible();
});
