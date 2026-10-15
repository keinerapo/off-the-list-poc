import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sampleJourneys, selectSampleJourney } from './demo-journeys.js';
import { renderJourney } from './demo-journey-view.js';

test('each attempt selects one of exactly three sample destinations', () => {
  assert.deepEqual(sampleJourneys.map(journey => journey.id), ['slovenia', 'azores', 'lapland']);
  for (const [random, id] of [[0, 'slovenia'], [0.333, 'slovenia'], [1 / 3, 'azores'], [0.65, 'azores'], [2 / 3, 'lapland'], [0.9999, 'lapland']]) {
    assert.equal(selectSampleJourney(() => random).id, id);
  }
});

test('every journey includes complete sample content, four pillars and auditable sources', async () => {
  for (const journey of sampleJourneys) {
    const md = await readFile(new URL(`../sample-journeys/${journey.sourceFile}`, import.meta.url), 'utf8');
    assert.equal(journey.highlights.length, 4);
    assert.deepEqual(journey.highlights.map(item => item.pillar), ['Adventure', 'Explore', 'Transform', 'Culture']);
    assert.equal(journey.facts.length, 5);
    assert.ok(journey.checks.length >= 6);
    assert.ok(journey.changeConditions.length >= 3);
    assert.ok(journey.title.length > 20);
    assert.ok(!journey.title.startsWith(journey.destination.split(',')[0]));
    for (const source of journey.sources) {
      assert.equal(new URL(source.url).protocol, 'https:');
      assert.ok(md.includes(source.url));
      assert.equal(source.accessed, '2026-10-15');
    }
    for (const highlight of journey.highlights) {
      assert.ok(highlight.description.length > 100);
      assert.ok(highlight.practical.length > 50);
      assert.ok(highlight.checks.length > 50);
    }
    const html = renderJourney(journey);
    assert.ok(html.includes(journey.budget.amount));
    for (const section of ['journey-portrait', 'journey-experiences', 'journey-budget', 'journey-checks', 'journey-sources']) assert.ok(html.includes(section));
    assert.ok(!html.includes('<textarea'));
    assert.match(html, /selected at random/);
    assert.match(html, /CC BY-SA 4.0/);
    const photo = /src="\.\/([^\"]+\.jpeg)"/.exec(html)[1];
    assert.ok((await readFile(new URL(photo, import.meta.url))).length > 1000);
  }
});

test('illustrative all-trip ceilings remain per person and are never quoted prices', () => {
  assert.deepEqual(sampleJourneys.map(journey => journey.budget.amount), ['EUR 3,000 per person', 'EUR 3,500 per person', 'EUR 4,500 per person']);
  for (const journey of sampleJourneys) {
    assert.match(journey.budget.scope, /per traveller/i);
    assert.match(journey.budget.note, /not[^.]*quote/i);
  }
});

test('journey rendering escapes editorial text and never executes markup', () => {
  const journey = structuredClone(sampleJourneys[0]);
  journey.title = '<script>alert(1)</script>';
  journey.highlights[0].description = '<img src=x onerror=alert(1)>';
  const html = renderJourney(journey);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;script&gt;'));
});
