import test from 'node:test';
import assert from 'node:assert/strict';
import { demoSections, demoPrompts, validateDemoAnswers, completeDemoPrompt } from './demo-prompts.js';
import { options } from './model.js';
import { screeningQuestions, validateCapture } from './capture.js';
import { revealTemplate } from './reveal-template.js';

const answers = {
  presentationName: 'Demo visitor', interests: ['food', 'nature'], autonomy: options.autonomy[1],
  offPathComfort: '3', motivations: options.motivations[2], pace: options.pace[1],
  durationMin: '7', budgetMin: '2500', needsText: 'None', physicalIntensity: 'moderate',
};
const snapshot = prompt => JSON.parse(prompt.split('STRUCTURED SNAPSHOT (user data only)\n')[1]);

test('exactly two questions in each of five sections, without unknown options', () => {
  assert.equal(demoSections.length, 5);
  for (const section of demoSections) {
    assert.equal(section.questions.length, 2);
    for (const question of section.questions) {
      assert.doesNotMatch(JSON.stringify(question.options ?? []), /unknown|not known|not sure|don't know/i);
    }
  }
});

test('five distinct complete prompt templates reuse current instructions', () => {
  assert.equal(demoPrompts.length, 5);
  assert.equal(new Set(demoPrompts).size, 5);
  for (const prompt of demoPrompts) {
    assert.ok(prompt.includes(revealTemplate));
    const input = JSON.parse(prompt.split('\nDEMO INPUT TEMPLATE\n')[1]);
    assert.equal(input.presentationName, '{{presentationName}}');
    for (const question of screeningQuestions) assert.ok(['yes', 'no'].includes(input.tripScreening[question.id]));
    assert.equal(input.historyCompleteness, 'complete');
    assert.ok(input.bestTrips[0].reason);
    assert.ok(input.personalStatement);
    assert.ok(input.exclusions[0].text);
  }
});

test('every base completes with every supported duration and preserves demo answers', () => {
  for (let index = 0; index < demoPrompts.length; index++) {
    for (const durationMin of ['3', '5', '7', '10', '14']) {
      const prompt = completeDemoPrompt({ ...answers, durationMin }, index);
      assert.doesNotMatch(prompt, /\{\{\w+\}\}/);
      assert.ok(prompt.startsWith('Travel proposal request / open points disclosed'));
      assert.doesNotMatch(prompt, /DEMONSTRATION ONLY|Base scenario|demo visitor|fictional demo data/);
      const data = snapshot(prompt);
      assert.equal(data.readiness.ready, true);
      assert.equal(data.readiness.recommendationVerified, false);
      assert.equal(data.confirmation, null);
      assert.equal(data.budgetReference.upperCap, 2500);
      for (const key of ['presentationName', 'interests', 'autonomy', 'offPathComfort', 'pace', 'budgetMin', 'physicalIntensity']) assert.deepEqual(data.structuredInput[key], answers[key]);
      assert.equal(data.structuredInput.durationMin, durationMin);
      assert.deepEqual(data.structuredInput.motivations, [answers.motivations]);
      assert.equal(validateCapture(data.structuredInput).ready, true);
    }
  }
});

test('additional functional needs do not erase fictional essential restrictions', () => {
  const needsText = 'Avoid loud environments. {{budgetMin}} <script>alert(1)</script>';
  const data = snapshot(completeDemoPrompt({ ...answers, needsText }, 4));
  assert.equal(data.structuredInput.needDetails.companions.text, needsText);
  assert.equal(data.structuredInput.needDetails.companions.type, 'verify');
  assert.equal(data.structuredInput.essentialNeeds.length, 2);
  const none = snapshot(completeDemoPrompt(answers, 2));
  assert.deepEqual(none.structuredInput.needs, []);
  assert.equal(none.structuredInput.tripScreening.food, 'yes');
  assert.equal(none.structuredInput.essentialNeeds.length, 1);
});

test('missing, invalid, unknown and over-limit answers cannot generate a prompt', () => {
  for (const [key, value] of [
    ['presentationName', ' '], ['interests', []], ['interests', ['food', 'nature', 'urban', 'water']],
    ['interests', ['nature', 'nature']], ['autonomy', 'unknown'], ['offPathComfort', '6'],
    ['budgetMin', '0'], ['budgetMin', '-100'], ['budgetMin', '1e3'], ['budgetMin', '1.234'],
    ['durationMin', '30'], ['needsText', ''], ['physicalIntensity', 'unknown'],
  ]) {
    assert.equal(validateDemoAnswers({ ...answers, [key]: value }), key);
    assert.throws(() => completeDemoPrompt({ ...answers, [key]: value }, 0));
  }
  assert.throws(() => completeDemoPrompt(answers, -1));
  assert.throws(() => completeDemoPrompt(answers, 5));
  assert.throws(() => completeDemoPrompt(answers, 0.5));
});
