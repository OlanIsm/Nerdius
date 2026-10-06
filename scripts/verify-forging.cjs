const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('@playwright/test');

(async () => {
  const { initialGame } = await import('../backend/src/modules/game/state.ts');
  const { gameSnapshot } = await import('../backend/src/modules/game/snapshot.ts');
  const state = initialGame();
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 430, height: 932 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/auth/v1/**', route => route.fulfill({ json: {
      access_token: 'test-token', refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer',
      user: { id: 'test-user', aud: 'authenticated', created_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, is_anonymous: true },
    } }));
    await page.route('**/api/game', route => route.fulfill({ json: gameSnapshot(state) }));
    let release;
    let requestCount = 0;
    await page.route('**/api/game/forge', async route => {
      requestCount++;
      const result = await new Promise(resolve => { release = resolve; });
      if (result === 'failed') return route.fulfill({ status: 503, json: { error: 'Gemini is still busy after 3 attempts. Wait a moment, then upload the PDF again.' } });
      state.expeditions.push({ ...structuredClone(state.expeditions[0]), id: `pdf-${requestCount}`, title: `Forged notes ${requestCount}`, file: 'notes.pdf' });
      return route.fulfill({ json: gameSnapshot(state) });
    });
    await page.goto(process.env.APP_URL || 'http://localhost:5173', { waitUntil: 'networkidle' });
    const file = { name: 'A very long machine learning study material filename for testing.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7 test') };
    await page.getByLabel('Study file', { exact: true }).setInputFiles(file);
    await page.getByRole('button', { name: 'Forge Adventure', exact: true }).click();
    await page.getByRole('dialog', { name: 'Forging adventure', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Minimize', exact: true }).count(), 0, 'No minimize before three seconds');
    await page.getByRole('button', { name: 'Minimize', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Minimize', exact: true }).click();
    await page.locator('[data-forge-status="processing"]').waitFor();
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await page.getByLabel('Study file', { exact: true }).isDisabled(), true, 'Only one forge can run');
    fs.mkdirSync('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/forge-minimized-mobile.png' });
    await page.getByRole('tab', { name: 'Bag', exact: true }).click();
    release('ready');
    await page.getByTestId('forge-notification').waitFor();
    assert.equal(await page.locator('.app').getAttribute('data-screen'), 'Bag', 'Completion does not interrupt navigation');
    assert.equal(await page.getByTestId('forge-notification').getAttribute('aria-label'), 'Your adventure is ready');
    await page.screenshot({ path: 'test-results/forge-badge-mobile.png' });
    await page.getByRole('tab', { name: 'Hub', exact: true }).click();
    assert.equal(await page.getByTestId('forge-notification').count(), 0);
    await page.getByText('Adventure ready!', { exact: true }).waitFor();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: 'test-results/forge-ready-desktop.png' });
    await page.getByRole('button', { name: 'Open adventure', exact: true }).click();
    assert.equal(await page.locator('.app').getAttribute('data-screen'), 'Region');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('tab', { name: 'Hub', exact: true }).click();
    await page.getByLabel('Study file', { exact: true }).setInputFiles(file);
    await page.getByRole('button', { name: 'Forge Adventure', exact: true }).click();
    await page.getByRole('button', { name: 'Minimize', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Minimize', exact: true }).click();
    await page.getByRole('tab', { name: 'Bazaar', exact: true }).click();
    release('failed');
    await page.getByTestId('forge-notification').waitFor();
    assert.equal(await page.locator('.app').getAttribute('data-screen'), 'Bazaar');
    assert.equal(await page.getByRole('dialog').count(), 0, 'Minimized failures do not open an interrupting journal');
    await page.getByRole('tab', { name: 'Hub', exact: true }).click();
    await page.locator('[data-forge-status="failed"]').waitFor();
    await page.getByRole('button', { name: 'Retry forge', exact: true }).click();
    await page.getByRole('dialog', { name: 'Forging adventure', exact: true }).waitFor();
    // Wait for the retry's request before releasing it; no duplicated request or lost File.
    await page.waitForFunction(() => document.querySelector('[data-forge-status]')?.dataset.forgeStatus === 'processing');
    const deadline = Date.now() + 5000;
    while (requestCount < 3 && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(requestCount, 3, 'Retry starts one request');
    release('ready');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(requestCount, 3);
    assert.deepEqual(errors, []);
    console.log('PASS minimized forge: three-second threshold, navigation, success/failure Hub badges, acknowledgement, retry and mobile/desktop');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
