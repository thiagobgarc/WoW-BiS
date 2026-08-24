import { test, expect } from '@playwright/test';

// On a cold dev-server start, Vite discovers and pre-bundles dependencies
// lazily as new modules are reached (e.g. Radix Tabs is only imported once
// the character page's upgrade board actually renders), and each discovery
// can trigger a full page reload mid-interaction — dropping in-flight clicks
// entirely rather than just delaying them. Warming up every route the test
// will touch, once, before the real assertions run avoids that class of
// flake without needing to retry every individual interaction.
test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.goto('/character/us/illidan/arthas', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.close();
});

test('search for a character and see the full upgrade board', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Find Your Upgrades' })).toBeVisible();

  await page.getByPlaceholder('Character name').fill('Arthas');
  const realmInput = page.getByPlaceholder('Realm');
  await realmInput.fill('Illidan');
  await realmInput.press('Escape'); // close the autocomplete dropdown before it can occlude the Search button

  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page).toHaveURL(/\/character\/us\/illidan\/arthas$/);

  // Paper doll + header rendered with real (mock) data.
  await expect(page.getByRole('heading', { name: 'Arthas' })).toBeVisible();
  await expect(page.getByText('Frost Death Knight')).toBeVisible();
  await expect(page.getByText('Showing sample data')).toBeVisible();

  // The upgrade board rendered below it, with the BiS-seeded Frost DK data.
  await expect(page.getByRole('heading', { name: 'Upgrade Board' })).toBeVisible();
  await expect(page.getByText(/of 16 slots/)).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Raid' })).toBeVisible();

  // Switching content-type tabs re-renders the comparison rows for that tab.
  await page.getByRole('tab', { name: 'Mythic+' }).click();
  await expect(page.getByRole('tab', { name: 'Mythic+' })).toHaveAttribute('data-state', 'active');

  // Recently-viewed chip appears back on the search page after a visit.
  await page.getByRole('link', { name: /Mythos/ }).click();
  await expect(page.getByText('Arthas • Illidan • US')).toBeVisible();
});
