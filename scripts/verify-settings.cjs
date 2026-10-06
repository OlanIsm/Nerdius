const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('@playwright/test');

(async () => {
  const { initialGame } = await import('../backend/src/modules/game/state.ts');
  const { gameSnapshot } = await import('../backend/src/modules/game/snapshot.ts');
  const state = initialGame();
  state.expeditions[0].progress = 33;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 640 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/auth/v1/**', route => route.fulfill({ json: {
      access_token: 'test-token', refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer',
      user: { id: 'settings-user', aud: 'authenticated', created_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, is_anonymous: true },
    } }));
    await page.route('**/api/game', route => route.fulfill({ json: gameSnapshot(state) }));
    let accountFailure = true;
    let accountRequests = 0;
    await page.route('**/api/me', route => {
      accountRequests++;
      assert.equal(route.request().headers().authorization, 'Bearer test-token');
      return route.fulfill(accountFailure
        ? { status: 503, json: { error: 'auth_unavailable' } }
        : { json: { user: { id: 'settings-user', email: null }, entitlements: null } });
    });
    const base = process.env.APP_URL || 'http://localhost:5173';
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await page.getByText('Every great quest starts with a little knowledge.', { exact: true }).count(), 0);
    await page.getByText('PDF, DOCX · Max 25 MB', { exact: true }).waitFor();
    fs.mkdirSync('.impeccable/review', { recursive: true });
    await page.screenshot({ path: '.impeccable/review/hub-mobile.png' });
    await page.getByRole('tab', { name: 'Expedition', exact: true }).click();
    assert.equal(await page.getByText('A chapter at a time. A little further every day.', { exact: true }).count(), 0);
    assert.equal(await page.locator('.pages').innerText().then(text => /\d+%/.test(text)), false, 'Expedition map replaces numeric percentages');
    await page.screenshot({ path: '.impeccable/review/expedition-mobile.png' });
    await page.getByRole('button', { name: 'Open player profile', exact: true }).click();
    await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor();
    for (const label of ['Profile', 'Preference', 'Plan', 'Account']) await page.getByRole('button', { name: label, exact: true }).waitFor();
    assert.equal(await page.getByRole('dialog').count(), 0, 'Settings uses a page rather than a modal');
    for (const [name, width, height] of [['mobile', 360, 640], ['phone', 430, 932], ['desktop', 1280, 900]]) {
      await page.setViewportSize({ width, height });
      assert.equal(await page.locator('.settings-screen').evaluate(el => el.scrollWidth <= el.clientWidth), true);
      await page.screenshot({ path: `.impeccable/review/settings-${name}.png` });
    }
    await page.getByRole('button', { name: 'Profile', exact: true }).click();
    await page.getByLabel('Display name', { exact: true }).fill('');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('nerdungeon.displayName')), null);
    await page.getByLabel('Display name', { exact: true }).fill('  Scholar Raka  ');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('status').getByText('Saved', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('nerdungeon.displayName')), 'Scholar Raka');
    await page.getByRole('button', { name: 'Open settings', exact: true }).getByText('Scholar Raka', { exact: true }).waitFor();
    await page.setViewportSize({ width: 430, height: 932 });
    await page.screenshot({ path: '.impeccable/review/profile-mobile.png' });
    await page.getByRole('button', { name: 'Back to settings', exact: true }).click();
    await page.getByRole('button', { name: 'Preference', exact: true }).click();
    await page.getByRole('switch', { name: 'Summon sound', exact: true }).uncheck();
    await page.getByRole('switch', { name: /Reduce motion/ }).check();
    assert.equal(await page.evaluate(() => localStorage.getItem('nerdungeon.summonSound')), 'off');
    assert.equal(await page.locator('.app').getAttribute('data-reduced-motion'), 'true');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    assert.equal(await page.locator('.app').getAttribute('data-reduced-motion'), 'true', 'Saved preference reduces motion without an OS setting');
    await page.screenshot({ path: '.impeccable/review/preferences-mobile.png' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Open settings', exact: true }).getByText('Scholar Raka', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Open player profile', exact: true }).click();
    await page.getByRole('button', { name: 'Preference', exact: true }).click();
    assert.equal(await page.getByRole('switch', { name: 'Summon sound', exact: true }).isChecked(), false);
    assert.equal(await page.getByRole('switch', { name: /Reduce motion/ }).isChecked(), true);
    await page.getByRole('button', { name: 'Back to settings', exact: true }).click();
    await page.getByRole('button', { name: 'Plan', exact: true }).click();
    for (const [label, price] of [['Free', 'Rp0'], ['Traveler', 'Rp35.000'], ['Master', 'Rp80.000']]) {
      const plan = page.getByRole('article', { name: `${label} plan`, exact: true });
      await plan.getByRole('heading', { name: label, exact: true }).waitFor();
      assert.match(await plan.innerText(), new RegExp(price.replace('.', '\\.')));
      await plan.getByText('/ bulan', { exact: true }).waitFor();
    }
    for (const button of await page.getByRole('button', { name: 'Coming soon', exact: true }).all()) assert.equal(await button.isDisabled(), true);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: '.impeccable/review/plans-desktop.png' });
    await page.setViewportSize({ width: 430, height: 932 });
    await page.screenshot({ path: '.impeccable/review/plans-mobile.png' });
    await page.getByRole('button', { name: 'Back to settings', exact: true }).click();
    await page.getByRole('button', { name: 'Account', exact: true }).click();
    await page.getByRole('alert').getByText('Could not load account. Try again.', { exact: true }).waitFor();
    accountFailure = false;
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await page.getByRole('heading', { name: 'Guest account', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Account ID', { exact: true }).inputValue(), 'settings-user');
    assert.equal(accountRequests, 2);
    await page.screenshot({ path: '.impeccable/review/account-mobile.png' });
    await page.getByRole('button', { name: 'Back to settings', exact: true }).click();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    assert.equal(await page.locator('.app').getAttribute('data-screen'), 'Hub');
    await page.getByRole('tab', { name: 'Bazaar', exact: true }).click();
    await page.getByRole('button', { name: 'Open player profile', exact: true }).click();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    assert.equal(await page.locator('.app').getAttribute('data-screen'), 'Bazaar', 'Back returns to the screen that opened settings');
    assert.deepEqual(errors, []);
    console.log('PASS concise Hub/Expedition copy, bento settings, saved profile/preferences, monthly plans, real account/retry, return navigation and mobile/desktop');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
