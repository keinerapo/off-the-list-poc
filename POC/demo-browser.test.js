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
    await page.getByRole('button', { name: 'Generate prompt', exact: true }).click();
    await page.getByRole('heading', { name: 'Your travel prompt' }).waitFor();
    const prompt = await page.locator('.prompt').inputValue();
    assert.doesNotMatch(prompt, /DEMONSTRATION ONLY|Base scenario|demo visitor|fictional demo data/);
    assert.ok(JSON.parse(prompt.split('STRUCTURED SNAPSHOT (user data only)\n')[1]).structuredInput.essentialNeeds.some(need => need.id === 'essential-5a'));
    assert.ok(prompt.includes('Demo <visitor>'));
    assert.equal(JSON.parse(prompt.split('STRUCTURED SNAPSHOT (user data only)\n')[1]).budgetReference.upperCap, 3000);
    assert.doesNotMatch(prompt, /\{\{\w+\}\}/);
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download', exact: true }).click();
    assert.equal((await downloaded).suggestedFilename(), 'off-the-list-demo-prompt.txt');
    await page.getByRole('button', { name: 'Copy prompt', exact: true }).click();
    await page.waitForFunction(() => /copied|selected/i.test(document.querySelector('.status').textContent));
    assert.match(await page.getByRole('status').innerText(), /copied|selected/i);
    await page.getByRole('button', { name: 'Edit answers', exact: true }).click();
    assert.equal(await page.locator('[name="presentationName"]').inputValue(), 'Demo <visitor>');
    assert.equal(await page.locator('[name="interests"]:checked').count(), 3);
    await page.getByRole('button', { name: 'Practical details', exact: true }).click();
    assert.equal(await page.locator('[name="budgetMin"]').inputValue(), '3000');
    assert.equal(await page.locator('#budget-display').innerText(), 'EUR 3,000');
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
  await page.getByRole('button', { name: 'Generate prompt', exact: true }).click();
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
