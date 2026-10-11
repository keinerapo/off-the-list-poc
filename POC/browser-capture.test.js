// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs [TEST_FILTER="scenario substring"] node POC/browser-capture.test.js
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { CAPTURE_VERSION, POLICY_VERSION, captureDefaults, captureSnapshot, screeningQuestions, syncTravellers, validateCapture, validateDecision } from './capture.js';
import { decisions, decisionIds } from './canvas.js';
import { options } from './model.js';

const modulePath = process.env.PLAYWRIGHT_MODULE;
assert.ok(modulePath && isAbsolute(modulePath), 'Set PLAYWRIGHT_MODULE to an absolute playwright index.mjs path.');
const { chromium } = await import(pathToFileURL(modulePath).href);
const root = dirname(fileURLToPath(import.meta.url));
const artifacts = '/var/folders/0l/q1lhqbvx5mq52qmvlqfhr9th0000gn/T/opencode';
const base = 'http://127.0.0.1:4174';
const key = 'off-the-list-poc-v1';
const results = [], runtimeErrors = [], networkErrors = [], screenshots = [];
let browser, serverLog = '', serverReady = false;

// The ready fixture from capture.test.js, with the canvas's selectable prose values.
function readyState() {
  const state = {
    ...captureDefaults(), mode: 'trip', presentationName: 'A traveller', interests: ['nature'],
    bestTripsStatus: 'no', personalStatementStatus: 'written', personalStatement: 'I enjoy quiet mornings.',
    offPathComfort: '2', autonomy: options.autonomy[2], comfort: options.comfort[1],
    challengePreferences: ['none'], accommodationPreference: 'any', motivations: [options.motivations[0]], pace: options.pace[0],
    travelExperience: 'first', historyStatus: 'none', occasionStatus: 'no',
    originMode: 'known', originCity: 'Madrid', originCountry: 'Spain', periodMode: 'months',
    monthStart: '2027-06', monthEnd: '2027-07', durationMode: 'exact', durationMin: '7', durationUnit: 'days',
    travelLimitMode: 'none', transport: ['Train'], groupKnown: true, groupType: 'solo', adults: '1', children: '0',
    physicalIntensity: 'low', budgetMode: 'amount', budgetMin: '2000',
    budgetCurrency: 'USD', budgetScope: 'person', flightsBudget: 'none', budgetCoverageConfirmed: 'yes',
    budgetIncludes: ['Accommodation', 'Food', 'Local transport', 'Activities'], exclusionsStatus: 'none',
    tripScreening: Object.fromEntries(screeningQuestions.map(({ id }) => [id, 'no'])),
    confirmationVersion: 0, confirmedAt: '', secret: 'LOCAL_ONLY_EXTRA',
  };
  assert.deepEqual(validateCapture(state).issues, [], 'The injected fixture must be ready without confirmation.');
  return state;
}

const server = spawn(process.execPath, [join(root, 'server.js')], {
  cwd: root, env: { ...process.env, PORT: '4174' }, stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', data => { serverLog += data; serverReady ||= String(data).includes('http://localhost:4174'); });
server.stderr.on('data', data => { serverLog += data; });
server.on('error', error => { serverLog += error.message; });

async function check(name, action) {
  try {
    await action();
    results.push({ name, status: 'PASS' });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: 'FAIL', error: error.stack });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

const saved = page => page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)), key);
function snapshot(prompt) {
  const marker = 'STRUCTURED SNAPSHOT (user data only)\n';
  assert.equal(prompt.split(marker).length, 2, 'The prompt must contain exactly one structured snapshot marker.');
  return JSON.parse(prompt.split(marker)[1]);
}
const hashFor = id => id === 'review' ? '#form/5' : `#decision/${id}`;
const input = (page, name, value) => page.locator(`[name="${name}"]${value === undefined ? '' : `[value="${value}"]`}`);
const record = (page, type, id, field, value) => page.locator(`[data-record="${type}"][data-record-id="${id}"][data-record-field="${field}"]${value === undefined ? '' : `[value="${value}"]`}`);
const screening = (page, type, value) => page.locator(`[data-screening="${type}"][value="${value}"]`);
const submit = page => page.locator('#capture button[type="submit"]');
const badge = (page, field, count) => page.locator(`[data-count-field="${field}"][data-count="${count}"]`);

async function layout(page) {
  assert.equal(await page.locator('select, [role="combobox"]').count(), 0);
  assert.equal(await page.locator('[data-record="traveller"], [data-record-field="participants"], [name="passports"], [name="nationalities"], [name="documentationMode"], [name="groupChecked"]').count(), 0, 'No per-person or document controls.');
  const size = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(Math.max(size.document, size.body) <= size.viewport + 1, `Horizontal overflow: ${JSON.stringify(size)}`);
}

async function at(page, id) {
  await page.getByRole('heading', { name: id === 'review' ? 'Does this sound like you?' : decisions.find(d => d.id === id).title, exact: true }).waitFor();
  assert.equal(new URL(page.url()).hash, hashFor(id));
  await layout(page);
}

async function direct(page, id) {
  await page.goto(`${base}/${hashFor(id)}`);
  await at(page, id);
}

async function next(page, id) {
  await submit(page).click();
  await at(page, id);
}

async function unchanged(page, action) {
  const hash = new URL(page.url()).hash;
  await action();
  await page.waitForTimeout(30);
  assert.equal(new URL(page.url()).hash, hash, 'An answer must not auto-advance.');
  await layout(page);
}

const choose = (page, name, value) => unchanged(page, () => input(page, name, value).check());
const fill = (page, name, value) => unchanged(page, () => input(page, name).fill(value));
const recordChoose = (page, type, id, field, value) => unchanged(page, () => record(page, type, id, field, value).check());
const recordFill = (page, type, id, field, value) => unchanged(page, () => record(page, type, id, field).fill(value));

async function open(page, label) {
  const details = label === 'Your starting point' ? page.locator('#trip-sheet > details')
    : page.locator('details').filter({ has: page.locator('summary').getByText(label, { exact: true }) });
  if (!await details.evaluate(node => node.open)) await details.locator('summary').click();
}

async function retained(page, control, action) {
  await open(page, 'Your starting point');
  await control.focus();
  await page.evaluate(() => {
    window.retainedCanvas = document.querySelector('#capture');
    window.retainedIntro = document.querySelector('#capture .intro');
    window.retainedSheet = document.querySelector('#trip-sheet > details');
    window.retainedFocus = document.activeElement;
    window.retainedImages = [...document.querySelectorAll('.scene img')];
  });
  await unchanged(page, action);
  assert.deepEqual(await page.evaluate(() => ({
    canvas: window.retainedCanvas === document.querySelector('#capture'),
    intro: window.retainedIntro === document.querySelector('#capture .intro'),
    sheet: window.retainedSheet === document.querySelector('#trip-sheet > details') && window.retainedSheet.open,
    focus: window.retainedFocus === document.activeElement && window.retainedFocus.isConnected,
    images: window.retainedImages.every((node, index) => node === document.querySelectorAll('.scene img')[index]),
  })), { canvas: true, intro: true, sheet: true, focus: true, images: true });
}

async function blocked(page) {
  const id = new URL(page.url()).hash.replace('#decision/', '');
  if (id !== '#form/5') assert.ok(validateDecision((await saved(page)).state, id), `Expected ${id} to be incomplete before submit.`);
  await unchanged(page, () => submit(page).click());
  assert.ok((await page.locator('#form-error[role="alert"]').innerText()).trim(), 'Blank submit must explain the missing answer.');
  assert.equal(await page.locator('#form-error').evaluate(node => node === document.activeElement), true);
  assert.equal((await saved(page)).state.confirmation, null);
  assert.equal(await page.locator('#prompt').count(), 0);
}

async function redirect(page, id) {
  for (const hash of ['#form/5', '#result']) {
    await page.goto(`${base}/${hash}`);
    await at(page, id);
    assert.equal(await page.locator('#confirm-profile, #prompt').count(), 0, 'Incomplete answers cannot reach review or output.');
  }
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

function privateOutput(data) {
  for (const field of ['travellers', 'unassignedTravellers', 'passports', 'residence', 'permits', 'groupDocuments', 'documentationMode']) {
    assert.equal(Object.hasOwn(data, field), false, `${field} must not be exported.`);
  }
  assert.doesNotMatch(JSON.stringify(data), /LOCAL_ONLY_/);
}

async function exportState(page) {
  const data = JSON.parse(await downloaded(page, 'export', 'off-the-list-session.json'));
  assert.equal(data.captureVersion, CAPTURE_VERSION);
  assert.equal(data.policyVersion, POLICY_VERSION);
  assert.ok(Number.isFinite(Date.parse(data.exportedAt)));
  assert.deepEqual(data.state, captureSnapshot(data.state));
  privateOutput(data.state);
  assert.doesNotMatch(JSON.stringify(data), /LOCAL_ONLY_/);
  return data.state;
}

async function inject(page, state, id = 'review') {
  await page.goto(base);
  await page.evaluate(({ key, state, id }) => localStorage.setItem(key, JSON.stringify({
    state, step: 5, decision: id, expiresAt: Date.now() + 86400000,
  })), { key, state, id });
  // A reload is required to replace the app's in-memory session.
  await page.reload();
  await direct(page, id);
  assert.equal((await saved(page)).state.confirmation, null);
}

async function review(page) {
  await at(page, 'review');
  assert.equal(await page.locator('#capture input[type="checkbox"]').count(), 1);
  assert.equal(await page.locator('#confirm-profile').count(), 1);
  assert.equal(await page.locator('#confirm-needs, #confirm-group, [data-action="preliminary"]').count(), 0);
  assert.doesNotMatch(await page.locator('#capture').innerText(), /Still to resolve/i);
}

async function confirm(page) {
  await review(page);
  const previousVersion = (await saved(page)).state.confirmationVersion || 0;
  await blocked(page);
  await unchanged(page, () => page.locator('#confirm-profile').check());
  await submit(page).click();
  await page.locator('#prompt').waitFor();
  assert.equal(new URL(page.url()).hash, '#result');
  await layout(page);
  const state = (await saved(page)).state;
  assert.equal(state.confirmation.version, previousVersion + 1);
  assert.equal(state.confirmationVersion, previousVersion + 1);
  assert.equal(state.confirmation.captureVersion, CAPTURE_VERSION);
  assert.equal(state.confirmation.policyVersion, POLICY_VERSION);
  assert.ok(Number.isFinite(Date.parse(state.confirmation.date)));
  assert.equal(state.confirmation.date, state.confirmedAt);
  assert.deepEqual(state.confirmedSnapshot, captureSnapshot(state));
  const prompt = await page.locator('#prompt').inputValue();
  assert.match(prompt, /^Travel proposal request \/ open points disclosed/);
  const data = snapshot(prompt);
  assert.equal(data.captureVersion, CAPTURE_VERSION);
  assert.equal(data.policyVersion, POLICY_VERSION);
  assert.equal(data.readiness.ready, true);
  assert.equal(data.readiness.recommendationVerified, false);
  assert.deepEqual(data.structuredInput, state.confirmedSnapshot);
  privateOutput(data.structuredInput);
  assert.doesNotMatch(prompt, /LOCAL_ONLY_/);
  return prompt;
}

async function fidelity(page, prompt) {
  await page.locator('[data-action="copy"]').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Prompt copied'));
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), prompt);
  assert.equal(await downloaded(page, 'download', 'off-the-list-prompt.txt'), prompt);
  assert.deepEqual(await exportState(page), (await saved(page)).state.confirmedSnapshot);
}

async function shot(page, name) {
  const path = join(artifacts, `off-the-list-capture-${name}.png`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path, fullPage: true });
  screenshots.push(path);
}

async function freshUI(page, width, mode) {
  await page.goto(`${base}/#entry`);
  await page.locator(`[data-mode="${mode}"]`).click();
  await at(page, 'presentation');
  const fresh = (await saved(page)).state;
  for (const field of ['presentationName', 'interestStatus', 'autonomy', 'comfort', 'personalStatementStatus',
    'travelExperience', 'historyStatus', 'originMode', 'periodMode', 'durationMode', 'travelLimitMode', 'groupKnown',
    'groupType', 'adults', 'children', 'youngChildrenStatus', 'budgetMode', 'budgetCurrency', 'budgetScope', 'exclusionsStatus', 'physicalIntensity']) {
    assert.equal(fresh[field], '', `Fresh ${field} must be blank despite the original app defaults.`);
  }
  assert.deepEqual(fresh.tripScreening, captureDefaults().tripScreening);
  assert.deepEqual(fresh.travellers, []);
  let id = 'presentation';
  const visited = [];
  while (id !== 'review') {
    assert.ok(!visited.includes(id), `Unexpected repeated question ${id}`);
    visited.push(id);
    await at(page, id);
    const state = (await saved(page)).state;
    if (validateDecision(state, id)) await blocked(page);
    switch (id) {
      case 'presentation':
        assert.equal(await input(page, 'presentationName').inputValue(), '');
        await retained(page, input(page, 'presentationName'), () => input(page, 'presentationName').fill('Weekend explorer'));
        break;
      case 'interests': await choose(page, 'interestStatus', 'unsure'); break;
      case 'autonomy': case 'comfort': await choose(page, id, 'unknown'); break;
      case 'best-trips': await choose(page, 'bestTripsStatus', 'unknown'); break;
      case 'personal-statement': await choose(page, 'personalStatementStatus', 'unknown'); break;
      case 'off-path': await choose(page, 'offPathComfort', 'unknown'); break;
      case 'challenge': await choose(page, 'challengePreferences', 'unknown'); break;
      case 'accommodation': await choose(page, 'accommodationPreference', 'unknown'); break;
      case 'motivations': await choose(page, 'motivations', options.motivations.at(-1)); break;
      case 'pace': await choose(page, 'pace', options.pace.at(-1)); break;
      case 'history':
        await choose(page, 'travelExperience', 'unknown');
        await blocked(page);
        await choose(page, 'historyStatus', 'unknown');
        assert.equal(await input(page, 'historyCompleteness').count(), 0);
        assert.equal(await input(page, 'historyScope').count(), 0);
        break;
      case 'occasion': await choose(page, 'occasionStatus', 'unknown'); break;
      case 'exclusions': await choose(page, 'exclusionsStatus', 'unknown'); break;
      case 'origin': await choose(page, 'originMode', 'unknown'); break;
      case 'timing': await choose(page, 'periodMode', 'unknown'); break;
      case 'duration': await choose(page, 'durationMode', 'unknown'); break;
      case 'travel':
        await choose(page, 'travelLimitMode', 'unknown');
        await blocked(page);
        await choose(page, 'transport', 'unknown');
        break;
      case 'group':
        assert.equal(await page.locator('[name="groupKnown"]:checked').count(), 0);
        await choose(page, 'groupKnown', 'no');
        assert.equal(await input(page, 'youngChildrenStatus').count(), 0);
        break;
      case 'budget': await choose(page, 'budgetMode', 'unknown'); break;
      case 'physical-intensity': await choose(page, 'physicalIntensity', 'unknown'); break;
      case 'memory': case 'needs': break;
      default: {
        assert.ok(id.startsWith('screening-'), `Unhandled decision ${id}`);
        const type = id.slice(10);
        assert.equal(await page.locator(`[data-screening="${type}"]`).count(), 4, 'Exactly one group question, not one per traveller.');
        assert.equal(await page.locator('.group-screening legend').innerText(), screeningQuestions.find(q => q.id === type).label);
        await retained(page, screening(page, type, 'unknown'), () => screening(page, type, 'unknown').check());
      }
    }
    const updated = (await saved(page)).state;
    assert.equal(validateDecision(updated, id), '', `${id} must accept an explicit unknown answer.`);
    const route = [...decisionIds(updated), 'review'];
    const following = route[route.indexOf(id) + 1];
    await next(page, following);
    id = following;
  }
  assert.deepEqual(visited, decisionIds((await saved(page)).state));
  assert.deepEqual(validateCapture((await saved(page)).state).issues, []);
  const prompt = await confirm(page);
  const data = snapshot(prompt);
  assert.equal(data.structuredInput.mode, mode);
  assert.equal(data.structuredInput.groupKnown, false);
  assert.ok(data.readiness.uncertainties.length);
  assert.ok(data.readiness.reviewRequired.length);
  assert.ok(screeningQuestions.every(q => data.structuredInput.tripScreening[q.id] === 'unknown'));
  await fidelity(page, prompt);
  await shot(page, `${width}-${mode}-unknown-result`);
  await page.reload();
  await page.locator('#prompt').waitFor();
  assert.equal(await page.locator('#prompt').inputValue(), prompt);
  await layout(page);
}

async function mandatoryRedirects(page) {
  for (const [field, id] of [['personalStatementStatus', 'personal-statement'], ['groupKnown', 'group'], ['physicalIntensity', 'physical-intensity']]) {
    const fixture = readyState();
    fixture[field] = '';
    await inject(page, fixture, id);
    await redirect(page, id);
    await blocked(page);
  }
}

async function familyAndBranches(page, width) {
  await inject(page, { ...readyState(), historyCompleteness: '' });
  await direct(page, 'group');
  await choose(page, 'groupType', 'family');
  await unchanged(page, () => badge(page, 'adults', 2).click());
  assert.equal(await input(page, 'youngChildrenStatus').count(), 0);
  await unchanged(page, () => badge(page, 'children', 1).click());
  assert.equal(await page.locator('[name="youngChildrenStatus"]:checked').count(), 0);
  await blocked(page);
  await choose(page, 'youngChildrenStatus', 'unknown');
  assert.equal(await input(page, 'youngChildrenRoutine').count(), 0);
  assert.deepEqual((await saved(page)).state.travellers, [], 'Generic group counts do not create individual profiles.');
  await shot(page, `${width}-generic-family`);
  await direct(page, 'history');
  await choose(page, 'travelExperience', 'unknown');
  await choose(page, 'historyStatus', 'unknown');
  assert.equal(await input(page, 'historyCompleteness').count(), 0);
  await choose(page, 'historyStatus', 'visited');
  await blocked(page);
  await fill(page, 'history', 'Spain');
  await blocked(page);
  await choose(page, 'historyCompleteness', 'unknown');
  await choose(page, 'historyStatus', 'none');
  assert.equal(await input(page, 'historyCompleteness').count(), 0);
  await direct(page, 'interests');
  await choose(page, 'interests', 'food');
  await direct(page, 'priority');
  await choose(page, 'interestPriority', 'unknown');
  await direct(page, 'food');
  await blocked(page);
  await choose(page, 'food', 'unknown');
  await direct(page, 'screening-food');
  await choose(page, 'screening-food', 'private');
  await direct(page, 'review');
  const prompt = await confirm(page);
  assert.equal(snapshot(prompt).structuredInput.youngChildrenStatus, 'unknown');
  assert.equal(snapshot(prompt).structuredInput.tripScreening.food, 'private');
  await fidelity(page, prompt);
}

async function repeatedRecords(page, width) {
  await inject(page, readyState());
  await direct(page, 'screening-food');
  await retained(page, screening(page, 'food', 'yes'), () => screening(page, 'food', 'yes').check());
  assert.deepEqual((await saved(page)).state.essentialNeeds, [], 'Yes exposes Add without inventing a requirement.');
  await blocked(page);
  const add = page.locator('[data-add-record="essential-need"][data-need-type="food"]');
  const texts = ['Avoid peanuts; separate preparation required.', 'Avoid shellfish; separate preparation required.'];
  const ids = [];
  for (const text of texts) {
    await unchanged(page, () => add.click());
    const need = (await saved(page)).state.essentialNeeds.at(-1);
    ids.push(need.id);
    await blocked(page);
    const control = record(page, 'essential-need', need.id, 'text');
    await retained(page, control, () => control.fill(text));
    await unchanged(page, () => control.press('Tab'));
    assert.equal(validateDecision((await saved(page)).state, 'screening-food'), '', 'Only practical text is mandatory.');
    assert.equal(await record(page, 'essential-need', need.id, 'affected').inputValue(), '');
    assert.equal(await page.locator('[data-record-field="participants"], [data-record-field="requirementKind"], [data-record-field="reviewStatus"]').count(), 0);
  }
  assert.equal(new Set(ids).size, 2);
  await shot(page, `${width}-separate-allergies`);
  const before = captureSnapshot((await saved(page)).state);
  await page.reload();
  await at(page, 'screening-food');
  assert.deepEqual(captureSnapshot((await saved(page)).state), before);
  assert.deepEqual(await page.locator('[data-record="essential-need"][data-record-field="text"]').evaluateAll(nodes => nodes.map(node => node.value)), texts);
  await choose(page, 'screening-food', 'private');
  assert.equal(validateCapture((await saved(page)).state).ready, true);
  assert.deepEqual((await saved(page)).state.essentialNeeds.map(n => n.id), ids);
  await unchanged(page, () => add.click());
  const removable = (await saved(page)).state.essentialNeeds.at(-1).id;
  await unchanged(page, () => page.locator(`[data-remove-record="essential-need"][data-record-id="${removable}"]`).click());
  assert.deepEqual((await saved(page)).state.essentialNeeds.map(n => n.id), ids);
  await direct(page, 'best-trips');
  await choose(page, 'bestTripsStatus', 'yes');
  assert.equal((await saved(page)).state.bestTrips.length, 1);
  for (const place of ['Mountain village', 'Coastal town']) {
    if (place === 'Coastal town') await unchanged(page, () => page.locator('[data-add-record="best-trip"]').click());
    const id = (await saved(page)).state.bestTrips.at(-1).id;
    await recordFill(page, 'best-trip', id, 'place', place);
    await recordFill(page, 'best-trip', id, 'moment', 'A quiet morning walk.');
    await recordFill(page, 'best-trip', id, 'reason', 'Time outside without rushing.');
  }
  await direct(page, 'exclusions');
  await choose(page, 'exclusionsStatus', 'yes');
  for (const [text, strength] of [['No animal riding.', 'firm'], ['Avoid noisy evenings.', 'prefer']]) {
    await unchanged(page, () => page.locator('[data-add-record="exclusion"]').click());
    const id = (await saved(page)).state.exclusions.at(-1).id;
    await recordFill(page, 'exclusion', id, 'text', text);
    await blocked(page);
    await recordChoose(page, 'exclusion', id, 'strength', strength);
  }
  await direct(page, 'review');
  const prompt = await confirm(page), data = snapshot(prompt).structuredInput;
  assert.deepEqual(data.essentialNeeds.map(n => n.text), texts);
  assert.equal(data.tripScreening.food, 'private', 'Privacy status is not overwritten by saved allergies.');
  assert.equal(data.bestTrips.length, 2);
  assert.deepEqual(data.exclusions.map(e => e.strength), ['firm', 'prefer']);
  await fidelity(page, prompt);
}

async function fluentInterests(page) {
  await inject(page, readyState());
  await direct(page, 'interests');
  await retained(page, input(page, 'interests', 'food'), () => input(page, 'interests', 'food').check());
  await choose(page, 'interests', 'stories');
  await unchanged(page, () => input(page, 'interests', 'challenge').click());
  assert.equal(await input(page, 'interests', 'challenge').isChecked(), false);
  assert.equal((await saved(page)).state.interests.length, 3);
  await next(page, 'priority');
  await blocked(page);
  await choose(page, 'interestPriority', 'unknown');
  await direct(page, 'food');
  await choose(page, 'food', 'unknown');
  await direct(page, 'motivations');
  await choose(page, 'motivations', options.motivations[1]);
  await blocked(page);
  await choose(page, 'motivationPriority', 'unknown');
  await choose(page, 'motivations', options.motivations.at(-1));
  assert.deepEqual((await saved(page)).state.motivations, [options.motivations.at(-1)]);
  await direct(page, 'review');
  await confirm(page);
}

async function legacyLocalOnly(page) {
  const fixture = readyState();
  Object.assign(fixture, { captureVersion: 'original-capture-1', policyVersion: 'original-policy-1',
    passports: 'LOCAL_ONLY_PASSPORT', residence: 'LOCAL_ONLY_RESIDENCE', permits: 'LOCAL_ONLY_PERMIT',
    groupDocuments: 'LOCAL_ONLY_GROUP', documentationMode: 'provided',
    confirmation: { version: 99 }, confirmedAt: 'yesterday',
    historyStatus: 'unknown', historyCompleteness: 'unknown', groupKnown: 'unknown',
    needs: ['mobility'], needsStatus: 'specified',
    needDetails: { mobility: { text: 'No stairs.', type: 'firm', participants: ['former-traveller'], essential: true } },
    essentialNeeds: [{ id: 'legacy-food', type: 'food', text: 'Avoid peanuts.', participants: ['former-traveller'], affected: '' }],
  });
  syncTravellers(fixture);
  fixture.travellers[0].screening = Object.fromEntries(screeningQuestions.map(({ id }) => [id, 'no']));
  fixture.travellers[0].documents.nationalities = 'LOCAL_ONLY_NATIONALITY';
  fixture.travellers[0].screening.food = 'yes';
  delete fixture.tripScreening;
  await inject(page, fixture);
  const migrated = (await saved(page)).state;
  assert.equal(migrated.tripScreening.food, 'yes');
  assert.equal(migrated.groupKnown, 'unknown', 'An old explicit unknown is accepted, not replaced with blank.');
  assert.deepEqual(migrated.needs, fixture.needs);
  assert.deepEqual(migrated.needDetails, fixture.needDetails);
  assert.deepEqual(migrated.essentialNeeds, fixture.essentialNeeds);
  assert.equal(migrated.passports, fixture.passports);
  assert.equal(migrated.travellers[0].documents.nationalities, fixture.travellers[0].documents.nationalities);
  await direct(page, 'needs');
  assert.equal(await page.locator('[data-need="mobility"][data-detail="text"]').inputValue(), 'No stairs.');
  assert.equal(await page.locator('[data-transfer-need], [data-detail="participants"]').count(), 0, 'No forced migration or assignment reconciliation.');
  await page.reload();
  await at(page, 'needs');
  const local = (await saved(page)).state;
  assert.deepEqual(local.travellers, migrated.travellers);
  assert.deepEqual(local.needDetails, fixture.needDetails);
  for (const field of ['passports', 'residence', 'permits', 'groupDocuments']) assert.equal(local[field], fixture[field]);
  await direct(page, 'review');
  const prompt = await confirm(page);
  assert.deepEqual(snapshot(prompt).structuredInput.essentialNeeds, fixture.essentialNeeds);
  assert.deepEqual(snapshot(prompt).structuredInput.needs, fixture.needs);
  await fidelity(page, prompt);
  await page.reload();
  await page.locator('#prompt').waitFor();
  assert.equal(await page.locator('#prompt').inputValue(), prompt);
  assert.deepEqual((await saved(page)).state.travellers, migrated.travellers);
}

async function currencyAndConfirmation(page) {
  await inject(page, readyState());
  await direct(page, 'budget');
  await open(page, 'Verified EUR conversion (optional)');
  for (const [field, value] of [['rate', '0.9'], ['source', 'ECB reference'], ['date', '2026-10-09']]) await recordFill(page, 'conversion', 'eur-conversion', field, value);
  await page.reload();
  await at(page, 'budget');
  assert.deepEqual((await saved(page)).state.eurConversion, { rate: '0.9', source: 'ECB reference', date: '2026-10-09' });
  await direct(page, 'review');
  const original = await confirm(page);
  const immutable = structuredClone((await saved(page)).state.confirmedSnapshot);
  assert.equal(snapshot(original).budgetReference.eurUpperCap, 1800);
  await fidelity(page, original);
  await direct(page, 'budget');
  await choose(page, 'budgetCurrency', 'GBP');
  let state = (await saved(page)).state;
  assert.equal(state.confirmation, null);
  assert.equal(state.confirmedSnapshot, null);
  assert.equal(state.confirmedAt, '');
  assert.equal(state.budgetMin, '2000');
  assert.equal(state.budgetCoverageConfirmed, '');
  assert.deepEqual(state.eurConversion, { rate: '', source: '', date: '' });
  await redirect(page, 'includes');
  await blocked(page);
  await choose(page, 'budgetCoverageConfirmed', 'yes');
  await direct(page, 'budget');
  await open(page, 'Verified EUR conversion (optional)');
  for (const [field, value] of [['rate', '1.1'], ['source', 'GBP reference'], ['date', '2026-10-10']]) await recordFill(page, 'conversion', 'eur-conversion', field, value);
  await choose(page, 'budgetScope', 'group');
  state = (await saved(page)).state;
  assert.equal(state.budgetCoverageConfirmed, '');
  assert.equal(state.eurConversion.rate, '1.1');
  await direct(page, 'includes');
  await blocked(page);
  await choose(page, 'budgetCoverageConfirmed', 'yes');
  await choose(page, 'flightsBudget', 'excluded');
  assert.equal((await saved(page)).state.budgetCoverageConfirmed, '');
  await blocked(page);
  await choose(page, 'budgetCoverageConfirmed', 'yes');
  await page.reload();
  await at(page, 'includes');
  await direct(page, 'review');
  const updated = await confirm(page);
  assert.equal((await saved(page)).state.confirmationVersion, 2);
  assert.equal(snapshot(updated).budgetReference.eurUpperCap, 2200);
  assert.equal(snapshot(updated).structuredInput.budgetScope, 'group');
  assert.equal(snapshot(updated).structuredInput.flightsBudget, 'excluded');
  assert.equal(immutable.budgetCurrency, 'USD');
  assert.notEqual(updated, original);
  await fidelity(page, updated);
  await direct(page, 'timing');
  await fill(page, 'monthStart', '2027-05');
  assert.equal((await saved(page)).state.confirmation, null);
  await direct(page, 'review');
  const dated = await confirm(page);
  assert.equal((await saved(page)).state.confirmationVersion, 3);
  assert.equal(snapshot(dated).structuredInput.monthStart, '2027-05');
  await fidelity(page, dated);
}

async function journeyPauses(page, width) {
  const fixture = readyState();
  fixture.interestStatus = 'selected';
  await inject(page, fixture, 'autonomy');
  for (const id of ['autonomy', 'motivations', 'origin', 'needs', 'screening-food']) {
    await direct(page, id);
    assert.equal(await page.locator(`[data-pause="${id}"]`).count(), 1);
    assert.equal(await page.locator('.journey-pause input, .journey-pause textarea, .journey-pause button[type="submit"]').count(), 0);
    assert.equal(await page.locator('.stages li').count(), 6);
    if (id === 'needs') {
      assert.match(await page.locator('.journey-pause').innerText(), /Madrid, Spain|USD 2000 \/ per person/);
      const path = join(artifacts, `journey-sketch-${width}.png`);
      await page.locator('#capture').evaluate(node => Promise.all(node.getAnimations().map(animation => animation.finished)));
      await page.screenshot({ path, fullPage: true });
      screenshots.push(path);
    }
  }
  await direct(page, 'motivations');
  await page.locator('.journey-pause [data-decision="comfort"]').click();
  await at(page, 'comfort');
  assert.equal(await page.locator('.journey-pause').count(), 0);
  assert.match(await submit(page).innerText(), /Save & return to your progress/);
  await choose(page, 'comfort', options.comfort[0]);
  await next(page, 'motivations');
  assert.match(await page.locator('.journey-pause').innerText(), /Comfort and convenience/);
  await direct(page, 'review');
  assert.match(await page.locator('.intro').innerText(), /finished the questions/);
  assert.equal(await page.getByRole('heading', { name: 'What you have described', exact: true }).count(), 1);
  assert.equal(await page.locator('.review-open details').evaluate(node => node.open), false);
  await page.locator('.review-open summary').click();
  assert.ok((await page.locator('.review-open li').count()) > 0);
  await page.locator('[data-edit="1"]').click();
  await page.getByRole('heading', { name: decisions.find(d => d.id === 'autonomy').title, exact: true }).waitFor();
  await layout(page);
  assert.equal(await page.locator('.journey-pause').count(), 0, 'Review edits do not repeat milestones.');
}

async function entryNavigation(page) {
  for (const hash of ['', '#home', '#how-it-works', '#not-a-route', '#entry']) {
    await page.goto(`${base}/${hash}`);
    await page.getByRole('heading', { name: 'What brings you here?', exact: true }).waitFor();
    assert.equal(new URL(page.url()).hash, '#entry');
    assert.equal(await page.locator('.hero, .how, a[href="#home"], a[href="#how-it-works"]').count(), 0);
    await layout(page);
  }
  await page.locator('[data-mode="trip"]').click();
  await at(page, 'presentation');
  const before = await saved(page);
  await page.locator('.skip-link').evaluate(link => link.click());
  assert.equal(new URL(page.url()).hash, '#decision/presentation');
  assert.equal(await page.locator('#main').evaluate(node => node === document.activeElement), true);
  assert.deepEqual(await saved(page), before);
  await page.locator('.site-header > a').click();
  await page.getByRole('heading', { name: 'What brings you here?', exact: true }).waitFor();
  assert.equal(new URL(page.url()).hash, '#entry');
  assert.deepEqual(await saved(page), before);
  await page.locator('#delete-session').click();
  assert.equal(new URL(page.url()).hash, '#entry');
  assert.equal(await saved(page), null);
  await inject(page, readyState());
  await confirm(page);
  await page.getByRole('link', { name: 'Back to starting point', exact: true }).click();
  await page.getByRole('heading', { name: 'What brings you here?', exact: true }).waitFor();
  assert.equal(new URL(page.url()).hash, '#entry');
  assert.ok((await saved(page)).state.confirmedAt);
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
    const install = spawn(process.execPath, [join(dirname(modulePath), 'cli.js'), 'install', 'chromium'], { cwd: artifacts, stdio: 'inherit' });
    const [code] = await once(install, 'exit');
    assert.equal(code, 0, 'Chromium installation failed.');
    browser = await chromium.launch({ headless: true, downloadsPath: artifacts });
  }
  await Promise.all([false, true].map(async mobile => {
    const width = mobile ? 390 : 1440;
    for (const [name, flow] of [
      ['entry navigation without internal home', entryNavigation],
      ['fresh unknown trip UI', (page, width) => freshUI(page, width, 'trip')],
      ['fresh unknown inspiration UI', (page, width) => freshUI(page, width, 'inspiration')],
      ['mandatory review and result redirects', mandatoryRedirects],
      ['generic family and conditional branches', familyAndBranches],
      ['separate allergies and repeated records', repeatedRecords],
      ['fluent interests and priorities', fluentInterests],
      ['legacy documents local and needs retained', legacyLocalOnly],
      ['currency scope and confirmation invalidation', currencyAndConfirmation],
      ['contextual journey pauses and review closure', journeyPauses],
    ]) {
      const prefix = `${mobile ? 'Mobile' : 'Desktop'} ${width}px / ${name}`;
      if (process.env.TEST_FILTER && !prefix.toLowerCase().includes(process.env.TEST_FILTER.toLowerCase())) continue;
      const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 1000 },
        isMobile: mobile, hasTouch: mobile, reducedMotion: 'no-preference',
        permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true });
      const page = await context.newPage();
      page.setDefaultTimeout(7000);
      page.on('dialog', dialog => dialog.accept());
      page.on('pageerror', error => runtimeErrors.push({ context: prefix, error: error.message }));
      page.on('console', message => { if (message.type() === 'error') runtimeErrors.push({ context: prefix, error: message.text() }); });
      page.on('requestfailed', request => {
        if (request.failure()?.errorText !== 'net::ERR_ABORTED') networkErrors.push({ context: prefix, url: request.url(), error: request.failure()?.errorText });
      });
      page.on('response', response => { if (response.status() >= 400) networkErrors.push({ context: prefix, url: response.url(), status: response.status() }); });
      try { await check(prefix, () => flow(page, width)); }
      finally { await context.close(); }
    }
  }));
  await check('No browser runtime or console errors', () => assert.deepEqual(runtimeErrors, []));
  await check('No failed requests or HTTP errors', () => assert.deepEqual(networkErrors, []));
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
console.log(JSON.stringify({ results, runtimeErrors, networkErrors, screenshots }, null, 2));
process.exitCode = failed.length ? 1 : 0;
