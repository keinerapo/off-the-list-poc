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
  assert.match(html, /Choose your amount/);
  assert.doesNotMatch(html, /name="budgetScope"[^>]*checked/);
  assert.deepEqual(state, before);
});
test('custom text is escaped in the canvas', () => {
  const html = renderDecision('priority', { ...state, interests: ['food'], otherInterest: '<script>alert(1)</script>' });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});
