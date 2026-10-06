const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('@playwright/test');
const { PDFDocument } = require('../backend/node_modules/pdf-lib');
const { createClient } = require('../backend/node_modules/@supabase/supabase-js');

// Live browser test. Run the frontend and backend first. Uses Gemini quota and temporary accounts.
(async () => {
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const users = new Set();
  const paths = new Set();
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 430, height: 932 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', async response => {
      if (response.url().includes('/auth/v1/signup') && response.ok()) {
        const data = await response.json();
        if (data.user?.id) users.add(data.user.id);
      }
    });
    const url = process.env.APP_URL || 'http://localhost:5173';
    const stateResponse = page.waitForResponse(response => response.url().endsWith('/api/game') && response.request().method() === 'GET');
    await page.goto(url, { waitUntil: 'networkidle' });
    const initialResponse = await stateResponse;
    assert.equal(initialResponse.status(), 200);
    const initial = await initialResponse.json();
    assert.equal(initial.expeditions.length, 1);
    assert.equal(initial.expeditions[0].id, 'tutorial');
    await page.getByRole('button', { name: 'Continue Adventure', exact: true }).click();
    async function start() {
      const response = page.waitForResponse(response => response.url().endsWith('/api/game') && response.request().postDataJSON()?.action === 'start');
      await page.getByRole('button', { name: 'Start Adventure', exact: true }).click();
      const started = await response;
      assert.equal(started.status(), 200);
      const data = await started.json();
      assert.equal(data.battle.question.answerIndex, undefined);
      await page.getByTestId('gate-loading').waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: 'Submit answer', exact: true }).waitFor();
      return data;
    }
    let active = await start();
    const userId = [...users][0];
    assert.ok(userId, 'Anonymous browser account created');
    const row = await admin.from('game_states').select('state').eq('user_id', userId).single();
    assert.ok(!row.error);
    const tutorialQuestions = row.data.state.expeditions[0].regions[0].questionBank;
    // One injected transport failure verifies retry UX; other browser requests use the real backend.
    let failOnce = true;
    await page.route('**/api/game', async route => {
      if (route.request().method() === 'POST' && route.request().postDataJSON().action === 'answer' && failOnce) {
        failOnce = false;
        return route.fulfill({ status: 503, json: { error: 'Connection interrupted. Try saving your answer again.' } });
      }
      return route.continue();
    });
    const first = tutorialQuestions[0];
    await page.getByRole('radio', { name: first.options[(first.answerIndex + 1) % 4], exact: true }).check();
    await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
    await page.getByRole('alert').getByText('Connection interrupted. Try saving your answer again.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
    await page.getByText('Not quite', { exact: true }).waitFor();
    fs.mkdirSync('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/learning-feedback-mobile.png' });
    const originalBattleId = active.battle.id;
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Continue Adventure', exact: true }).click();
    const resumedResponse = page.waitForResponse(response => response.url().endsWith('/api/game') && response.request().postDataJSON()?.action === 'start');
    await page.getByRole('button', { name: 'Start Adventure', exact: true }).click();
    active = await (await resumedResponse).json();
    assert.equal(active.battle.id, originalBattleId);
    assert.equal(active.battle.answers.length, 1);
    assert.equal(active.battle.playerHp, 450);
    await page.getByText('Not quite', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    for (const question of tutorialQuestions.slice(1)) {
      await page.getByRole('radio', { name: question.options[question.answerIndex], exact: true }).check();
      await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
      await page.getByText('Correct!', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    await page.getByTestId('fight-status').getByText('Chapter cleared!', { exact: true }).waitFor();
    const completed = await admin.from('game_states').select('state').eq('user_id', userId).single();
    assert.equal(completed.data.state.gold, initial.gold + 850);
    assert.equal(completed.data.state.gems, initial.gems + 200);
    assert.equal(completed.data.state.battleHistory.length, 1);
    await page.screenshot({ path: 'test-results/learning-result-mobile.png' });
    await page.getByRole('button', { name: 'Battle menu', exact: true }).click();
    await page.getByRole('button', { name: 'Exit', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm exit', exact: true }).click();
    await page.getByRole('button', { name: 'Start Adventure', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('tab', { name: 'Hub', exact: true }).click();
    const document = await PDFDocument.create();
    const pdfPage = document.addPage();
    [
      'A triangle has three sides and its interior angles sum to 180 degrees.',
      'An equilateral triangle has three equal sides and three 60 degree angles.',
      'A right triangle has a 90 degree angle. Its longest side is the hypotenuse.',
      'For a right triangle, a squared plus b squared equals c squared.',
      'A right triangle with legs 3 and 4 has a hypotenuse of 5.',
      'The area of a triangle is one half times its base times its height.',
    ].forEach((line, index) => pdfPage.drawText(line, { x: 30, y: 740 - index * 30, size: 11 }));
    await page.getByLabel('Study file', { exact: true }).setInputFiles({ name: 'triangles.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await document.save()) });
    const forgeResponse = page.waitForResponse(response => response.url().endsWith('/api/game/forge'), { timeout: 120000 });
    await page.getByRole('button', { name: 'Forge Adventure', exact: true }).click();
    const forged = await forgeResponse;
    const forgedData = await forged.json();
    assert.equal(forged.status(), 200, JSON.stringify(forgedData));
    const expedition = forgedData.expeditions.find(item => item.id !== 'tutorial');
    paths.add(`${userId}/${expedition.id}.pdf`);
    assert.match(JSON.stringify(expedition.regions), /segitiga|triangle/i);
    await page.getByRole('button', { name: `Select ${expedition.title}`, exact: true }).click();
    await page.getByRole('button', { name: 'View chapter', exact: true }).click();
    await page.getByText('Study material', { exact: true }).waitFor();
    const pdfBattle = await start();
    const saved = await admin.from('game_states').select('state').eq('user_id', userId).single();
    const bank = saved.data.state.expeditions.find(item => item.id === expedition.id).regions[0].questionBank;
    assert.equal(bank.length, 10);
    for (const question of bank) {
      await page.getByRole('radio', { name: question.options[question.answerIndex], exact: true }).check();
      const reply = page.waitForResponse(response => response.url().endsWith('/api/game') && response.request().postDataJSON()?.action === 'answer');
      await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
      const answerResponse = await reply;
      const answerData = await answerResponse.json();
      assert.equal(answerResponse.status(), 200, JSON.stringify(answerData));
      assert.equal(answerData.battle.feedback.questionId, question.id);
      assert.equal(answerData.battle.feedback.correct, true, JSON.stringify(answerData.battle.feedback));
      await page.getByText('Correct!', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    await page.getByTestId('fight-status').getByText('Chapter cleared!', { exact: true }).waitFor();
    const finished = await admin.from('game_states').select('state').eq('user_id', userId).single();
    assert.equal(finished.data.state.gold, initial.gold + 1800);
    assert.equal(finished.data.state.battle.id, pdfBattle.battle.id);
    assert.equal(finished.data.state.gems, initial.gems + 450);
    assert.equal(finished.data.state.battleHistory.length, 2);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: 'test-results/learning-result-desktop.png' });
    await page.getByRole('button', { name: 'Battle menu', exact: true }).click();
    await page.getByRole('button', { name: 'Exit', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm exit', exact: true }).click();
    await page.getByRole('button', { name: 'Start Adventure', exact: true }).waitFor();
    await page.reload({ waitUntil: 'networkidle' });
    const fresh = await admin.from('game_states').select('state').eq('user_id', userId).single();
    assert.equal(fresh.data.state.gold, initial.gold + 1800);
    assert.equal(fresh.data.state.battle, undefined, 'Confirmed exit removes the saved attempt');
    assert.equal(users.size, 1, 'Reload preserves the browser account');
    assert.deepEqual(errors, []);
    console.log('PASS live browser: tutorial, wrong-answer feedback, network retry, resumed answers, real PDF generation, verified battle rewards and reload persistence');
  } catch (error) {
    fs.mkdirSync('test-results', { recursive: true });
    for (const context of browser.contexts()) for (const page of context.pages()) {
      await page.screenshot({ path: 'test-results/learning-failure.png' }).catch(() => {});
    }
    throw error;
  } finally {
    await browser.close();
    if (paths.size) {
      const removed = await admin.storage.from('expeditions').remove([...paths]);
      assert.ok(!removed.error, 'Remove verification PDFs');
    }
    for (const id of users) {
      const deleted = await admin.auth.admin.deleteUser(id);
      assert.ok(!deleted.error, 'Remove verification accounts');
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
