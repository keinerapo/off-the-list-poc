// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node demo-browser.test.js
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { scenes } from './model.js';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const root = dirname(fileURLToPath(import.meta.url));
const base = 'http://127.0.0.1:4187';
const server = spawn(process.execPath, [join(root, 'server.js')], { cwd: root, env: { ...process.env, PORT: '4187' }, stdio: 'ignore' });
let browser;
try {
  for (let attempt = 0; attempt < 50; attempt++) {
    try { if ((await fetch(`${base}/demo.html`)).ok) break; } catch {}
    await delay(100);
  }
  browser = await chromium.launch({ headless: true });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${base}/#entry`);
    await page.locator('.scene-grid').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const size = await page.evaluate(() => ({ content: document.documentElement.scrollHeight, viewport: innerHeight }));
    assert.ok(size.content <= size.viewport, `First tab must fit without scrolling at ${viewport.width}x${viewport.height}: ${JSON.stringify(size)}`);
    await page.close();
  }
  console.log('PASS first tab fits desktop viewports without scrolling');
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(`${base}/#entry`);
    await page.evaluate(() => localStorage.setItem('off-the-list-poc-v1', 'original-form-sentinel'));
    await page.addInitScript(() => { Math.random = () => 0.99; });
    await page.reload();
    async function layout() {
      await page.locator('#demo-form').waitFor();
      assert.equal(await page.locator('fieldset').count(), 2);
      assert.equal(await page.locator('#sections button > svg.lucide').count(), 5);
      assert.equal(await page.locator('legend > svg.lucide').count(), 2);
      assert.equal(await page.locator('svg.lucide:not([aria-hidden="true"]), svg.lucide:not([focusable="false"])').count(), 0);
      assert.equal(await page.locator('details').count(), 0);
      assert.doesNotMatch(await page.locator('main').innerText(), /not known|don't know|not sure/i);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No page overflow');
      const logo = await page.locator('.brand').boundingBox();
      const nav = await page.locator('nav').boundingBox();
      assert.ok(Math.abs((logo.y + logo.height / 2) - (nav.y + nav.height / 2)) < 2, 'Logo and tabs are aligned');
    }
    async function next() { await page.getByRole('button', { name: 'Continue', exact: true }).click(); await layout(); }
    await layout();
    assert.equal(await page.locator('.scene').count(), scenes.length);
    assert.equal(await page.locator('.scene svg').count(), 0, 'Original interest cards remain unchanged');
    for (const scene of scenes) {
      const card = page.locator('.scene').filter({ has: page.locator(`input[value="${scene.id}"]`) });
      assert.equal(await card.locator('img').getAttribute('src'), scene.image);
      assert.equal(await card.locator('p').innerText(), scene.description);
      await card.locator('img').scrollIntoViewIfNeeded();
      await page.waitForFunction(src => [...document.images].some(image => image.getAttribute('src') === src && image.complete && image.naturalWidth > 0), scene.image);
    }
    assert.equal(await page.locator('.scene-grid').evaluate(grid => getComputedStyle(grid).gridTemplateColumns.split(' ').length), width > 900 ? 5 : 2);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('alert').waitFor({ state: 'visible' });
    await page.locator('[name="presentationName"]').fill('Demo <visitor>');
    await page.locator('[name="interests"][value="nature"]').check();
    await page.locator('[name="interests"][value="food"]').check();
    await page.locator('[name="interests"][value="urban"]').check();
    await page.locator('[name="interests"][value="water"]').click();
    assert.equal(await page.locator('[name="interests"]:checked').count(), 3);
    assert.equal(await page.locator('.selection-count').innerText(), '3 of 3 interests selected');
    await next();
    await page.locator('[name="autonomy"]').nth(1).check();
    await page.locator('[name="offPathComfort"][value="2"]').check();
    await next();
    await page.locator('[name="motivations"]').first().check();
    await page.locator('[name="pace"]').first().check();
    await next();
    await page.locator('[name="durationMin"][value="5"]').check();
    const slider = page.getByRole('slider', { name: 'Adjust budget in EUR' });
    assert.equal(await slider.getAttribute('min'), '100');
    assert.equal(await slider.getAttribute('max'), '20000');
    assert.equal(await slider.getAttribute('step'), '50');
    assert.equal(await page.locator('#budget-display').innerText(), 'Choose your amount');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('alert').waitFor({ state: 'visible' });
    await slider.press('End');
    assert.equal(await page.locator('#budget-display').innerText(), 'EUR 20,000');
    await slider.press('Home');
    assert.equal(await page.locator('#budget-display').innerText(), 'EUR 100');
    for (let step = 0; step < 58; step++) await slider.press('ArrowRight');
    assert.equal(await page.locator('#budget-display').innerText(), 'EUR 3,000');
    await next();
    await page.locator('[name="needsText"]').fill('None');
    await page.locator('[name="physicalIntensity"][value="low"]').check();
    if (width === 390) await page.emulateMedia({ reducedMotion: 'reduce' });
    const started = Date.now();
    await page.getByRole('button', { name: 'Discover my journey', exact: true }).click();
    await page.locator('.preparation[data-stage="0"]').waitFor();
    assert.equal(await page.locator('.prompt').count(), 0, 'Prompt is not revealed during preparation');
    assert.equal(await page.locator('#sections button:disabled').count(), 5);
    assert.match(await page.locator('.preparation-tags').innerText(), /5 days/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const firstMessage = await page.locator('.preparation-description').innerText();
    const animations = await page.locator('.preparation').evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length);
    assert.ok(width === 390 ? animations === 0 : animations > 0, 'Motion respects reduced-motion preference');
    await page.locator('.preparation[data-stage="1"]').waitFor();
    assert.notEqual(await page.locator('.preparation-description').innerText(), firstMessage);
    assert.equal(await page.locator('.preparation-steps .is-complete').count(), 1);
    await page.locator('.preparation[data-stage="2"]').waitFor();
    assert.equal(await page.locator('.preparation-photo.is-active').getAttribute('data-photo'), '2');
    await page.locator('.preparation[data-stage="3"]').waitFor();
    assert.equal(await page.locator('.preparation-steps .is-complete').count(), 3);
    assert.equal(await page.locator('.prompt').count(), 0);
    await page.locator('.journey-result[data-journey="lapland"]').waitFor();
    assert.ok(Date.now() - started >= 9900 && Date.now() - started < 13000, 'Preparation lasts approximately ten seconds');
    assert.equal(await page.locator('.preparing, [aria-busy="true"]').count(), 0);
    assert.equal(await page.locator('.journey-result').count(), 1);
    assert.equal(await page.locator('.journey-experience').count(), 4);
    assert.equal(await page.locator('.prompt, textarea').count(), 0);
    assert.match(await page.locator('#journey-title').innerText(), /Take the reins/);
    assert.equal(await page.locator('.journey-checks article').count(), 6);
    await page.waitForFunction(() => document.querySelector('.journey-visual img').naturalWidth > 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('.journey-sources summary').click();
    assert.ok(await page.locator('.journey-sources a').count() >= 3);
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download journey', exact: true }).click();
    assert.equal((await downloaded).suggestedFilename(), 'off-the-list-lapland-journey.txt');
    if (width === 1440) {
      await page.evaluate(() => { Math.random = () => 0; });
      await page.getByRole('button', { name: 'Explore another journey', exact: true }).click();
      await page.locator('.preparation').waitFor();
      await page.locator('.journey-result[data-journey="slovenia"]').waitFor({ timeout: 15000 });
      await page.waitForFunction(() => document.querySelector('.journey-visual img').naturalWidth > 0);
      await page.evaluate(() => { Math.random = () => 0.5; });
      await page.getByRole('button', { name: 'Explore another journey', exact: true }).click();
      await page.locator('.preparation').waitFor();
      await page.locator('.journey-result[data-journey="azores"]').waitFor({ timeout: 15000 });
      await page.waitForFunction(() => document.querySelector('.journey-visual img').naturalWidth > 0);
      assert.match(await page.locator('#journey-title').innerText(), /Follow the whales/);
    }
    await page.getByRole('button', { name: 'Edit answers', exact: true }).click();
    assert.equal(await page.locator('[name="presentationName"]').inputValue(), 'Demo <visitor>');
    assert.equal(await page.locator('[name="interests"]:checked').count(), 3);
    await page.getByRole('button', { name: 'Practical details', exact: true }).click();
    assert.equal(await page.locator('[name="budgetMin"]').inputValue(), '3000');
    assert.equal(await page.locator('#budget-display').innerText(), 'EUR 3,000');
    if (width === 1440) {
      await page.getByRole('button', { name: 'Your needs', exact: true }).click();
      await page.getByRole('button', { name: 'Discover my journey', exact: true }).click();
      await page.locator('.preparation').waitFor();
      await page.getByRole('button', { name: 'Back to answers', exact: true }).click();
      await layout();
      assert.equal(await page.locator('[name="needsText"]').inputValue(), 'None');
      await page.waitForTimeout(10200);
      assert.equal(await page.locator('.journey-result, .preparation').count(), 0, 'Cancelled preparation never reveals a stale result');
      assert.equal(await page.locator('#sections button:disabled').count(), 0);
    }
    assert.equal(await page.evaluate(() => localStorage.getItem('off-the-list-poc-v1')), 'original-form-sentinel');
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS independent demo flow at ${width}px`);
  }
  const page = await browser.newPage();
  await page.goto(`${base}/demo.html`);
  await page.getByRole('button', { name: 'Your needs', exact: true }).click();
  await page.locator('[name="needsText"]').fill('None');
  await page.locator('[name="physicalIntensity"]').first().check();
  await page.getByRole('button', { name: 'Discover my journey', exact: true }).click();
  assert.equal(await page.locator('[name="presentationName"]').count(), 1);
  await page.getByRole('alert').waitFor({ state: 'visible' });
  console.log('PASS incomplete sections redirect before generation');
  for (const path of ['/', '/#entry', '/demo.html']) {
    await page.goto(`${base}${path}`);
    await page.locator('.scene-grid').waitFor();
    assert.equal(await page.locator('#main, #delete-session').count(), 0);
    assert.equal(await page.locator('link[href="./styles.css"]').count(), 0);
    if (path !== '/demo.html') assert.equal(new URL(page.url()).hash, '#entry');
  }
  await page.goto(`${base}/#quiz`);
  await page.getByRole('heading', { name: 'What brings you here?', exact: true }).waitFor();
  assert.equal(await page.locator('#demo, #sections').count(), 0);
  assert.equal(await page.locator('link[href="./demo.css"]').count(), 0);
  await page.locator('[data-mode="trip"]').click();
  await page.getByRole('heading', { name: 'What should we call you?', exact: true }).waitFor();
  await page.locator('[name="presentationName"]').fill('Saved full quiz');
  const quizStorage = await page.evaluate(() => localStorage.getItem('off-the-list-poc-v1'));
  await page.locator('[data-action="back"]').click();
  await page.getByRole('heading', { name: 'What brings you here?', exact: true }).waitFor();
  assert.equal(new URL(page.url()).hash, '#quiz');
  await page.evaluate(() => { location.hash = 'entry'; });
  await page.locator('.scene-grid').waitFor();
  await page.reload();
  await page.locator('.scene-grid').waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('off-the-list-poc-v1')), quizStorage);
  await page.evaluate(() => { location.hash = 'quiz'; });
  await page.getByRole('heading', { name: 'What brings you here?', exact: true }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: 'What brings you here?', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Continue my saved answers', exact: true }).click();
  await page.getByRole('heading', { name: 'What should we call you?', exact: true }).waitFor();
  assert.equal(await page.locator('[name="presentationName"]').inputValue(), 'Saved full quiz');
  await page.evaluate(() => { location.hash = 'entry'; });
  await page.locator('.scene-grid').waitFor();
  await page.goBack();
  await page.getByRole('heading', { name: 'What should we call you?', exact: true }).waitFor();
  console.log('PASS entry/quiz routing, reload, back navigation and storage isolation');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
