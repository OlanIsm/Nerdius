const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('@playwright/test');
async function exitBattle(page) {
  await page.getByRole('button', { name: 'Battle menu', exact: true }).click();
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm exit', exact: true }).click();
  await page.getByRole('button', { name: 'Start Adventure', exact: true }).waitFor();
}
const state = { gold: 1450, gems: 1450, xp: 1771, favor: 3,
  inventory: ['Blue Mage Robe', 'Quill Staff', 'Spectacles', 'HP Elixir'],
  expeditions: [{ id: 'test', title: 'Walk Test', file: 'walk.pdf', progress: 0, regions: [{ chapter: 1, title: 'Forest', summary: 'Walk', topics: ['Walk'], questions: 1, enemies: 1 }] }],
  lastAdventure: { expeditionId: 'test', chapter: 1 } };
(async () => {
  const { applyGameAction, initialGame } = await import('../backend/src/modules/game/state.ts');
  const { gameSnapshot } = await import('../backend/src/modules/game/index.ts');
  state.expeditions[0].regions[0].questionBank = initialGame().expeditions[0].regions[0].questionBank;
  state.expeditions[0].regions[0].questions = 10;
  const authSession = {
    access_token: 'test-token', refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer',
    user: { id: 'test-user', aud: 'authenticated', created_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, is_anonymous: true },
  };
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
    const errors = [], assets = [], actions = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().includes('.webp') || response.url().includes('.png')) assets.push(response.url());
    });
    await page.route('**/auth/v1/**', route => route.fulfill({ json: authSession }));
    let releaseStart;
    let delayStart = false;
    let rejectStart = false;
    let rejectExit = false;
    await page.route('**/api/game', async route => {
      let rewards = [];
      if (route.request().method() === 'POST') {
        const action = route.request().postDataJSON(); actions.push(action);
        if (action.action === 'start' && delayStart) {
          delayStart = false;
          await new Promise(resolve => { releaseStart = resolve; });
        }
        if (action.action === 'exit' && rejectExit) {
          rejectExit = false;
          return route.fulfill({ status: 503, json: { error: 'Could not exit battle. Try again.' } });
        }
        if (action.action === 'start' && rejectStart) {
          rejectStart = false;
          return route.fulfill({ status: 503, json: { error: 'Could not start battle. Try again.' } });
        }
        try { rewards = applyGameAction(state, action); }
        catch (error) { return route.fulfill({ status: 400, json: { error: error.message } }); }
      }
      return route.fulfill({ json: gameSnapshot(state, rewards) });
    });
    await page.route('**/api/game/forge', route => {
      assert(route.request().postDataBuffer().includes(Buffer.from('%PDF')), 'native File reaches multipart upload');
      state.expeditions.push({ ...state.expeditions[0], id: 'upload', title: 'Uploaded Notes', file: 'notes.pdf' });
      return route.fulfill({ json: gameSnapshot(state) });
    });
    await page.goto(process.env.APP_URL || 'http://localhost:5173', { waitUntil: 'networkidle' });
    await page.getByText('The Study Forge', { exact: true }).waitFor();
    assert.equal(await page.locator('canvas').count(), 0, 'engine stays outside React shell');
    fs.mkdirSync('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/react-hub.png' });
    await page.getByRole('tab', { name: 'Bag', exact: true }).click();
    await page.getByRole('button', { name: 'Quill Staff', exact: true }).click();
    await page.getByLabel('Selected item details').getByText('Quill Staff', { exact: true }).waitFor();
    await page.getByRole('tab', { name: 'Potions', exact: true }).click();
    assert.equal(await page.getByLabel('Bag items').getByRole('button').count(), 1, 'one potion category item retained');
    await page.getByRole('tab', { name: 'Bazaar', exact: true }).click();
    async function collectSummon(count) {
      for (let i = 0; i < count; i++) {
        await page.getByRole('button', { name: `Reveal card ${i + 1} of ${count}`, exact: true }).click();
        await page.waitForTimeout(650);
        await page.getByRole('button', { name: i + 1 === count ? 'View rewards' : 'Next card', exact: true }).click();
      }
      await page.getByRole('button', { name: 'Return to Bazaar', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Summon 10x', exact: true }).click();
    await collectSummon(10);
    assert.equal(actions.find(action => action.action === 'summon').count, 10, 'Summon 10x sends ten pulls');
    await page.getByRole('button', { name: 'Summon 1x', exact: true }).click();
    await collectSummon(1);
    assert.deepEqual(actions.filter(action => action.action === 'summon').map(action => action.count), [10, 1]);
    await page.getByRole('tab', { name: 'Expedition', exact: true }).click();
    await page.getByRole('button', { name: 'Open Chapter 1: Forest', exact: true }).click();
    await page.getByRole('button', { name: 'View chapter', exact: true }).click();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('tab', { name: 'Hub', exact: true }).click();
    await page.getByLabel('Study file', { exact: true }).setInputFiles({ name: 'notes.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nnotes') });
    await page.getByRole('button', { name: 'Forge Adventure', exact: true }).click();
    await page.getByRole('button', { name: 'Select Uploaded Notes', exact: true }).waitFor();
    await page.getByRole('tab', { name: 'Hub', exact: true }).click();
    delayStart = true; rejectStart = true;
    await page.getByRole('button', { name: 'Continue Adventure', exact: true }).click();
    await page.getByRole('button', { name: 'Start Adventure', exact: true }).click();
    await page.locator('.gate.closing.closed').waitFor({ timeout: 1000 });
    await page.getByTestId('gate-loading').waitFor();
    releaseStart();
    await page.getByRole('dialog').getByText('Could not start battle. Try again.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    assert.equal(await page.getByTestId('fight-page').count(), 0, 'Failed start returns to chapter');
    await page.getByRole('button', { name: 'Start Adventure', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('tab', { name: 'Hub', exact: true }).click();
    async function enter(slowStart = false) {
      await page.getByRole('button', { name: 'Continue Adventure', exact: true }).click();
      if (slowStart) delayStart = true;
      await page.getByRole('button', { name: 'Start Adventure', exact: true }).click();
      if (slowStart) await page.locator('.gate.closing.closed').waitFor({ timeout: 1000 });
      await page.getByTestId('gate-loading').waitFor();
      if (slowStart) {
        assert.equal(await page.locator('canvas').count(), 0, 'Game waits behind closed doors for start response');
        const loadingStarted = await page.getByTestId('fight-page').getAttribute('data-loading-started');
        await page.waitForTimeout(1700);
        assert.equal(await page.getByTestId('fight-page').getAttribute('data-phase'), 'loading', 'Doors stay closed while backend is pending');
        releaseStart();
        await page.locator('canvas').waitFor();
        assert.equal(await page.getByTestId('fight-page').getAttribute('data-loading-started'), loadingStarted, 'Start response does not restart door closing');
      }
      const gate = await page.getByTestId('gate-loading').boundingBox();
      assert.equal(gate.y, 0, 'gate fills viewport without inherited scroll');
      assert.equal(gate.height, 932);
      await page.screenshot({ path: 'test-results/gate-closed.png' });
      await page.getByTestId('gate-loading').waitFor({ state: 'hidden' });
      const held = await page.getByTestId('fight-page').evaluate(element => performance.now() - Number(element.dataset.loadingStarted));
      assert(held >= 1500, 'closed doors hold for loading minimum');
      await page.getByTestId('gate-opening').waitFor({ state: 'hidden' });
      assert.equal(await page.locator('canvas').count(), 1, 'one Phaser instance');
    }
    const gemsBeforeBattle = state.gems;
    await enter(true);
    const world = page.getByTestId('phaser-world');
    assert.equal(await world.getAttribute('data-renderer'), 'WebGL');
    const first = await world.getAttribute('data-walk-frame');
    await page.waitForTimeout(150);
    assert.notEqual(await world.getAttribute('data-walk-frame'), first, 'Phaser walk animation advances');
    const urls = JSON.parse(await world.getAttribute('data-layers'));
    assert.equal(urls.length, 11);
    assert(
      urls.every(
        url =>
          decodeURIComponent(url).includes('/savannah parallax/Savannah Parallax/') &&
          url.endsWith('.webp'),
      ),
      'all parallax textures use Savannah assets',
    );
    assert(urls.every(url => assets.includes(url)), 'all textures loaded by Phaser');
    await page.getByRole('button', { name: 'Battle menu', exact: true }).click();
    const stopped = await world.getAttribute('data-walk-frame');
    const distance = await world.getAttribute('data-distance');
    await page.waitForTimeout(250);
    assert.equal(await world.getAttribute('data-walk-frame'), stopped, 'pause menu freezes sprite');
    assert.equal(await world.getAttribute('data-distance'), distance, 'pause menu freezes traversal');
    await page.screenshot({ path: 'test-results/combat-menu-mobile.png' });
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Exit', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.screenshot({ path: 'test-results/phaser-game.png' });
    async function assertStaticQuiz(buttonLabel) {
      const footer = page.getByTestId('combat-quiz');
      const size = await footer.evaluate(element => ({ height: element.clientHeight, content: element.scrollHeight, scroll: element.scrollTop, overflow: getComputedStyle(element).overflowY }));
      assert(size.content <= size.height + 1, 'Quiz contents fit without scrolling');
      assert.equal(size.scroll, 0);
      assert.notEqual(size.overflow, 'auto');
      const bounds = await page.getByRole('button', { name: buttonLabel, exact: true }).boundingBox();
      assert(bounds.y >= 0 && bounds.y + bounds.height <= page.viewportSize().height, 'Action button stays in viewport');
      const hearts = page.locator('.health-heart');
      assert.equal(await hearts.count(), await page.locator('#enemy-hp').count() + 1);
      assert(await hearts.first().evaluate(img => img.complete && img.naturalWidth > 0 && img.src.includes('Heart')), 'HP uses loaded Heart asset');
    }
    for (let encounter = 0; encounter < 5; encounter++) {
      await page.getByRole('button', { name: 'Submit answer', exact: true }).waitFor();
      const visual = await page.getByTestId('combat-visual').boundingBox();
      const quiz = await page.getByTestId('combat-quiz').boundingBox();
      const canvasBounds = await page.locator('canvas').boundingBox();
      assert(visual.y + visual.height <= quiz.y + 1, 'Visual and quiz have separate rows');
      assert(canvasBounds.y + canvasBounds.height <= quiz.y + 1, 'Quiz never covers the Phaser canvas');
      const hpPanel = await page.getByRole('region', { name: 'Player health', exact: true }).boundingBox();
      assert(hpPanel.y >= visual.y + visual.height - 1, 'Player HP is below the visual');
      assert(hpPanel.y + hpPanel.height <= quiz.y + 1, 'Player HP has a separate panel above quiz');
      assert.equal(await page.getByTestId('combat-quiz').locator('#player-hp').count(), 0, 'HP is outside quiz DOM');
      assert(await page.locator('.player-health').evaluate(element => getComputedStyle(element).backgroundImage.includes('Plank')), 'HP panel reuses navbar plank asset');
      assert((await page.locator('#enemy-hp').boundingBox()).y < quiz.y, 'Enemy HP belongs to the visual row');
      assert.equal(await world.getAttribute('data-hero-texture'), 'scholar-idle', 'encounters use the standing texture instead of a frozen walk frame');
      const idleFrame = await world.getAttribute('data-walk-frame');
      await page.waitForTimeout(150);
      assert.equal(await world.getAttribute('data-walk-frame'), idleFrame, 'idle pose stays still during encounters');
      if (encounter === 0) {
        for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 530, height: 900 }, { width: 1280, height: 900 }]) {
          await page.setViewportSize(viewport);
          await assertStaticQuiz('Submit answer');
          await page.screenshot({ path: `test-results/static-quiz-${viewport.width}.png` });
        }
        await page.setViewportSize({ width: 430, height: 932 });
        await page.screenshot({ path: 'test-results/phaser-idle.png' });
      }
      const bank = state.expeditions[0].regions[0].questionBank;
      const target = (encounter + 1) * 2;
      while (state.battle.answers.length < target) {
        const question = bank[state.battle.answers.length];
        await page.setViewportSize({ width: 360, height: 640 });
        await assertStaticQuiz('Submit answer');
        await page.setViewportSize({ width: 430, height: 932 });
        await page.getByRole('radio', { name: question.options[question.answerIndex], exact: true }).check();
        await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
        await page.getByText('Correct!', { exact: true }).waitFor();
        assert.equal(await page.locator('.feedback-correction').count(), 0);
        await page.setViewportSize({ width: 360, height: 640 });
        await assertStaticQuiz('Next');
        await page.setViewportSize({ width: 430, height: 932 });
        if (encounter === 0 && state.battle.answers.length === 1) {
          await page.screenshot({ path: 'test-results/combat-feedback-mobile.png' });
          await page.setViewportSize({ width: 1280, height: 900 });
          await page.screenshot({ path: 'test-results/combat-feedback-desktop.png' });
          await page.getByRole('button', { name: 'Battle menu', exact: true }).click();
          await page.screenshot({ path: 'test-results/combat-menu-desktop.png' });
          await page.keyboard.press('Escape');
          await page.setViewportSize({ width: 430, height: 932 });
        }
        if (state.battle.answers.length % 2 === 0) {
          await page.waitForFunction(() => document.querySelector('[data-testid="phaser-world"]').dataset.enemies === '0');
          assert.equal(await page.locator('#enemy-hp').count(), 0, 'Defeated enemy has no HP bar');
          await page.waitForFunction(() => document.querySelector('[data-testid="phaser-world"]').dataset.lootPhase === 'ground');
          if (encounter === 0) {
            await page.screenshot({ path: 'test-results/combat-loot-ground-mobile.png' });
            await page.setViewportSize({ width: 1280, height: 900 });
            await page.screenshot({ path: 'test-results/combat-loot-ground-desktop.png' });
            await page.setViewportSize({ width: 430, height: 932 });
            await page.getByRole('button', { name: 'Battle menu', exact: true }).click();
            const lootCount = await world.getAttribute('data-loot-count');
            await page.waitForTimeout(250);
            assert.equal(await world.getAttribute('data-loot-count'), lootCount, 'Pause freezes drops');
            await page.getByRole('button', { name: 'Continue', exact: true }).click();
          }
        }
        await page.getByRole('button', { name: 'Next', exact: true }).click();
      }
      await page.waitForFunction(() => document.querySelector('[data-testid="phaser-world"]').dataset.phase === 'walking');
      assert.equal(await page.locator('#enemy-hp').count(), 0, 'No enemy HP while walking');
      assert.equal(await world.getAttribute('data-enemies'), '0', 'No monster between encounters');
      await page.waitForFunction(() => document.querySelector('[data-testid="phaser-world"]').dataset.lootPhase === 'collecting');
      if (encounter === 0) await page.screenshot({ path: 'test-results/combat-loot-collect-mobile.png' });
      await page.waitForFunction(() => document.querySelector('[data-testid="phaser-world"]').dataset.lootCount === '0');
      assert.equal(state.gold, 1450, 'Drops do not enter balance before complete');

    }
    await page.getByTestId('fight-status').getByText('Chapter cleared!', { exact: true }).waitFor();
    assert.equal(await world.getAttribute('data-hero-texture'), 'scholar-idle', 'result uses standing pose');
    assert.equal(actions.filter(action => action.action === 'complete').length, 1, 'completion submitted once');
    assert.equal(state.gold, 2400);
    assert.equal(state.gems, gemsBeforeBattle + 250);
    const goldBeforeFailure = state.gold;
    await page.getByRole('button', { name: 'Retry chapter', exact: true }).click();
    const bank = state.expeditions[0].regions[0].questionBank;
    await page.getByRole('radio', { name: bank[0].options[(bank[0].answerIndex + 1) % 4], exact: true }).check();
    await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
    await page.getByText('Not quite', { exact: true }).waitFor();
    assert.equal(await page.locator('#player-hp').getAttribute('value'), '450');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    for (const question of bank.slice(1, 3)) {
      await page.getByRole('radio', { name: question.options[question.answerIndex], exact: true }).check();
      await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
      await page.getByText('Correct!', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    await page.waitForFunction(() => document.querySelector('[data-testid="phaser-world"]').dataset.phase === 'walking');
    assert.equal(await page.locator('#enemy-hp').count(), 0);
    const gemsBeforeExit = state.gems;
    rejectExit = true;
    await page.getByRole('button', { name: 'Battle menu', exact: true }).click();
    await page.getByRole('button', { name: 'Exit', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm exit', exact: true }).click();
    await page.getByRole('alert').getByText('Could not exit battle. Try again.', { exact: true }).waitFor();
    assert.equal(state.battle.answers.length, 3, 'Failed exit preserves accepted answers and pending drops');
    assert.equal(await page.locator('canvas').count(), 1, 'Failed exit stays in battle');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    const exitedId = state.battle.id;
    const earnedGold = state.gold;
    const chapterProgress = state.expeditions[0].progress;
    await exitBattle(page);
    await page.getByRole('button', { name: 'Start Adventure', exact: true }).waitFor();
    assert.equal(state.battle, undefined, 'Exit clears saved attempt');
    assert.equal(state.gold, earnedGold);
    assert.equal(state.gems, gemsBeforeExit, "Exit discards pending gems");
    assert.equal(state.expeditions[0].progress, chapterProgress);
    await page.reload({ waitUntil: 'networkidle' });
    await enter();
    await page.getByRole('button', { name: 'Submit answer', exact: true }).waitFor();
    assert.notEqual(state.battle.id, exitedId);
    assert.equal(state.battle.answers.length, 0, 'Exit cannot resume after reload');
    assert.equal(await page.locator('#player-hp').getAttribute('value'), '500');
    await page.getByRole('radio', { name: bank[0].options[(bank[0].answerIndex + 1) % 4], exact: true }).check();
    await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
    await page.getByText('Not quite', { exact: true }).waitFor();
    const oldBattleId = state.battle.id;
    await page.getByRole('button', { name: 'Battle menu', exact: true }).click();
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm restart', exact: true }).click();
    await page.getByRole('button', { name: 'Submit answer', exact: true }).waitFor();
    assert.notEqual(state.battle.id, oldBattleId);
    assert.equal(state.battle.answers.length, 0);
    assert.equal(await page.locator('#player-hp').getAttribute('value'), '500');
    for (const question of bank) {
      await page.getByRole('radio', { name: question.options[(question.answerIndex + 1) % 4], exact: true }).check();
      await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
      await page.getByText('Not quite', { exact: true }).waitFor();
      await assertStaticQuiz('Next');
      if (state.battle.answers.length === 1) await page.screenshot({ path: 'test-results/combat-correction-mobile.png' });
      await page.locator('.feedback-correction').getByText(question.options[question.answerIndex], { exact: false }).waitFor();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    await page.getByTestId('fight-status').getByText('Defeated', { exact: true }).waitFor();
    assert.equal(await page.locator('#player-hp').getAttribute('value'), '0');
    assert.equal(state.gold, goldBeforeFailure, 'Defeat cannot grant rewards');
    await page.screenshot({ path: 'test-results/combat-defeat-mobile.png' });
    await exitBattle(page);
    assert.equal(await page.locator('canvas').count(), 0, 'engine destroyed on exit');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('tab', { name: 'Hub', exact: true }).click();
    await enter();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(150);
    const canvas = await page.locator('canvas').boundingBox();
    const app = await page.locator('.app').boundingBox();
    assert.equal(Math.round(canvas.width), Math.round(app.width - 4), 'canvas follows desktop shell resize');
    await page.screenshot({ path: 'test-results/phaser-desktop.png' });
    await exitBattle(page);
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('tab', { name: 'Hub', exact: true }).click();
    await page.locator('.page-scroll:not([hidden])').evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
    await page.screenshot({ path: 'test-results/react-desktop.png' });
    const reduced = await browser.newPage({ viewport: { width: 430, height: 932 }, reducedMotion: 'reduce' });
    reduced.on('pageerror', error => errors.push(error.message));
    await reduced.route('**/api/game', route => {
      if (route.request().method() === 'POST') applyGameAction(state, route.request().postDataJSON());
      return route.fulfill({ json: gameSnapshot(state) });
    });
    let failGround = true;
    await reduced.route(
      url =>
        decodeURIComponent(url).includes(
          '/savannah parallax/Savannah Parallax/compressed/1.webp',
        ),
      route => {
        if (failGround) return route.abort();
        return route.continue();
      },
    );
    await reduced.goto(process.env.APP_URL || 'http://localhost:5173', { waitUntil: 'networkidle' });
    await reduced.getByRole('button', { name: 'Continue Adventure', exact: true }).click();
    await reduced.getByRole('button', { name: 'Start Adventure', exact: true }).click();
    await reduced.getByRole('alert').getByText('Some assets failed to load.', { exact: true }).waitFor();
    failGround = false;
    await reduced.getByRole('button', { name: 'Retry', exact: true }).click();
    await reduced.getByTestId('gate-ready').waitFor({ state: 'hidden' });
    await reduced.getByRole('button', { name: 'Battle menu', exact: true }).waitFor();
    const reducedWorld = reduced.getByTestId('phaser-world');
    const reducedFrame = await reducedWorld.getAttribute('data-walk-frame');
    await reduced.waitForTimeout(250);
    assert.equal(await reducedWorld.getAttribute('data-walk-frame'), reducedFrame, 'reduced motion freezes walk animation');
    assert.equal(await reduced.locator('canvas').count(), 1, 'asset retry replaces the failed engine');
    await exitBattle(reduced);
    assert.equal(await reduced.locator('canvas').count(), 0);
    await reduced.close();
    const errorPage = await browser.newPage();
    await errorPage.route('**/auth/v1/**', route => route.fulfill({ json: authSession }));
    await errorPage.route('**/api/**', route => route.fulfill({ contentType: 'text/html', body: '<!DOCTYPE html><html><body>Other application</body></html>' }));
    await errorPage.goto(process.env.APP_URL || 'http://localhost:5173', { waitUntil: 'networkidle' });
    const connectionError = 'Game server is not connected. Restart the Nerdungeon backend, then reload this page.';
    await errorPage.getByRole('dialog').getByText(connectionError, { exact: true }).waitFor();
    await errorPage.getByRole('button', { name: 'Continue', exact: true }).click();
    await errorPage.getByLabel('Study file', { exact: true }).setInputFiles({ name: 'notes.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF notes') });
    await errorPage.getByRole('button', { name: 'Forge Adventure', exact: true }).click();
    await errorPage.getByRole('dialog').getByText(connectionError, { exact: true }).waitFor();
    assert.equal(await errorPage.getByText(/Unexpected token/).count(), 0);
    await errorPage.close();
    assert.deepEqual(errors, []);
    console.log('PASS React pages, upload/summon, Phaser WebGL/walk/pause/encounters, gate hold, resize, cleanup/re-entry, asset retry, reduced motion');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
