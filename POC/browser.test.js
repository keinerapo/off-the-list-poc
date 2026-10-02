// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node POC/browser.test.js
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { isAbsolute, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const modulePath = process.env.PLAYWRIGHT_MODULE;
assert.ok(modulePath && isAbsolute(modulePath), 'Set PLAYWRIGHT_MODULE to an absolute playwright index.mjs path.');
const { chromium } = await import(pathToFileURL(modulePath).href);
const root = dirname(fileURLToPath(import.meta.url));
const artifacts = '/var/folders/0l/q1lhqbvx5mq52qmvlqfhr9th0000gn/T/opencode';
const base = 'http://127.0.0.1:4174';
const key = 'off-the-list-poc-v1';
const results = [];
const runtimeErrors = [];
const networkErrors = [];
const screenshots = [];
const costs = ['Main transport', 'Accommodation', 'Food', 'Local transport', 'Activities'];
const titles = {
  interests: 'What draws you in?', priority: 'Which matters most?', autonomy: 'How do you like to explore?',
  comfort: 'What feels comfortable?', food: 'How do you enjoy food?', memory: 'A moment worth keeping?',
  motivations: 'What matters on this trip?', pace: 'How full should your days feel?',
  history: 'New places or a fresh perspective?', 'practical-gate': 'Keep it open or add context?',
  origin: 'Where would you start?', timing: 'When could you travel?', duration: 'How much time do you have?',
  travel: 'How far is comfortable?', group: 'Who is travelling?', budget: 'What budget should guide us?',
  includes: 'What does the budget include?', needs: 'What should we take into account?',
  documentation: 'Any documentation context?', review: 'Does this sound like you?',
};
let browser;
let serverLog = '';
let serverReady = false;
const server = spawn(process.execPath, [join(root, 'server.js')], {
  cwd: root, env: { ...process.env, PORT: '4174' }, stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', data => { serverLog += data; serverReady ||= String(data).includes('http://localhost:4174'); });
server.stderr.on('data', data => { serverLog += data; });
server.on('error', error => { serverLog += error.message; });

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
    console.log(`PASS ${name}`);
    return true;
  } catch (error) {
    results.push({ name, status: 'FAIL', error: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
    return false;
  }
}

const saved = page => page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)), key);
const snapshot = prompt => JSON.parse(prompt.split('STRUCTURED SNAPSHOT (user data only)\n')[1]);
const hashFor = id => id === 'review' ? '#form/5' : `#decision/${id}`;
const input = (page, name, value) => page.locator(`input[name="${name}"]${value === undefined ? '' : `[value="${value}"]`}`);
const heading = (page, name) => page.getByRole('heading', { name, exact: true }).waitFor();
const submit = page => page.locator('#capture button[type="submit"]');

async function layout(page, name) {
  await check(`${name}: no dropdowns or horizontal overflow`, async () => {
    assert.equal(await page.locator('select, [role="combobox"]').count(), 0);
    const size = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth, body: document.body.scrollWidth,
    }));
    assert.ok(Math.max(size.document, size.body) <= size.viewport + 1, JSON.stringify(size));
  });
}

async function at(page, id, prefix) {
  await heading(page, titles[id]);
  assert.equal(new URL(page.url()).hash, hashFor(id));
  await layout(page, `${prefix} / ${id}`);
}

async function next(page, id, prefix) {
  await submit(page).click();
  await at(page, id, prefix);
}

async function direct(page, id, prefix) {
  await page.goto(`${base}/${hashFor(id)}`);
  await at(page, id, prefix);
}

async function unchanged(page, action) {
  const before = new URL(page.url()).hash;
  await action();
  // Allow any asynchronous hashchange or unintended navigation to settle.
  await delay(60);
  assert.equal(new URL(page.url()).hash, before, 'An answer must not auto-advance the canvas');
  assert.equal(await page.locator('select, [role="combobox"]').count(), 0);
}

async function choose(page, name, value) {
  await unchanged(page, () => input(page, name, value).check());
}

async function fill(page, name, value) {
  await unchanged(page, () => page.locator(`[name="${name}"]`).fill(value));
}

async function open(page, label) {
  const details = label === 'Your starting point' ? page.locator('#trip-sheet > details')
    : page.locator('details').filter({ has: page.locator('summary').getByText(label, { exact: true }) });
  if (!await details.evaluate(el => el.open)) await details.locator('summary').click();
}

async function shot(page, name) {
  const path = join(artifacts, `off-the-list-canvas-${name}.png`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path, fullPage: true });
  screenshots.push(path);
}

async function assets(page, prefix) {
  for (const image of await page.locator('img').all()) await image.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.images].every(image => image.complete));
  await page.evaluate(() => document.fonts.ready);
  await check(`${prefix}: scene images and font load`, async () => {
    assert.equal(await page.locator('.scene img').count(), 10);
    assert.deepEqual(await page.evaluate(() => [...document.images].filter(image => !image.naturalWidth).map(image => image.src)), []);
    assert.equal(await page.evaluate(() => document.fonts.check('16px Huninn')), true);
  });
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function start(page, mode, prefix) {
  await page.goto(`${base}/#entry`);
  await page.locator(`[data-mode="${mode}"]`).click();
  await at(page, 'interests', prefix);
}

async function invalid(page, name, message) {
  await check(name, async () => {
    const hash = new URL(page.url()).hash;
    await submit(page).click();
    await page.locator('#form-error').filter({ hasText: message }).waitFor();
    assert.equal(new URL(page.url()).hash, hash);
  });
}

async function confirm(page) {
  await page.getByRole('checkbox', { name: 'I have reviewed my answers and want to create my prompt.' }).check();
  await submit(page).click();
  await heading(page, 'A profile. A starting point. New possibilities.');
  assert.equal(new URL(page.url()).hash, '#result');
  return page.getByRole('textbox', { name: 'Your complete recommendation prompt' }).inputValue();
}

async function downloaded(page, action, filename) {
  const event = page.waitForEvent('download');
  await page.locator(`[data-action="${action}"]`).click();
  const download = await event;
  assert.equal(download.suggestedFilename(), filename);
  assert.equal(await download.failure(), null);
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  await download.delete();
  return Buffer.concat(chunks).toString('utf8');
}

async function exportsMatch(page, prompt, prefix) {
  await check(`${prefix}: clipboard contains complete prompt`, async () => {
    await page.locator('[data-action="copy"]').click();
    await page.locator('#status').filter({ hasText: 'Prompt copied.' }).waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), prompt);
  });
  await check(`${prefix}: TXT download matches prompt`, async () => {
    assert.equal(await downloaded(page, 'download', 'off-the-list-prompt.txt'), prompt);
  });
  await check(`${prefix}: JSON download preserves complete session`, async () => {
    await open(page, 'Export answers for this validation session');
    const data = JSON.parse(await downloaded(page, 'export', 'off-the-list-session.json'));
    assert.equal(data.captureVersion, 'poc-2-canvas');
    assert.equal(data.rulesVersion, 'refined-ordinal-1');
    assert.equal(data.promptVersion, 'poc-1');
    assert.ok(Number.isFinite(Date.parse(data.exportedAt)));
    assert.deepEqual(data.state, (await saved(page)).state);
  });
}

async function deletion(page, prefix) {
  const before = await saved(page);
  await check(`${prefix}: cancel deletion preserves session`, async () => {
    const event = page.waitForEvent('dialog');
    const click = page.getByRole('button', { name: 'Delete my answers', exact: true }).click();
    const dialog = await event;
    assert.equal(dialog.type(), 'confirm');
    assert.match(dialog.message(), /Downloaded files and data you shared elsewhere will not be deleted/);
    await dialog.dismiss();
    await click;
    assert.deepEqual(await saved(page), before);
  });
  await check(`${prefix}: delete resets storage and stays deleted after reload`, async () => {
    const event = page.waitForEvent('dialog');
    const click = page.getByRole('button', { name: 'Delete my answers', exact: true }).click();
    await (await event).accept();
    await click;
    await heading(page, 'Your next discovery starts with you.');
    assert.equal(await saved(page), null);
    await page.reload();
    await heading(page, 'Your next discovery starts with you.');
    assert.equal(await saved(page), null);
    assert.equal(await page.getByRole('link', { name: /Continue my saved answers/ }).count(), 0);
    await layout(page, `${prefix} / deleted home`);
  });
}

async function inspiration(page, prefix) {
  await page.goto(base);
  await heading(page, 'Your next discovery starts with you.');
  await layout(page, `${prefix} / home`);
  await start(page, 'inspiration', prefix);
  await check(`${prefix}: fresh answers have no amount or implicit budget scope`, async () => {
    const state = (await saved(page)).state;
    assert.equal(state.budgetMode, 'unknown');
    assert.equal(state.budgetMin, '');
    assert.equal(state.budgetScope, '');
  });
  // Primary unknown flow uses only Continue: no direct routes or artificial field selection.
  for (const id of ['autonomy', 'comfort', 'memory', 'motivations', 'pace', 'history', 'practical-gate']) {
    await next(page, id, prefix);
  }
  assert.equal(await input(page, 'contextChoice', 'open').isChecked(), true);
  await next(page, 'needs', prefix);
  await next(page, 'review', prefix);
  await invalid(page, `${prefix}: review requires explicit confirmation`, /Review and confirm your answers/);
  await page.goto(`${base}/#result`);
  await at(page, 'review', prefix);
  const prompt = await confirm(page);
  await check(`${prefix}: default inspiration snapshot keeps all unknowns`, async () => {
    const { structuredInput: state, profile } = snapshot(prompt);
    assert.equal(state.mode, 'inspiration');
    assert.equal(state.interestStatus, 'skipped');
    assert.deepEqual(state.interests, []);
    assert.equal(state.confirmationVersion, 1);
    assert.ok(state.confirmedAt);
    assert.ok(!('categoryChoice' in state));
    for (const pattern of [/Habitual interests: skipped/, /Budget: unknown, not unlimited/, /Full trip duration: unknown/,
      /Group composition: unknown/, /Functional needs.*unknown/, /Starting city: unknown/, /Entry and transit documentation: unknown/]) {
      assert.match(profile.unknowns.join('\n'), pattern);
    }
    for (const pattern of [/up to 3 specific places/, /at most 12 distinct candidates/, /Unknown essential conditions/, /If tools are unavailable/]) assert.match(prompt, pattern);
  });
  await exportsMatch(page, prompt, prefix);
  await layout(page, `${prefix} / result`);
  await page.reload();
  await heading(page, 'A profile. A starting point. New possibilities.');
  assert.equal(await page.locator('#prompt').inputValue(), prompt);
  await page.getByRole('button', { name: 'Make this a trip', exact: true }).click();
  await at(page, 'origin', prefix);
  assert.equal((await saved(page)).state.confirmedAt, '');
  await fill(page, 'originSearch', 'Quito, Ecuador');
  await deletion(page, prefix);
}

async function trip(page, prefix, width) {
  await start(page, 'trip', prefix);
  await assets(page, prefix);
  await shot(page, `${width}-interests`);
  for (const id of ['food', 'nature', 'stories']) await choose(page, 'interests', id);
  await check(`${prefix}: fourth scene rejected without navigation`, async () => {
    await unchanged(page, () => input(page, 'interests', 'challenge').click());
    assert.equal(await input(page, 'interests', 'challenge').isChecked(), false);
    assert.equal((await saved(page)).state.interests.length, 3);
    await page.locator('#status').filter({ hasText: 'Deselect one' }).waitFor();
  });
  await fill(page, 'otherInterest', 'Astronomy');
  await invalid(page, `${prefix}: custom interest counts toward maximum three`, /Choose up to three interests/);
  await fill(page, 'otherInterest', '');
  const order = (await saved(page)).state.sceneOrder;
  await next(page, 'priority', prefix);
  await choose(page, 'interestPriority', 'food');
  await page.reload();
  await at(page, 'priority', prefix);
  await check(`${prefix}: selected priority and randomized scene order persist`, async () => {
    assert.equal(await input(page, 'interestPriority', 'food').isChecked(), true);
    assert.deepEqual((await saved(page)).state.sceneOrder, order);
    await page.locator('[data-action="back"]').click();
    await at(page, 'interests', prefix);
    assert.deepEqual(await page.locator('.scene input').evaluateAll(nodes => nodes.map(node => node.value)), order);
    assert.deepEqual(await page.locator('.scene input:checked').evaluateAll(nodes => nodes.map(node => node.value).sort()), ['food', 'nature', 'stories']);
    await next(page, 'priority', prefix);
  });
  await next(page, 'autonomy', prefix);
  await choose(page, 'autonomy', 'With a few things arranged and room to improvise.');
  await shot(page, `${width}-autonomy`);
  await next(page, 'comfort', prefix);
  await choose(page, 'comfort', 'I enjoy simple places, provided my essential needs are met.');
  await next(page, 'food', prefix);
  await choose(page, 'food', 'Cooking or learning');
  await next(page, 'memory', prefix);
  await open(page, 'Add a travel memory (optional)');
  await fill(page, 'memory', 'A quiet cooking class by the coast.');
  await next(page, 'motivations', prefix);
  const rest = 'Rest and a slower pace.';
  const learn = 'Learning and understanding a place.';
  await choose(page, 'motivations', rest);
  await choose(page, 'motivations', learn);
  await check(`${prefix}: third motivation rejected`, async () => {
    await unchanged(page, () => input(page, 'motivations', 'A challenge.').click());
    assert.equal(await input(page, 'motivations', 'A challenge.').isChecked(), false);
    assert.equal((await saved(page)).state.motivations.length, 2);
  });
  await check(`${prefix}: unsure motivation exclusive in both directions`, async () => {
    await choose(page, 'motivations', "I'm not sure yet.");
    assert.deepEqual((await saved(page)).state.motivations, ["I'm not sure yet."]);
    assert.equal(await input(page, 'motivations', rest).isChecked(), false);
    await choose(page, 'motivations', rest);
    assert.equal(await input(page, 'motivations', "I'm not sure yet.").isChecked(), false);
    assert.deepEqual((await saved(page)).state.motivations, [rest]);
  });
  await choose(page, 'motivations', learn);
  await choose(page, 'motivationPriority', learn);
  await open(page, 'Another purpose (optional)');
  await fill(page, 'purposeNote', 'Family cooking holiday.');
  await next(page, 'pace', prefix);
  await choose(page, 'pace', 'One main activity a day, without filling the schedule.');
  await next(page, 'history', prefix);
  await choose(page, 'novelty', 'New regions in countries I already know.');
  await open(page, 'Places you have visited (optional)');
  await fill(page, 'history', 'Paris, France');
  await choose(page, 'historyCompleteness', 'partial');
  await next(page, 'origin', prefix);
  await fill(page, 'originSearch', 'Bogota');
  await invalid(page, `${prefix}: origin country must be explicit, never inferred`, /Add your country after a comma/);
  await fill(page, 'originSearch', 'Bogota, Colombia');
  await open(page, 'Another starting point (optional)');
  await fill(page, 'alternateOrigin', 'Medellin');
  await next(page, 'timing', prefix);
  // Undecided timing keeps duration in the natural route. Dates are covered separately.
  await next(page, 'duration', prefix);
  await choose(page, 'durationMode', 'range');
  await fill(page, 'durationMin', '5');
  await fill(page, 'durationMax', '3');
  await invalid(page, `${prefix}: reversed duration range rejected`, /maximum duration must be at least the minimum/);
  await fill(page, 'durationMin', '3');
  await fill(page, 'durationMax', '5');
  await next(page, 'travel', prefix);
  await choose(page, 'travelLimitMode', 'limit');
  await fill(page, 'travelLimit', '0');
  await invalid(page, `${prefix}: zero travel limit rejected`, /maximum travel time greater than zero/);
  await fill(page, 'travelLimit', '6');
  await open(page, 'Transport preferences (optional)');
  await choose(page, 'transport', 'Plane');
  await fill(page, 'transportNotes', 'No overnight connections.');
  await next(page, 'group', prefix);
  await choose(page, 'groupKnown', 'yes');
  assert.equal(await input(page, 'groupKnown', 'yes').isChecked(), true);
  assert.equal(await input(page, 'childAges').count(), 0);
  await unchanged(page, () => page.getByRole('button', { name: 'Increase adults', exact: true }).click());
  await unchanged(page, () => page.getByRole('button', { name: 'Increase children', exact: true }).click());
  assert.equal(await input(page, 'adults').inputValue(), '2');
  assert.equal(await input(page, 'children').inputValue(), '1');
  await invalid(page, `${prefix}: ages required only with children`, /Add useful child ages or ranges/);
  await fill(page, 'childAges', '8 years');
  await open(page, 'Group preferences (optional)');
  await fill(page, 'groupNotes', 'One participant needs peanut-free meals.');
  await next(page, 'budget', prefix);
  await check(`${prefix}: viewing slider does not register amount or scope`, async () => {
    assert.equal((await saved(page)).state.budgetMode, 'unknown');
    assert.equal((await saved(page)).state.budgetMin, '');
    assert.equal((await saved(page)).state.budgetScope, '');
    assert.equal(await page.locator('[name="budgetScope"]:checked').count(), 0);
    assert.equal(await page.locator('#budget-display').innerText(), 'Choose your amount');
  });
  await shot(page, `${width}-budget`);
  await unchanged(page, async () => {
    await page.getByRole('slider', { name: 'Adjust budget in USD' }).focus();
    await page.keyboard.press('ArrowRight');
  });
  const sliderAmount = (await saved(page)).state.budgetMin;
  await check(`${prefix}: keyboard slider registers amount and updates output`, async () => {
    assert.equal(sliderAmount, '150');
    assert.equal((await saved(page)).state.budgetMode, 'amount');
    assert.equal(await input(page, 'budgetMin').inputValue(), sliderAmount);
    assert.match(await page.locator('#budget-display').innerText(), /USD 150/);
  });
  await invalid(page, `${prefix}: declared budget requires explicit scope`, /Choose whether the budget covers/);
  // Recover if a scope regression allowed Continue, so the rest of the flow still runs.
  if (new URL(page.url()).hash !== hashFor('budget')) await direct(page, 'budget', prefix);
  await choose(page, 'budgetScope', 'person');
  await choose(page, 'budgetMode', 'range');
  await open(page, 'Enter an exact amount');
  await fill(page, 'budgetMin', '1800');
  await fill(page, 'budgetMax', '1500');
  await invalid(page, `${prefix}: reversed budget range rejected`, /upper budget cap must be at least the lower amount/);
  await fill(page, 'budgetMin', '0');
  await invalid(page, `${prefix}: zero budget rejected`, /Enter a positive budget/);
  await fill(page, 'budgetMin', '900');
  await open(page, 'Budget flexibility (optional)');
  await fill(page, 'budgetFlexibility', 'Up to USD 100 extra.');
  await page.reload();
  await at(page, 'budget', prefix);
  assert.equal(await input(page, 'budgetMin').inputValue(), '900');
  assert.equal(await input(page, 'budgetMax').inputValue(), '1500');
  assert.equal(await input(page, 'budgetScope', 'person').isChecked(), true);
  await next(page, 'includes', prefix);
  await invalid(page, `${prefix}: included costs must be declared`, /Select what the budget includes/);
  await unchanged(page, () => page.getByRole('button', { name: 'All listed costs', exact: true }).click());
  assert.deepEqual((await saved(page)).state.budgetIncludes, costs);
  assert.equal(await page.locator('[name="budgetIncludes"]:checked').count(), 5);
  await next(page, 'needs', prefix);
  await choose(page, 'needs', 'food');
  await invalid(page, `${prefix}: selected need requires detail`, /Describe the practical need/);
  await unchanged(page, () => page.locator('[data-need="food"][data-detail="text"]').fill('Severe peanut allergy: no peanuts or cross-contact.'));
  await unchanged(page, () => page.locator('[data-need="food"][data-detail="type"][value="firm"]').check());
  await unchanged(page, () => page.locator('[data-need="food"][data-detail="scope"][value="participant"]').check());
  await next(page, 'documentation', prefix);
  await open(page, 'Entry and transit documentation (optional)');
  await choose(page, 'documentationMode', 'provided');
  await fill(page, 'passports', 'Colombia');
  await fill(page, 'residence', 'Colombia');
  await fill(page, 'permits', 'None declared');
  await fill(page, 'groupDocuments', 'Group passports not confirmed');
  await page.reload();
  await at(page, 'documentation', prefix);
  assert.equal(await input(page, 'residence').inputValue(), 'Colombia');
  await next(page, 'review', prefix);
  const prompt = await confirm(page);
  await check(`${prefix}: trip snapshot preserves all declared values and safeguards`, async () => {
    const { structuredInput: state, profile } = snapshot(prompt);
    const expected = {
      mode: 'trip', interestPriority: 'food', food: 'Cooking or learning', memory: 'A quiet cooking class by the coast.',
      motivationPriority: learn, purposeNote: 'Family cooking holiday.', history: 'Paris, France', historyCompleteness: 'partial',
      originCity: 'Bogota', originCountry: 'Colombia', alternateOrigin: 'Medellin', periodMode: 'unknown',
      durationMode: 'range', durationMin: '3', durationMax: '5', durationUnit: 'days', travelLimitMode: 'limit', travelLimit: '6',
      groupKnown: true, adults: '2', children: '1', childAges: '8 years', budgetMode: 'range', budgetMin: '900', budgetMax: '1500',
      budgetScope: 'person', budgetFlexibility: 'Up to USD 100 extra.', documentationMode: 'provided', passports: 'Colombia', residence: 'Colombia',
    };
    for (const [name, value] of Object.entries(expected)) assert.deepEqual(state[name], value, name);
    assert.deepEqual(state.interests, ['food', 'nature', 'stories']);
    assert.deepEqual((await saved(page)).state.sceneOrder, order);
    assert.deepEqual(state.motivations, [rest, learn]);
    assert.deepEqual(state.transport, ['Plane']);
    assert.deepEqual(state.budgetIncludes, costs);
    assert.deepEqual(state.needDetails.food, {
      text: 'Severe peanut allergy: no peanuts or cross-contact.', type: 'firm', scope: 'participant', margin: '', essential: true,
    });
    assert.match(profile.conditions.join('\n'), /firm restriction; applies to specific anonymous participant/);
    assert.match(profile.conditions.join('\n'), /USD per person/);
    assert.match(prompt, /BOTH directions/);
    assert.match(prompt, /Essential allergies and access needs are never automatically downgraded/);
  });
  await exportsMatch(page, prompt, prefix);
  await layout(page, `${prefix} / result`);
  await page.getByRole('button', { name: 'Review / edit answers', exact: true }).click();
  await at(page, 'review', prefix);
  await open(page, 'Your starting point');
  await page.locator('#trip-sheet [data-decision="origin"]').click();
  await at(page, 'origin', prefix);
  assert.match(await submit(page).innerText(), /Save & return to review/);
  await fill(page, 'originSearch', 'Cali, Colombia');
  await next(page, 'review', prefix);
  await open(page, 'Your starting point');
  assert.match(await page.locator('#trip-sheet').innerText(), /From Cali, Colombia/);
  await invalid(page, `${prefix}: saved live-sheet edit requires reconfirmation`, /Review and confirm your answers/);
  await check(`${prefix}: direct result cannot expose unconfirmed edits`, async () => {
    assert.equal((await saved(page)).state.confirmedAt, '');
    await page.goto(`${base}/#result`);
    await at(page, 'review', prefix);
    assert.equal(await page.locator('#prompt').count(), 0);
  });
  const updated = snapshot(await confirm(page));
  assert.equal(updated.structuredInput.originCity, 'Cali');
  assert.equal(updated.structuredInput.confirmationVersion, 2);
  await deletion(page, prefix);
}

async function timing(page, prefix) {
  await start(page, 'trip', prefix);
  await direct(page, 'timing', prefix);
  await choose(page, 'periodMode', 'dates');
  await fill(page, 'dateStart', '2027-01-10');
  await fill(page, 'dateEnd', '2027-01-09');
  await invalid(page, `${prefix}: reversed dates rejected`, /valid departure and return window/);
  await fill(page, 'dateEnd', '2027-01-15');
  await check(`${prefix}: date-only values never acquire implicit midnight`, async () => {
    const state = (await saved(page)).state;
    assert.equal(state.dateStart, '2027-01-10');
    assert.equal(state.dateEnd, '2027-01-15');
    assert.equal(await page.locator('[data-date-time="dateStart"]').inputValue(), '');
    assert.equal(await page.locator('[data-date-time="dateEnd"]').inputValue(), '');
  });
  await next(page, 'travel', prefix);
  assert.equal((await saved(page)).state.durationMode, 'unknown');
  await direct(page, 'review', prefix);
  const dateOnly = snapshot(await confirm(page));
  assert.equal(dateOnly.structuredInput.dateStart, '2027-01-10');
  assert.equal(dateOnly.structuredInput.dateEnd, '2027-01-15');
  await direct(page, 'timing', prefix);
  await open(page, 'Departure and return times (optional)');
  await unchanged(page, () => page.locator('[data-date-time="dateStart"]').fill('09:00'));
  await unchanged(page, () => page.locator('[data-date-time="dateEnd"]').fill('18:30'));
  await fill(page, 'dateStart', '2027-01-11');
  await fill(page, 'dateEnd', '2027-01-16');
  await page.reload();
  await at(page, 'timing', prefix);
  await check(`${prefix}: optional times retained when dates change and reload`, async () => {
    const state = (await saved(page)).state;
    assert.equal(state.dateStart, '2027-01-11T09:00');
    assert.equal(state.dateEnd, '2027-01-16T18:30');
    assert.equal(await page.locator('[data-date-time="dateStart"]').inputValue(), '09:00');
    assert.equal(await page.locator('[data-date-time="dateEnd"]').inputValue(), '18:30');
  });
  await fill(page, 'dateEnd', '2027-01-11');
  await check(`${prefix}: same-day trip with ordered hours is allowed and skips duration`, async () => {
    await next(page, 'travel', prefix);
  });
  await direct(page, 'timing', prefix);
  await unchanged(page, () => page.locator('[data-date-time="dateEnd"]').fill('08:00'));
  await invalid(page, `${prefix}: same-day reversed hours rejected`, /valid departure and return window/);
  await choose(page, 'periodMode', 'months');
  await fill(page, 'monthStart', '2027-03');
  await fill(page, 'monthEnd', '2027-02');
  await invalid(page, `${prefix}: reversed months rejected`, /valid departure and return window/);
  await fill(page, 'monthEnd', '2027-04');
  await next(page, 'duration', prefix);
  await choose(page, 'durationMode', 'exact');
  await unchanged(page, () => page.getByRole('button', { name: 'Increase duration', exact: true }).click());
  assert.equal(await input(page, 'durationMin').inputValue(), '1');
  await unchanged(page, () => page.getByRole('button', { name: 'Decrease duration', exact: true }).click());
  await invalid(page, `${prefix}: duration counter zero rejected`, /duration greater than zero/);
  await fill(page, 'durationMin', '4');
  await choose(page, 'durationUnit', 'weeks');
  await next(page, 'travel', prefix);
  await direct(page, 'duration', prefix);
  await choose(page, 'durationMode', 'range');
  await unchanged(page, () => page.getByRole('button', { name: 'Increase maximum duration', exact: true }).click());
  assert.equal(await input(page, 'durationMax').inputValue(), '1');
  await fill(page, 'durationMax', '6');
  await next(page, 'travel', prefix);
  await direct(page, 'review', prefix);
  const range = snapshot(await confirm(page)).structuredInput;
  assert.equal(range.periodMode, 'months');
  assert.equal(range.monthStart, '2027-03');
  assert.equal(range.monthEnd, '2027-04');
  assert.equal(range.durationMode, 'range');
  assert.equal(range.durationMin, '4');
  assert.equal(range.durationMax, '6');
  assert.equal(range.durationUnit, 'weeks');
  assert.equal(range.dateStart, '');
  assert.equal(range.dateEnd, '');
}

async function budgetAndNeeds(page, prefix) {
  await start(page, 'trip', prefix);
  await direct(page, 'budget', prefix);
  await unchanged(page, async () => {
    await page.getByRole('slider', { name: 'Adjust budget in USD' }).focus();
    await page.keyboard.press('ArrowRight');
  });
  await choose(page, 'budgetScope', 'group');
  await next(page, 'includes', prefix);
  await choose(page, 'budgetIncludes', 'Food');
  await direct(page, 'review', prefix);
  await check(`${prefix}: keyboard slider amount is preserved in the final prompt`, async () => {
    const data = snapshot(await confirm(page));
    assert.equal(data.structuredInput.budgetMode, 'amount');
    assert.equal(data.structuredInput.budgetMin, '150');
    assert.match(data.profile.conditions.join('\n'), /Budget upper cap.*150/);
  });
  await direct(page, 'budget', prefix);
  await choose(page, 'budgetMode', 'unknown');
  await choose(page, 'budgetMode', 'amount');
  assert.equal((await saved(page)).state.budgetMin, '');
  await open(page, 'Enter an exact amount');
  await fill(page, 'budgetMin', '27550');
  await choose(page, 'budgetScope', 'group');
  await page.reload();
  await at(page, 'budget', prefix);
  await check(`${prefix}: exact amount beyond slider maximum is never clamped`, async () => {
    assert.equal((await saved(page)).state.budgetMin, '27550');
    assert.equal(await input(page, 'budgetMin').inputValue(), '27550');
    assert.match(await page.locator('#budget-display').innerText(), /27,?550/);
  });
  await next(page, 'includes', prefix);
  await choose(page, 'budgetIncludes', 'Food');
  await next(page, 'needs', prefix);
  await choose(page, 'needs', 'food');
  await unchanged(page, () => page.locator('[data-need="food"][data-detail="text"]').fill('Essential peanut allergy: avoid cross-contact.'));
  // The safeguard intentionally rejects this selection, so check() would retry forever.
  await unchanged(page, () => page.locator('[data-need="food"][data-detail="type"][value="flexible"]').click());
  await unchanged(page, () => page.locator('[data-need="food"][data-detail="scope"][value="group"]').check());
  await check(`${prefix}: essential restriction cannot become flexible`, async () => {
    assert.equal(await page.locator('[data-need="food"][data-detail="type"][value="verify"]').isChecked(), true);
    assert.notEqual((await saved(page)).state.needDetails.food.type, 'flexible');
  });
  await choose(page, 'needs', 'crowds');
  await unchanged(page, () => page.locator('[data-need="crowds"][data-detail="text"]').fill('Prefer quieter places.'));
  await unchanged(page, () => page.locator('[data-need="crowds"][data-detail="type"][value="flexible"]').check());
  await unchanged(page, () => page.locator('[data-need="crowds"][data-detail="scope"][value="me"]').check());
  await open(page, 'Acceptable margin (optional)');
  await unchanged(page, () => page.locator('[data-need="crowds"][data-detail="margin"]').fill('One busy market for at most an hour.'));
  await page.reload();
  await at(page, 'needs', prefix);
  assert.equal(await page.locator('[data-need="crowds"][data-detail="type"][value="flexible"]').isChecked(), true);
  assert.equal(await page.locator('[data-need="food"][data-detail="scope"][value="group"]').isChecked(), true);
  await next(page, 'documentation', prefix);
  await next(page, 'review', prefix);
  const data = snapshot(await confirm(page));
  assert.equal(data.structuredInput.budgetMin, '27550');
  assert.notEqual(data.structuredInput.needDetails.food.type, 'flexible');
  assert.equal(data.structuredInput.needDetails.crowds.type, 'flexible');
  assert.equal(data.structuredInput.needDetails.crowds.margin, 'One busy market for at most an hour.');
  assert.match(data.profile.conditions.join('\n'), /27550/);
  await layout(page, `${prefix} / result`);
}

async function conditionalReset(page, prefix) {
  await start(page, 'inspiration', prefix);
  await direct(page, 'practical-gate', prefix);
  await choose(page, 'contextChoice', 'add');
  await next(page, 'origin', prefix);
  await fill(page, 'originSearch', 'Lima, Peru');
  await direct(page, 'duration', prefix);
  await choose(page, 'durationMode', 'exact');
  await fill(page, 'durationMin', '4');
  await choose(page, 'durationMode', 'unknown');
  await direct(page, 'timing', prefix);
  await choose(page, 'periodMode', 'dates');
  await fill(page, 'dateStart', '2027-05-10');
  await fill(page, 'dateEnd', '2027-05-15');
  await open(page, 'Timing flexibility (optional)');
  await fill(page, 'periodFlexibility', 'STALE plus one day');
  await choose(page, 'periodMode', 'unknown');
  await direct(page, 'group', prefix);
  await choose(page, 'groupKnown', 'yes');
  await unchanged(page, () => page.getByRole('button', { name: 'Increase children', exact: true }).click());
  await fill(page, 'childAges', '8 years');
  await unchanged(page, () => page.getByRole('button', { name: 'Decrease children', exact: true }).click());
  assert.equal(await input(page, 'childAges').count(), 0);
  await open(page, 'Group preferences (optional)');
  await fill(page, 'groupNotes', 'STALE group note');
  await choose(page, 'groupKnown', 'no');
  await direct(page, 'budget', prefix);
  await choose(page, 'budgetMode', 'range');
  await open(page, 'Enter an exact amount');
  await fill(page, 'budgetMin', '900');
  await fill(page, 'budgetMax', '1500');
  await choose(page, 'budgetScope', 'person');
  await direct(page, 'includes', prefix);
  await choose(page, 'budgetIncludes', 'Food');
  await direct(page, 'budget', prefix);
  await choose(page, 'budgetMode', 'unknown');
  await next(page, 'needs', prefix); // Undeclared budget omits includes.
  await direct(page, 'documentation', prefix);
  await open(page, 'Entry and transit documentation (optional)');
  await choose(page, 'documentationMode', 'provided');
  await fill(page, 'passports', 'STALE nationality');
  await choose(page, 'documentationMode', 'unknown');
  await direct(page, 'needs', prefix);
  await choose(page, 'needs', 'crowds');
  await page.locator('[data-need="crowds"][data-detail="text"]').fill('Quiet surroundings are essential.');
  await direct(page, 'practical-gate', prefix);
  page.once('dialog', dialog => dialog.accept());
  await choose(page, 'contextChoice', 'open');
  await next(page, 'needs', prefix);
  assert.deepEqual((await saved(page)).state.needs, ['crowds']);
  await next(page, 'review', prefix);
  const data = snapshot(await confirm(page));
  await check(`${prefix}: unknown modes clear stale fields rather than preserving them`, async () => {
    const state = data.structuredInput;
    for (const name of ['originCity', 'originCountry', 'durationMin', 'durationMax', 'dateStart', 'dateEnd', 'periodFlexibility',
      'adults', 'children', 'childAges', 'groupNotes', 'budgetMin', 'budgetMax', 'passports']) assert.equal(state[name], '', name);
    assert.deepEqual(state.budgetIncludes, []);
    assert.doesNotMatch(Object.values(data.profile).flat().join('\n'), /STALE/);
    assert.equal(state.needDetails.crowds.text, 'Quiet surroundings are essential.');
  });
}

async function legacy(page, prefix) {
  await page.goto(base);
  const state = {
    mode: 'trip', interests: ['food', 'nature'], interestStatus: 'selected', interestPriority: 'food',
    sceneOrder: ['stories', 'nature', 'food', 'urban', 'water', 'challenge', 'connection', 'creative', 'energy', 'surroundings'],
    food: 'Tasting', originCity: 'Bogota', originCountry: 'Colombia', durationMode: 'exact', durationMin: '4', durationUnit: 'days',
    periodMode: 'dates', dateStart: '2027-01-10T09:00', dateEnd: '2027-01-15T18:00',
    budgetMode: 'amount', budgetMin: '27550', budgetScope: 'person', budgetIncludes: ['Food'],
    memory: 'Existing v1 memory.', groupKnown: true, adults: '2', children: '0',
    needs: ['food'], needsStatus: 'specified',
    needDetails: { food: { text: 'No peanuts.', type: 'firm', scope: 'participant', essential: true, margin: '' } },
  };
  // A real old envelope has numeric step and no decision or contextChoice properties.
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify({ state, step: 3, expiresAt: Date.now() + 86400000 })), { key, state });
  await page.reload();
  await page.goto(`${base}/#resume`);
  await heading(page, titles.origin);
  assert.equal(new URL(page.url()).hash, '#form/3');
  for (const [stage, id] of [[0, 'interests'], [1, 'autonomy'], [2, 'motivations'], [3, 'origin'], [4, 'needs'], [5, 'review']]) {
    await page.goto(`${base}/#form/${stage}`);
    await heading(page, titles[id]);
    assert.equal(new URL(page.url()).hash, `#form/${stage}`);
    await layout(page, `${prefix} / old numeric stage ${stage}`);
    await check(`${prefix}: v1 fields preserved at numeric stage ${stage}`, async () => {
      const restored = (await saved(page)).state;
      for (const [name, value] of Object.entries(state)) assert.deepEqual(restored[name], value, name);
    });
  }
  const data = snapshot(await confirm(page));
  assert.equal(data.structuredInput.budgetMin, '27550');
  assert.equal(data.structuredInput.dateStart, '2027-01-10T09:00');
  assert.equal(data.structuredInput.memory, 'Existing v1 memory.');
  await deletion(page, prefix);
}

try {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Server failed: ${serverLog}`);
    if (serverReady) {
      try { if ((await fetch(base)).ok) break; } catch { /* Wait for the listener. */ }
    }
    if (attempt === 99) throw new Error(`Server did not become ready: ${serverLog}`);
    await delay(100);
  }
  try {
    browser = await chromium.launch({ headless: true, downloadsPath: artifacts });
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    // Use the already supplied module's CLI; never install package dependencies.
    const install = spawn(process.execPath, [join(dirname(modulePath), 'cli.js'), 'install', 'chromium'], { cwd: artifacts, stdio: 'inherit' });
    const [code] = await once(install, 'exit');
    assert.equal(code, 0, 'Chromium installation failed');
    browser = await chromium.launch({ headless: true, downloadsPath: artifacts });
  }
  for (const mobile of [false, true]) {
    const width = mobile ? 'mobile' : 'desktop';
    const name = mobile ? 'Mobile 390px' : 'Desktop 1440px';
    for (const [flowName, flow] of [
      ['default inspiration', inspiration], ['full trip', trip], ['date and month alternatives', timing],
      ['large budget and restriction types', budgetAndNeeds], ['conditional reset', conditionalReset], ['v1 persistence', legacy],
    ]) {
      const prefix = `${name} / ${flowName}`;
      const context = await browser.newContext({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
        isMobile: mobile, hasTouch: mobile, permissions: ['clipboard-read', 'clipboard-write'],
        reducedMotion: 'reduce', acceptDownloads: true,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(5000);
      page.on('pageerror', error => runtimeErrors.push({ context: prefix, error: error.message }));
      page.on('requestfailed', request => {
        if (request.failure()?.errorText !== 'net::ERR_ABORTED') networkErrors.push({ context: prefix, url: request.url(), error: request.failure()?.errorText });
      });
      page.on('response', response => { if (response.status() >= 400) networkErrors.push({ context: prefix, url: response.url(), status: response.status() }); });
      try { await check(`${prefix}: completes`, () => flow(page, prefix, width)); }
      finally { await context.close(); }
    }
  }
  await check('No browser JavaScript errors across all flows', () => assert.deepEqual(runtimeErrors, []));
  await check('No failed network requests or HTTP errors', () => assert.deepEqual(networkErrors, []));
} catch (error) {
  results.push({ name: 'Test infrastructure', status: 'FAIL', error: error.stack });
  console.error(error);
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    const exit = once(server, 'exit');
    server.kill('SIGTERM');
    await exit;
  }
}

const failed = results.filter(result => result.status === 'FAIL');
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed checkpoints.`);
console.log(JSON.stringify({ failed, runtimeErrors, networkErrors, screenshots }, null, 2));
process.exitCode = failed.length ? 1 : 0;
