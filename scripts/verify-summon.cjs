const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('@playwright/test');
(async () => {
  const { initialGame, applyGameAction } = await import('../backend/src/modules/game/state.ts');
  const { gameSnapshot } = await import('../backend/src/modules/game/snapshot.ts');
  const state = initialGame(); state.gems = 2500;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.summonAudioContexts = []; window.summonOscillators = 0;
      const Native = window.AudioContext;
      window.AudioContext = class extends Native {
        constructor(...args) { super(...args); window.summonAudioContexts.push(this); }
        createOscillator() { window.summonOscillators++; return super.createOscillator(); }
      };
    });
    await page.route('**/auth/v1/**', route => route.fulfill({ json: {
      access_token: 'test-token', refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer',
      user: { id: 'summon-test', aud: 'authenticated', created_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, is_anonymous: true },
    } }));
    let release, held = true, failed = false, requests = 0, rewards = [];
    await page.route('**/api/game', async route => {
      if (route.request().method() !== 'POST') return route.fulfill({ json: gameSnapshot(state) });
      requests++;
      if (held) { held = false; await new Promise(resolve => { release = resolve; }); }
      if (failed) { failed = false; return route.fulfill({ status: 503, json: { error: 'The vault is unavailable. Try again later.' } }); }
      rewards = applyGameAction(state, route.request().postDataJSON());
      return route.fulfill({ json: gameSnapshot(state, rewards) });
    });
    await page.goto(process.env.APP_URL || 'http://localhost:5173', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Bazaar', exact: true }).click();
    await page.getByRole('button', { name: 'Summon 10x', exact: true }).click();
    await page.evaluate(() => document.querySelector('.summon-action.ten').click());
    await page.locator('.summon-ritual[data-phase="charge"]').waitFor();
    assert.equal(requests, 1, 'Repeated click sends only one paid request');
    assert.equal(await page.locator('.navbar').evaluate(el => Number(getComputedStyle(el).opacity)), 0);
    assert.equal(await page.locator('.player-header').evaluate(el => Number(getComputedStyle(el).opacity)), 0);
    assert.equal(await page.locator('.loot-name').count(), 0, 'No rewards revealed while request is pending');
    assert.equal(await page.getByText(/Something stirs within|Calling your treasures|Your treasures are awakening|A little magic/).count(), 0, 'Chest animation has no narration');
    await page.keyboard.press('Escape');
    assert(await page.getByRole('dialog', { name: 'Summon treasure' }).isVisible());
    fs.mkdirSync('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/summon-charge-mobile.png' });
    release();
    await page.locator('.summon-ritual[data-phase="open"]').waitFor();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'test-results/summon-open-mobile.png' });
    await page.getByRole('button', { name: 'Reveal card 1 of 10', exact: true }).waitFor();
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'test-results/summon-stack-mobile.png' });
    assert.equal(state.gems, 1600);
    assert.equal(await page.locator('.loot-name').count(), 0, 'All cards begin face down');
    assert(await page.evaluate(() => window.summonOscillators > 0), 'User gesture unlocks synthesized SFX');
    const expected = [...rewards];
    for (let i = 0; i < 10; i++) {
      await page.getByRole('button', { name: `Reveal card ${i + 1} of 10`, exact: true }).click();
      assert.equal(await page.locator('.loot-name h3').textContent(), expected[i]);
      assert.equal(await page.locator('.loot-name').count(), 1, 'Only the current item is shown');
      await page.waitForTimeout(650);
      if (i === 0) {
        await page.screenshot({ path: 'test-results/summon-reveal-mobile.png' });
        await page.setViewportSize({ width: 360, height: 640 });
        const bounds = await page.locator('.active-card').boundingBox();
        assert(bounds.y >= 0 && bounds.y + bounds.height < 640);
        await page.screenshot({ path: 'test-results/summon-reveal-small.png' });
        await page.setViewportSize({ width: 430, height: 932 });
      }
      await page.keyboard.press('Enter');
    }
    await page.getByRole('button', { name: 'Return to Bazaar', exact: true }).waitFor();
    assert.equal(await page.locator('.summary-item').count(), 10);
    assert.equal(requests, 1, 'Revealing/collecting never repeats the summon request');
    await page.setViewportSize({ width: 1280, height: 900 });
    assert.equal(await page.locator('.summon-ritual').evaluate(el => el.scrollLeft), 0, 'Dialog cannot shift sideways during resize/focus');
    await page.screenshot({ path: 'test-results/summon-summary-desktop.png' });
    await page.getByRole('button', { name: 'Mute summon sound', exact: true }).click();
    await page.getByRole('button', { name: 'Return to Bazaar', exact: true }).click();
    await page.waitForTimeout(400);
    assert.equal(await page.locator('.navbar').evaluate(el => Number(getComputedStyle(el).opacity)), 1);
    assert(await page.evaluate(() => window.summonAudioContexts.every(context => context.state === 'closed')), 'Audio resources cleaned up');
    failed = true;
    await page.getByRole('button', { name: 'Summon 1x', exact: true }).click();
    await page.getByRole('dialog').getByText('The vault is unavailable. Try again later.', { exact: true }).waitFor();
    assert.equal(state.gems, 1600, 'Rejected request does not spend gems');
    assert.equal(await page.locator('.summon-ritual').count(), 0);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const before = await page.evaluate(() => window.summonOscillators);
    await page.getByRole('button', { name: 'Summon 1x', exact: true }).click();
    await page.getByRole('button', { name: 'Reveal card 1 of 1', exact: true }).waitFor();
    assert.equal(await page.locator('.active-card').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.getByRole('button', { name: 'Reveal card 1 of 1', exact: true }).click();
    await page.waitForTimeout(120);
    await page.getByRole('button', { name: 'View rewards', exact: true }).click();
    await page.getByRole('button', { name: 'Return to Bazaar', exact: true }).waitFor();
    assert.equal(await page.locator('.summary-item').count(), 1);
    assert.equal(await page.evaluate(() => window.summonOscillators), before, 'Mute preference suppresses all SFX');
    assert.equal(state.gems, 1500);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.summon-ritual').count(), 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: 'Summon 1x', exact: true }).click();
    await page.getByRole('button', { name: 'Skip animation', exact: true }).click();
    await page.waitForTimeout(1200);
    assert.equal(await page.locator('.summon-ritual').getAttribute('data-phase'), 'cards', 'Skip cancels intro timers and cannot reopen the chest sequence');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.summon-ritual').getAttribute('data-phase'), 'cards', 'Changing motion preference preserves current reveal');
    await page.getByRole('button', { name: 'Reveal card 1 of 1', exact: true }).click();
    await page.waitForTimeout(120);
    await page.getByRole('button', { name: 'View rewards', exact: true }).click();
    await page.getByRole('button', { name: 'Return to Bazaar', exact: true }).click();
    assert.equal(state.gems, 1400);
    const paidRequests = requests;
    for (const balance of [0, 99, 899]) {
      state.gems = balance;
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByRole('tab', { name: 'Bazaar', exact: true }).click();
      for (const count of balance < 100 ? [1, 10] : [10]) {
        await page.getByRole('button', { name: `Summon ${count}x`, exact: true }).click();
        await page.getByRole('dialog').getByText('Gems tidak cukup.', { exact: true }).waitFor();
        assert.equal(await page.locator('.summon-ritual').count(), 0, 'Insufficient gems never starts animation');
        assert.equal(await page.locator('.app').getAttribute('data-summoning'), 'false');
        assert.equal(await page.evaluate(() => window.summonAudioContexts.length), 0, 'No SFX context created');
        assert.equal(requests, paidRequests, 'Insufficient gems sends no paid request');
        assert.equal(state.gems, balance);
        await page.getByRole('button', { name: 'Continue', exact: true }).click();
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS summon choreography, single paid request, exact ordered backend rewards, sequential card reveals, 1x/10x, failure recovery, SFX lifecycle/mute, reduced motion and small/desktop layouts');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
