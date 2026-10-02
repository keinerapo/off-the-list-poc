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
const networkErrors = [];
const runtimeErrors = [];
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
  } catch (error) {
    results.push({ name, status: 'FAIL', error: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

async function heading(page, name) {
  await page.getByRole('heading', { name, exact: true }).waitFor();
}

async function next(page, title) {
  await page.getByRole('button', { name: /^Continue/ }).click();
  await heading(page, title);
}

async function start(page, mode) {
  await page.goto(`${base}/#entry`);
  await page.getByRole('button', { name: mode === 'trip' ? /I have a trip in mind/ : /I want inspiration/ }).click();
  await heading(page, 'What do you usually enjoy when you travel?');
}

async function practical(page) {
  await next(page, 'Your way of exploring.');
  await next(page, 'What are you hoping to find?');
  await next(page, 'The details that shape the possibilities.');
}

async function noOverflow(page, name) {
  await check(name, async () => {
    const size = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    assert.ok(Math.max(size.document, size.body) <= size.viewport + 1, JSON.stringify(size));
  });
}

async function assetsLoaded(page, name) {
  // Scroll lazy images into view; a network-idle wait alone does not load them.
  for (const image of await page.getByRole('img', { includeHidden: true }).all()) {
    await image.scrollIntoViewIfNeeded();
  }
  for (const image of await page.locator('img').all()) await image.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.images].every(image => image.complete));
  await page.evaluate(() => document.fonts.ready);
  await check(name, async () => {
    const broken = await page.evaluate(() => [...document.images]
      .filter(image => !image.naturalWidth).map(image => image.currentSrc || image.src));
    assert.deepEqual(broken, []);
    assert.equal(await page.evaluate(() => document.fonts.check('16px Huninn')), true);
  });
}

const saved = page => page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)), key);
const snapshot = prompt => JSON.parse(prompt.split('STRUCTURED SNAPSHOT (user data only)\n')[1]);

async function confirm(page) {
  await page.getByRole('checkbox', { name: 'I have reviewed my answers and want to create my prompt.' }).check();
  await page.getByRole('button', { name: /^Create my prompt/ }).click();
  await heading(page, 'A profile. A starting point. New possibilities.');
  return page.getByRole('textbox', { name: 'Your complete recommendation prompt' }).inputValue();
}

async function exportsMatch(page, prompt, prefix) {
  await check(`${prefix}: clipboard matches full prompt`, async () => {
    await page.getByRole('button', { name: /^Copy prompt/ }).click();
    await page.getByRole('status').filter({ hasText: 'Prompt copied.' }).waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), prompt);
  });
  await check(`${prefix}: downloaded TXT matches full prompt`, async () => {
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download prompt .txt', exact: true }).click();
    const download = await downloadEvent;
    assert.equal(download.suggestedFilename(), 'off-the-list-prompt.txt');
    assert.equal(await download.failure(), null);
    const chunks = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString('utf8'), prompt);
    await download.delete();
  });
}

async function deletion(page, prefix) {
  const before = await saved(page);
  await check(`${prefix}: cancel deletion preserves answers`, async () => {
    const dialogEvent = page.waitForEvent('dialog');
    const click = page.getByRole('button', { name: 'Delete my answers', exact: true }).click();
    const dialog = await dialogEvent;
    assert.equal(dialog.type(), 'confirm');
    assert.match(dialog.message(), /Downloaded files and data you shared elsewhere will not be deleted/);
    await dialog.dismiss();
    await click;
    assert.deepEqual(await saved(page), before);
  });
  await check(`${prefix}: confirm deletion removes saved session after reload`, async () => {
    const dialogEvent = page.waitForEvent('dialog');
    const click = page.getByRole('button', { name: 'Delete my answers', exact: true }).click();
    await (await dialogEvent).accept();
    await click;
    await heading(page, 'Your next discovery starts with you.');
    assert.equal(await saved(page), null);
    await page.reload();
    await heading(page, 'Your next discovery starts with you.');
    assert.equal(await page.getByRole('link', { name: /Continue my saved answers/ }).count(), 0);
    assert.equal(await saved(page), null);
  });
}

async function inspiration(page, prefix) {
  await start(page, 'inspiration');
  await assetsLoaded(page, `${prefix}: all ten scene images load`);
  assert.equal(await page.locator('.scene img').count(), 10);
  await page.getByRole('radio', { name: "I'm not sure yet", exact: true }).check();
  await practical(page);
  await noOverflow(page, `${prefix}: practical page has no horizontal overflow`);
  await next(page, 'What should we take into account?');
  await next(page, 'Does this sound like you?');
  await check(`${prefix}: review requires explicit confirmation`, async () => {
    await page.getByRole('button', { name: /^Create my prompt/ }).click();
    await page.getByRole('alert').filter({ hasText: 'Review and confirm your answers' }).waitFor();
    assert.equal(new URL(page.url()).hash, '#form/5');
    await page.goto(`${base}/#result`);
    await heading(page, 'Does this sound like you?');
    assert.equal(new URL(page.url()).hash, '#form/5');
  });
  const prompt = await confirm(page);
  await check(`${prefix}: full unknown inspiration snapshot and safety instructions`, async () => {
    const data = snapshot(prompt);
    assert.equal(data.structuredInput.mode, 'inspiration');
    assert.equal(data.structuredInput.interestStatus, 'unsure');
    assert.deepEqual(data.structuredInput.interests, []);
    assert.equal(data.structuredInput.confirmationVersion, 1);
    assert.ok(data.structuredInput.confirmedAt);
    const unknown = data.profile.unknowns.join('\n');
    for (const pattern of [/Habitual interests: not sure yet/, /Budget: unknown, not unlimited/, /Full trip duration: unknown/, /Group composition: unknown/, /Functional needs.*unknown/, /Starting city: unknown/, /Entry and transit documentation: unknown/]) assert.match(unknown, pattern);
    for (const pattern of [/up to 3 specific places/, /at most 12 distinct candidates/, /Unknown essential conditions/, /If tools are unavailable/]) assert.match(prompt, pattern);
    assert.ok(!('categoryChoice' in data.structuredInput));
  });
  await exportsMatch(page, prompt, prefix);
  await page.reload();
  await heading(page, 'A profile. A starting point. New possibilities.');
  await check(`${prefix}: confirmed prompt persists exactly after reload`, async () => {
    assert.equal(await page.getByRole('textbox', { name: 'Your complete recommendation prompt' }).inputValue(), prompt);
  });
  await page.getByRole('button', { name: 'Make this a trip', exact: true }).click();
  await heading(page, 'The details that shape the possibilities.');
  await page.getByRole('textbox', { name: 'City', exact: true }).fill('Quito');
  await page.getByRole('button', { name: /^Save & return to review/ }).click();
  await heading(page, 'Does this sound like you?');
  await check(`${prefix}: review edit requires confirmation again`, async () => {
    await page.getByRole('button', { name: /^Create my prompt/ }).click();
    await page.getByRole('alert').filter({ hasText: 'Review and confirm your answers' }).waitFor();
  });
  await check(`${prefix}: direct result cannot expose unconfirmed edited answers`, async () => {
    await page.goto(`${base}/#result`);
    await page.waitForFunction(() => document.querySelector('#prompt') || location.hash === '#form/5');
    assert.equal(new URL(page.url()).hash, '#form/5',
      `Edited City=Quito is accessible at ${page.url()} with old confirmation version ${(await saved(page)).state.confirmationVersion}`);
  });
  await deletion(page, prefix);
}

async function trip(page, prefix) {
  await start(page, 'trip');
  for (const name of ['Taste a Place', 'Be Close to Nature', 'Understand Its Stories']) {
    await page.getByRole('checkbox', { name, exact: true }).check();
  }
  await check(`${prefix}: fourth scene rejected`, async () => {
    // click rather than check: this control intentionally reverts itself.
    await page.getByRole('checkbox', { name: 'Take On a Challenge', exact: true }).click();
    assert.equal(await page.getByRole('checkbox', { name: 'Take On a Challenge', exact: true }).isChecked(), false);
    assert.equal((await saved(page)).state.interests.length, 3);
    await page.getByRole('status').filter({ hasText: 'Deselect one' }).waitFor();
  });
  await check(`${prefix}: custom interest counts toward three-interest cap`, async () => {
    await page.getByRole('textbox', { name: /Add another interest/ }).fill('Astronomy');
    await page.getByRole('button', { name: /^Continue/ }).click();
    await page.getByRole('alert').filter({ hasText: 'Choose up to three interests' }).waitFor();
    await page.getByRole('textbox', { name: /Add another interest/ }).fill('');
  });
  await page.getByRole('radio', { name: 'Taste a Place', exact: true }).check();
  const order = (await saved(page)).state.sceneOrder;
  await page.reload();
  await heading(page, 'What do you usually enjoy when you travel?');
  await check(`${prefix}: selections, priority and randomized order persist`, async () => {
    assert.equal(await page.getByRole('checkbox', { name: 'Taste a Place', exact: true }).isChecked(), true);
    assert.equal(await page.getByRole('radio', { name: 'Taste a Place', exact: true }).isChecked(), true);
    assert.deepEqual((await saved(page)).state.sceneOrder, order);
    assert.deepEqual(await page.locator('.scene input').evaluateAll(inputs => inputs.map(input => input.value)), order);
  });
  await next(page, 'Your way of exploring.');
  await page.getByRole('radio', { name: 'With a few things arranged and room to improvise.', exact: true }).check();
  await page.getByRole('radio', { name: 'I enjoy simple places, provided my essential needs are met.', exact: true }).check();
  await page.getByRole('radio', { name: 'Cooking or learning', exact: true }).check();
  await page.getByRole('textbox', { name: /Think of a trip or getaway/ }).fill('A quiet cooking class by the coast.');
  await next(page, 'What are you hoping to find?');
  const rest = 'Rest and a slower pace.';
  const learn = 'Learning and understanding a place.';
  await page.getByRole('checkbox', { name: rest, exact: true }).check();
  await page.getByRole('checkbox', { name: learn, exact: true }).check();
  await check(`${prefix}: third motivation rejected`, async () => {
    await page.getByRole('checkbox', { name: 'A challenge.', exact: true }).click();
    assert.equal(await page.getByRole('checkbox', { name: 'A challenge.', exact: true }).isChecked(), false);
    assert.equal((await saved(page)).state.motivations.length, 2);
  });
  await check(`${prefix}: unsure motivation is mutually exclusive in both directions`, async () => {
    await page.getByRole('checkbox', { name: "I'm not sure yet.", exact: true }).check();
    assert.deepEqual((await saved(page)).state.motivations, ["I'm not sure yet."]);
    assert.equal(await page.getByRole('checkbox', { name: rest, exact: true }).isChecked(), false);
    await page.getByRole('checkbox', { name: rest, exact: true }).check();
    assert.equal(await page.getByRole('checkbox', { name: "I'm not sure yet.", exact: true }).isChecked(), false);
    assert.deepEqual((await saved(page)).state.motivations, [rest]);
  });
  await page.getByRole('checkbox', { name: learn, exact: true }).check();
  await page.getByRole('radio', { name: learn, exact: true }).check();
  await page.getByRole('radio', { name: 'One main activity a day, without filling the schedule.', exact: true }).check();
  await page.getByRole('radio', { name: 'New regions in countries I already know.', exact: true }).check();
  await page.getByRole('textbox', { name: /Places you have visited/ }).fill('Paris, France');
  await page.getByRole('combobox', { name: 'How complete is this list?', exact: true }).selectOption('partial');
  await next(page, 'The details that shape the possibilities.');
  await page.getByRole('textbox', { name: 'City', exact: true }).fill('Bogota');
  await page.getByRole('textbox', { name: 'Country', exact: true }).fill('Colombia');
  await page.getByRole('textbox', { name: /Alternative airport/ }).fill('Medellin');
  await page.getByRole('combobox', { name: 'Time available', exact: true }).selectOption('range');
  await page.getByRole('spinbutton', { name: 'Minimum', exact: true }).fill('5');
  await page.getByRole('spinbutton', { name: 'Maximum', exact: true }).fill('3');
  await invalid(page, `${prefix}: reversed duration range rejected`, /maximum duration must be at least the minimum/);
  await page.getByRole('spinbutton', { name: 'Minimum', exact: true }).fill('3');
  await page.getByRole('spinbutton', { name: 'Maximum', exact: true }).fill('5');
  await page.getByRole('combobox', { name: 'When could you travel?', exact: true }).selectOption('dates');
  await page.getByLabel('Leave starting point', { exact: true }).fill('2027-01-10T09:00');
  await page.getByLabel('Need to be back', { exact: true }).fill('2027-01-09T18:00');
  await invalid(page, `${prefix}: reversed date window rejected`, /valid departure and return window/);
  await page.getByLabel('Need to be back', { exact: true }).fill('2027-01-15T18:00');
  await page.getByRole('combobox', { name: 'When could you travel?', exact: true }).selectOption('months');
  await page.getByLabel('From month', { exact: true }).fill('2027-03');
  await page.getByLabel('Through month', { exact: true }).fill('2027-02');
  await invalid(page, `${prefix}: reversed month window rejected`, /valid departure and return window/);
  await page.getByLabel('Through month', { exact: true }).fill('2027-04');
  await page.getByRole('combobox', { name: 'When could you travel?', exact: true }).selectOption('dates');
  await page.getByLabel('Leave starting point', { exact: true }).fill('2027-01-10T09:00');
  await page.getByLabel('Need to be back', { exact: true }).fill('2027-01-15T18:00');
  await page.getByRole('combobox', { name: /Do you have a maximum travel time/ }).selectOption('limit');
  await page.getByRole('spinbutton', { name: /Maximum hours each way/ }).fill('0');
  await invalid(page, `${prefix}: zero travel limit rejected`, /maximum travel time greater than zero/);
  await page.getByRole('spinbutton', { name: /Maximum hours each way/ }).fill('6');
  await page.getByText('Transport preferences or restrictions (optional)', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Plane', exact: true }).check();
  await page.getByRole('textbox', { name: /Connections, driving/ }).fill('No overnight connections.');
  await page.getByRole('radio', { name: 'Add group details', exact: true }).click();
  await check(`${prefix}: group radio reflects boolean selection`, async () => {
    assert.equal(await page.getByRole('radio', { name: 'Add group details', exact: true }).isChecked(), true,
      'Add group details renders unchecked although groupKnown=true and fields are visible');
  });
  await page.getByRole('spinbutton', { name: 'Adults', exact: true }).fill('2');
  await page.getByRole('spinbutton', { name: 'Children', exact: true }).fill('1');
  await page.getByRole('spinbutton', { name: 'Children', exact: true }).blur();
  await invalid(page, `${prefix}: child ages required when children present`, /Add useful child ages or ranges/);
  await page.getByRole('textbox', { name: /Child ages or useful age ranges/ }).fill('8 years');
  await page.getByRole('textbox', { name: /Shared preferences or needs/ }).fill('One participant needs peanut-free meals.');
  await page.getByRole('combobox', { name: 'Budget in USD', exact: true }).selectOption('range');
  await page.getByRole('spinbutton', { name: 'Target range from (USD)', exact: true }).fill('0');
  await page.getByRole('spinbutton', { name: 'Upper cap (USD)', exact: true }).fill('1500');
  await invalid(page, `${prefix}: zero budget rejected`, /Enter a positive budget/);
  await page.getByRole('spinbutton', { name: 'Target range from (USD)', exact: true }).fill('1800');
  await invalid(page, `${prefix}: reversed budget range rejected`, /upper budget cap must be at least the lower amount/);
  await page.getByRole('spinbutton', { name: 'Target range from (USD)', exact: true }).fill('900');
  await invalid(page, `${prefix}: budget must specify included components`, /Select what the budget includes/);
  await page.getByRole('combobox', { name: 'This budget is', exact: true }).selectOption('person');
  for (const name of ['Main transport', 'Accommodation', 'Food']) await page.getByRole('checkbox', { name, exact: true }).check();
  await page.getByRole('textbox', { name: /Explicit flexibility, if any/ }).fill('Up to USD 100 extra.');
  await page.reload();
  await heading(page, 'The details that shape the possibilities.');
  await check(`${prefix}: conditional practical field values persist on reload`, async () => {
    assert.equal(await page.getByRole('spinbutton', { name: 'Maximum', exact: true }).inputValue(), '5');
    assert.equal(await page.getByLabel('Leave starting point', { exact: true }).inputValue(), '2027-01-10T09:00');
    assert.equal(await page.getByRole('textbox', { name: /Child ages or useful age ranges/ }).inputValue(), '8 years');
    assert.equal(await page.getByRole('spinbutton', { name: 'Upper cap (USD)', exact: true }).inputValue(), '1500');
  });
  await page.getByRole('button', { name: /Back$/ }).click();
  await heading(page, 'What are you hoping to find?');
  await page.getByRole('textbox', { name: /Another purpose/ }).fill('Family cooking holiday.');
  await next(page, 'The details that shape the possibilities.');
  await next(page, 'What should we take into account?');
  await page.getByRole('checkbox', { name: 'Food & dietary needs', exact: true }).check();
  await invalid(page, `${prefix}: selected need requires practical detail`, /Describe the practical need/);
  await page.getByRole('textbox', { name: /What is the practical need/ }).fill('Severe peanut allergy: no peanuts or cross-contact.');
  await page.getByRole('combobox', { name: 'How should we treat it?', exact: true }).selectOption('firm');
  await page.getByRole('combobox', { name: 'Who does this apply to?', exact: true }).selectOption('participant');
  await page.getByRole('combobox', { name: /Would you like to add relevant documentation context/ }).selectOption('provided');
  await page.getByRole('textbox', { name: 'Passport nationality / nationalities (me)', exact: true }).fill('Colombia');
  await page.getByRole('textbox', { name: 'Country of residence', exact: true }).fill('Colombia');
  await page.getByRole('textbox', { name: /Relevant permits \(optional/ }).fill('None declared');
  await page.getByRole('textbox', { name: /Relevant nationalities \/ permits of other travellers/ }).fill('Group passports not confirmed');
  await page.reload();
  await heading(page, 'What should we take into account?');
  await check(`${prefix}: allergy type, anonymous scope and documentation persist`, async () => {
    assert.equal(await page.getByRole('combobox', { name: 'How should we treat it?', exact: true }).inputValue(), 'firm');
    assert.equal(await page.getByRole('combobox', { name: 'Who does this apply to?', exact: true }).inputValue(), 'participant');
    assert.equal(await page.getByRole('textbox', { name: 'Country of residence', exact: true }).inputValue(), 'Colombia');
  });
  await next(page, 'Does this sound like you?');
  await noOverflow(page, `${prefix}: review has no horizontal overflow`);
  const prompt = await confirm(page);
  await check(`${prefix}: trip prompt preserves entered conditions and backward edit`, async () => {
    const data = snapshot(prompt);
    const input = data.structuredInput;
    const expected = {
      mode: 'trip', food: 'Cooking or learning', interestPriority: 'food', purposeNote: 'Family cooking holiday.',
      originCity: 'Bogota', originCountry: 'Colombia', alternateOrigin: 'Medellin',
      durationMode: 'range', durationMin: '3', durationMax: '5', durationUnit: 'days',
      periodMode: 'dates', dateStart: '2027-01-10T09:00', dateEnd: '2027-01-15T18:00',
      travelLimitMode: 'limit', travelLimit: '6', groupKnown: true, adults: '2', children: '1', childAges: '8 years',
      budgetMode: 'range', budgetMin: '900', budgetMax: '1500', budgetScope: 'person',
      budgetFlexibility: 'Up to USD 100 extra.', documentationMode: 'provided', passports: 'Colombia', residence: 'Colombia',
      history: 'Paris, France', historyCompleteness: 'partial', motivationPriority: learn,
    };
    for (const [name, value] of Object.entries(expected)) assert.deepEqual(input[name], value, name);
    assert.deepEqual(input.transport, ['Plane']);
    assert.deepEqual(input.budgetIncludes, ['Main transport', 'Accommodation', 'Food']);
    assert.deepEqual(input.needDetails.food, {
      text: 'Severe peanut allergy: no peanuts or cross-contact.', type: 'firm', scope: 'participant', margin: '', essential: true,
    });
    assert.match(data.profile.conditions.join('\n'), /firm restriction; applies to specific anonymous participant/);
    assert.match(data.profile.conditions.join('\n'), /USD per person/);
    assert.match(prompt, /BOTH directions/);
    assert.match(prompt, /Essential allergies and access needs are never automatically downgraded/);
  });
  await exportsMatch(page, prompt, prefix);
  await noOverflow(page, `${prefix}: result has no horizontal overflow`);
  await page.getByRole('button', { name: 'Review / edit answers', exact: true }).click();
  await heading(page, 'Does this sound like you?');
  const conditions = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Conditions to respect', exact: true }) });
  await conditions.getByRole('button', { name: 'Adjust this trip', exact: true }).click();
  await heading(page, 'The details that shape the possibilities.');
  await page.getByRole('textbox', { name: 'City', exact: true }).fill('Cali');
  await page.getByRole('button', { name: /^Save & return to review/ }).click();
  await heading(page, 'Does this sound like you?');
  await check(`${prefix}: review backward edit reflected and reconfirmed version increments`, async () => {
    const updated = snapshot(await confirm(page));
    assert.equal(updated.structuredInput.originCity, 'Cali');
    assert.equal(updated.structuredInput.confirmationVersion, 2);
  });
  await deletion(page, prefix);
}

async function invalid(page, name, message) {
  await check(name, async () => {
    await page.getByRole('button', { name: /^(Continue|Save & return to review)/ }).click();
    await page.getByRole('alert').filter({ hasText: message }).waitFor();
  });
}

async function conditionalBugs(page) {
  await start(page, 'trip');
  await practical(page);
  await page.getByRole('combobox', { name: 'Time available', exact: true }).selectOption('exact');
  await page.getByRole('spinbutton', { name: 'Duration', exact: true }).fill('4');
  await page.getByRole('combobox', { name: 'Time available', exact: true }).selectOption('unknown');
  await page.getByRole('combobox', { name: 'When could you travel?', exact: true }).selectOption('dates');
  await page.getByLabel('Leave starting point', { exact: true }).fill('2027-05-10T09:00');
  await page.getByLabel('Need to be back', { exact: true }).fill('2027-05-15T09:00');
  await page.getByRole('textbox', { name: /Date flexibility/ }).fill('Only plus one day');
  await page.getByRole('combobox', { name: 'When could you travel?', exact: true }).selectOption('unknown');
  await page.getByRole('radio', { name: 'Add group details', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Adults', exact: true }).fill('2');
  await page.getByRole('spinbutton', { name: 'Children', exact: true }).fill('1');
  await page.getByRole('spinbutton', { name: 'Children', exact: true }).blur();
  await page.getByRole('textbox', { name: /Child ages or useful age ranges/ }).fill('8 years');
  await page.getByRole('textbox', { name: /Shared preferences or needs/ }).fill('STALE group note');
  await page.getByRole('radio', { name: 'Not decided yet', exact: true }).click();
  await page.getByRole('combobox', { name: 'Budget in USD', exact: true }).selectOption('range');
  await page.getByRole('spinbutton', { name: 'Target range from (USD)', exact: true }).fill('900');
  await page.getByRole('spinbutton', { name: 'Upper cap (USD)', exact: true }).fill('1500');
  await page.getByRole('checkbox', { name: 'Food', exact: true }).check();
  await page.getByRole('combobox', { name: 'Budget in USD', exact: true }).selectOption('unknown');
  await next(page, 'What should we take into account?');
  await page.getByRole('combobox', { name: /Would you like to add relevant documentation context/ }).selectOption('provided');
  await page.getByRole('textbox', { name: 'Passport nationality / nationalities (me)', exact: true }).fill('STALE nationality');
  await page.getByRole('combobox', { name: /Would you like to add relevant documentation context/ }).selectOption('unknown');
  await next(page, 'Does this sound like you?');
  const data = snapshot(await confirm(page));
  await check('Conditional reset: hidden stale values absent from exported snapshot', async () => {
    const input = data.structuredInput;
    const stale = Object.fromEntries(['durationMin', 'dateStart', 'dateEnd', 'periodFlexibility', 'adults', 'children', 'childAges', 'groupNotes', 'budgetMin', 'budgetMax', 'passports']
      .filter(name => input[name] !== '').map(name => [name, input[name]]));
    assert.deepEqual(stale, {});
  });
  await check('Conditional reset: hidden group note and date flexibility absent from readable profile', async () => {
    assert.doesNotMatch(Object.values(data.profile).flat().join('\n'), /STALE group note|Only plus one day/);
  });
}

async function allergyBug(page) {
  await start(page, 'trip');
  await practical(page);
  await next(page, 'What should we take into account?');
  await page.getByRole('checkbox', { name: 'Food & dietary needs', exact: true }).check();
  await page.getByRole('textbox', { name: /What is the practical need/ }).fill('Severe peanut allergy: avoid peanuts and cross-contact.');
  await page.getByRole('combobox', { name: 'How should we treat it?', exact: true }).selectOption('flexible');
  await page.getByRole('combobox', { name: 'Who does this apply to?', exact: true }).selectOption('group');
  assert.equal(await page.getByRole('combobox', { name: 'How should we treat it?', exact: true }).inputValue(), 'verify');
  await next(page, 'Does this sound like you?');
  const data = snapshot(await confirm(page));
  await check('Essential allergy cannot be exported as a flexible preference', async () => {
    assert.notEqual(data.structuredInput.needDetails.food.type, 'flexible',
      data.profile.conditions.find(line => line.startsWith('Need food:')));
  });
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
    console.log('Chromium missing; installing browser only with npm exec.');
    const install = spawn('npm', ['exec', '--yes', '--package=playwright', '--', 'playwright', 'install', 'chromium'], {
      cwd: artifacts, stdio: 'inherit',
    });
    const [code] = await once(install, 'exit');
    assert.equal(code, 0, 'Chromium installation failed');
    browser = await chromium.launch({ headless: true, downloadsPath: artifacts });
  }
  const contextFor = async (name, mobile = false) => {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      isMobile: mobile, hasTouch: mobile, permissions: ['clipboard-read', 'clipboard-write'],
      reducedMotion: 'reduce', acceptDownloads: true,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    page.on('pageerror', error => runtimeErrors.push({ context: name, error: error.message }));
    page.on('requestfailed', request => networkErrors.push({ context: name, url: request.url(), error: request.failure()?.errorText }));
    page.on('response', response => { if (response.status() >= 400) networkErrors.push({ context: name, url: response.url(), status: response.status() }); });
    return { page, context };
  };
  for (const mobile of [false, true]) {
    const name = mobile ? 'Mobile 390px' : 'Desktop 1440px';
    const { page, context } = await contextFor(name, mobile);
    await check(`${name}: landing`, async () => {
      await page.goto(base);
      await heading(page, 'Your next discovery starts with you.');
      await assetsLoaded(page, `${name}: landing images and font loaded`);
      await noOverflow(page, `${name}: landing has no horizontal overflow`);
      await page.screenshot({ path: join(artifacts, `off-the-list-${mobile ? 'mobile' : 'desktop'}.png`), fullPage: true });
    });
    await check(`${name}: full inspiration flow completes`, () => inspiration(page, name));
    await context.close();
    const tripContext = await contextFor(`${name} trip`, mobile);
    await check(`${name}: full trip flow completes`, () => trip(tripContext.page, name));
    await tripContext.context.close();
  }
  for (const [name, flow] of [['Conditional data investigation', conditionalBugs], ['Allergy investigation', allergyBug]]) {
    const { page, context } = await contextFor(name);
    await check(name, () => flow(page));
    await context.close();
  }
  await check('No browser JavaScript errors across all flows', async () => assert.deepEqual(runtimeErrors, []));
  await check('No failed network requests or HTTP error responses', async () => assert.deepEqual(networkErrors, []));
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
console.log(JSON.stringify({ failed, runtimeErrors, networkErrors }, null, 2));
process.exitCode = failed.length ? 1 : 0;
