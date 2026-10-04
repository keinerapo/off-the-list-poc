import test from 'node:test';
import assert from 'node:assert/strict';
import { decisions, decisionIds, renderDecision } from './canvas.js';

const state = { mode: 'trip', interests: [], sceneOrder: [], motivations: [], transport: [], needs: [], needDetails: {}, budgetIncludes: [], periodMode: 'unknown', budgetMode: 'unknown', budgetScope: '' };

test('each decision has a unique stable identifier and never renders dropdowns', () => {
  assert.equal(new Set(decisions.map(d => d.id)).size, decisions.length);
  for (const decision of decisions) assert.doesNotMatch(decision.render(state), /<select\b/i);
});
test('open inspiration skips practical questions but keeps needs', () => {
  const ids = decisionIds({ ...state, mode: 'inspiration' });
  assert.ok(ids.includes('practical-gate'));
  assert.ok(ids.includes('needs'));
  for (const id of ['origin', 'timing', 'duration', 'travel', 'group', 'budget', 'documentation']) assert.ok(!ids.includes(id));
});
test('dates omit duplicate duration and conditional interests reveal only relevant decisions', () => {
  const ids = decisionIds({ ...state, periodMode: 'dates', interests: ['food','nature'] });
  assert.ok(!ids.includes('duration'));
  assert.ok(ids.includes('food'));
  assert.ok(ids.includes('priority'));
});
test('fresh budget rendering does not declare an amount or scope and does not mutate answers', () => {
  const before = structuredClone(state);
  const html = renderDecision('budget', state);
  assert.doesNotMatch(html, /type="range"|data-budget-band=|data-budget-slider=|<output|<details|name="budget(?:Min|Max|Scope|Flexibility)"/);
  assert.match(html, /name="budgetMode" value="unknown" checked/);
  assert.deepEqual(state, before);
});
test('custom text is escaped in the canvas', () => {
  const html = renderDecision('priority', { ...state, interests: ['food'], otherInterest: '<script>alert(1)</script>' });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('participants render accessible count badges instead of counter buttons', () => {
  const group = { ...state, groupKnown: true, adults: '2', children: '0', childAges: '' };
  const before = structuredClone(group);
  const html = renderDecision('group', group);
  assert.doesNotMatch(html, /data-counter=|aria-label="(?:Increase|Decrease) (?:adults|children)"/);
  for (const [field, counts, selected] of [['adults', [1, 2, 3, 4, 5], 2], ['children', [0, 1, 2, 3, 4, 5], 0]]) {
    assert.match(html, new RegExp(`data-count-panel="${field}"`));
    assert.deepEqual([...html.matchAll(new RegExp(`data-count-field="${field}" data-count="(\\d+)"`, 'g'))].map(match => Number(match[1])), counts);
    for (const count of counts) assert.match(html, new RegExp(`data-count-field="${field}" data-count="${count}" aria-label="${count} ${field}" aria-pressed="${count === selected}"`));
  }
  assert.doesNotMatch(html, /name="childAges"/);
  assert.deepEqual(group, before);
});

test('custom participant counts render exact inputs in open details without clamping or selecting a badge', () => {
  const group = { ...state, groupKnown: true, adults: '8', children: '6', childAges: '6 to 12 years' };
  const before = structuredClone(group);
  const html = renderDecision('group', group);
  for (const [field, count] of [['adults', '8'], ['children', '6']]) {
    assert.match(html, new RegExp(`data-count-panel="${field}"[^]*?<details open><summary>Another number</summary>[^]*?<input name="${field}" type="number" value="${count}"`));
  }
  assert.doesNotMatch(html, /aria-pressed="true"/);
  assert.match(html, /name="childAges"[^>]*value="6 to 12 years"/);
  assert.deepEqual(group, before);
});

test('duration renders every unit preset with independent selected states and no counters', () => {
  for (const [unit, counts] of Object.entries({ hours: [2, 4, 6, 12, 24], days: [1, 3, 5, 7, 10, 14], weeks: [1, 2, 3, 4, 6], months: [1, 2, 3, 6, 12] })) {
    const duration = { ...state, durationMode: 'range', durationUnit: unit, durationMin: String(counts[0]), durationMax: String(counts.at(-1)) };
    const before = structuredClone(duration);
    const html = renderDecision('duration', duration);
    assert.doesNotMatch(html, /data-counter=|aria-label="(?:Increase|Decrease)/);
    for (const [field, selected] of [['durationMin', counts[0]], ['durationMax', counts.at(-1)]]) {
      assert.deepEqual([...html.matchAll(new RegExp(`data-count-field="${field}" data-count="(\\d+)"`, 'g'))].map(match => Number(match[1])), counts);
      for (const count of counts) assert.match(html, new RegExp(`data-count-field="${field}" data-count="${count}" aria-label="${count} ${unit} - (?:minimum|maximum) duration" aria-pressed="${count === selected}"`));
      const exact = html.match(new RegExp(`<input name="${field}"[^>]*>`))[0];
      assert.match(exact, /type="number"/);
      assert.match(exact, /step="any"/);
      assert.doesNotMatch(exact, /\bmax=/);
    }
    assert.deepEqual(duration, before);
  }
});

test('custom duration keeps fractional and beyond-preset quantities in open exact details', () => {
  for (const [unit, value] of [['weeks', '2.5'], ['months', '18']]) {
    const duration = { ...state, durationMode: 'exact', durationUnit: unit, durationMin: value };
    const before = structuredClone(duration);
    const html = renderDecision('duration', duration);
    assert.match(html, new RegExp(`<details open><summary>Another duration</summary>[^]*?<input name="durationMin" type="number" value="${value.replace('.', '\\.')}"`));
    assert.doesNotMatch(html, /aria-pressed="true"|name="durationMax"|data-counter=/);
    assert.deepEqual(duration, before);
  }
  assert.doesNotMatch(renderDecision('duration', { ...state, durationMode: 'unknown' }), /data-count-field=|name="duration(?:Min|Max|Unit)"|<details/);
});

test('declared budget renders pending sliders without assuming amounts or scope', () => {
  for (const mode of ['amount', 'range']) {
    const budget = { ...state, budgetMode: mode, budgetMin: '', budgetMax: '' };
    const before = structuredClone(budget);
    const html = renderDecision('budget', budget);
    for (const [field, id, output, summary] of [['budgetMin', 'budget-slider', 'budget-display', 'Enter an exact amount'], ...(mode === 'range' ? [['budgetMax', 'budget-max-slider', 'budget-max-display', 'Enter an exact upper amount']] : [])]) {
      assert.match(html, new RegExp(`<output id="${output}" for="${id}"[^>]*>Choose your amount</output>`));
      assert.match(html, new RegExp(`<input id="${id}" type="range" min="100" max="20000" step="50" value="100"[^>]*data-budget-slider="${field}"`));
      assert.match(html, new RegExp(`<details><summary>${summary}</summary>[^]*?<input name="${field}" type="number" value=""`));
    }
    if (mode === 'amount') assert.doesNotMatch(html, /budget-max-slider|budget-max-display|name="budgetMax"/);
    assert.doesNotMatch(html, /name="budgetScope"[^>]*checked/);
    assert.deepEqual(budget, before);
  }
});

test('budget rendering preserves crossed ranges and exact caps above the slider maximum', () => {
  for (const [min, max] of [['1800', '1500'], ['900', '27550']]) {
    const budget = { ...state, budgetMode: 'range', budgetMin: min, budgetMax: max, budgetScope: 'person' };
    const before = structuredClone(budget);
    const html = renderDecision('budget', budget);
    for (const [field, value] of [['budgetMin', min], ['budgetMax', max]]) {
      const exact = html.match(new RegExp(`<input name="${field}"[^>]*>`))[0];
      assert.match(exact, new RegExp(`value="${value}"`));
      assert.doesNotMatch(exact, /\bmax=/);
    }
    assert.match(html, new RegExp(`<output id="budget-max-display"[^>]*>USD ${Number(max).toLocaleString('en-US')}</output>`));
    assert.match(html, /<details open><summary>Enter an exact upper amount/);
    assert.deepEqual(budget, before);
  }
});
