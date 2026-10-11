import test from 'node:test';
import assert from 'node:assert/strict';
import { decisions, decisionIds, renderDecision, renderPause } from './canvas.js';
import { options } from './model.js';

const state = { mode: 'trip', interests: [], sceneOrder: [], motivations: [], transport: [], needs: [], needDetails: {}, budgetIncludes: [], periodMode: '', budgetMode: '', budgetScope: '', tripScreening: {} };
const topics = ['food', 'mobility', 'altitude', 'health', 'access', 'pregnancy'];

test('pauses appear only at milestones without new steps, fields or fabricated waits', () => {
  for (const id of ['autonomy', 'motivations', 'origin', 'needs', 'screening-food']) {
    const before = structuredClone(state);
    const html = renderPause(id, state);
    assert.match(html, new RegExp(`data-pause="${id}"`));
    assert.match(html, /aria-labelledby="pause-title"/);
    assert.doesNotMatch(html, /<input|<textarea|type="submit"|analysing|loading|percent/i);
    assert.deepEqual(state, before);
  }
  for (const id of ['interests', 'priority', 'budget', 'screening-health', 'review']) assert.equal(renderPause(id, state), '');
});

test('interest postcard reflects explicit priorities, escapes custom text and leaves unknowns open', () => {
  const answers = { ...state, interestStatus: 'selected', interests: ['food', 'nature'], interestPriority: 'nature', otherInterest: '<script>custom</script>' };
  const html = renderPause('autonomy', answers);
  assert.match(html, /Be_Close_to_Nature.jpeg/);
  assert.match(html, /Your priority/);
  assert.match(html, /&lt;script&gt;custom&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(renderPause('autonomy', { ...answers, interestPriority: 'equal' }), /matter equally/);
  const unknown = renderPause('autonomy', { ...answers, interestStatus: 'unsure' });
  assert.doesNotMatch(unknown, /<img|Taste a Place|Be Close to Nature|custom/);
  assert.match(unknown, /discover what draws you in/);
  const style = renderPause('motivations', { ...answers, autonomy: options.autonomy[2], comfort: 'unknown', memory: 'PRIVATE_MEMORY' });
  assert.match(style, /Mostly freely, deciding as I go/);
  assert.match(style, /Still open/);
  assert.doesNotMatch(style, /PRIVATE_MEMORY/);
});

test('trip sketch preserves dates, quantities, currency, scope and pending coverage', () => {
  const answers = { ...state, originMode: 'known', originCity: 'Madrid', originCountry: 'Spain', periodMode: 'dates', dateStart: '2027-06-01', dateEnd: '2027-06-08', groupKnown: true, adults: '2', children: '1', budgetMode: 'range', budgetMin: '1200', budgetMax: '2400', budgetCurrency: 'GBP', budgetScope: 'person', flightsBudget: 'pending', budgetIncludes: ['Food'] };
  const html = renderPause('needs', answers);
  assert.match(html, /Madrid, Spain/);
  assert.match(html, /2027-06-01 to 2027-06-08/);
  assert.match(html, /3 travellers/);
  assert.match(html, /GBP 1200 to 2400 \/ per person/);
  assert.doesNotMatch(html, /data-decision="duration"|>Food</);
  assert.match(renderPause('needs', { ...answers, budgetCoverageConfirmed: 'yes' }), />Food</);
  const unknown = renderPause('needs', { ...answers, originMode: 'unknown', periodMode: 'unknown', groupKnown: false, budgetMode: 'unknown' });
  assert.doesNotMatch(unknown, /Madrid|2027-06|3 travellers|GBP|data-decision="includes"/);
  assert.match(renderPause('needs', { ...answers, periodMode: 'months', monthStart: '2027-06', monthEnd: '2027-07', durationMode: 'range', durationMin: '1.5', durationMax: '2', durationUnit: 'weeks' }), /1.5 to 2 weeks/);
});

test('pause guardrails reflect storage availability and retain needs without exposing their text', () => {
  assert.match(renderPause('origin', state, true), /saved in this browser for 7 days/);
  assert.doesNotMatch(renderPause('origin', state, false), /saved in this browser/);
  assert.match(renderPause('origin', state, false), /keep this page open/);
  const html = renderPause('screening-food', { ...state, essentialNeeds: [{ text: 'PRIVATE_REQUIREMENT' }], needs: ['food'], needDetails: { food: { text: 'PRIVATE_NOTE' } } });
  assert.match(html, /six topics/);
  assert.match(html, /Prefer not to share/);
  assert.match(html, /2 saved needs retained/);
  assert.doesNotMatch(html, /PRIVATE_REQUIREMENT|PRIVATE_NOTE/);
});

test('decisions have stable unique identifiers, chronological stages and no dropdowns or skip controls', () => {
  assert.equal(new Set(decisions.map(decision => decision.id)).size, decisions.length);
  assert.deepEqual(decisions.map(decision => decision.stage), decisions.map(decision => decision.stage).sort());
  for (const decision of decisions) {
    const before = structuredClone(state);
    assert.doesNotMatch(decision.render(state), /<select\b|Skip for now|\bskip\b|\bdraft\b|before finalis|data-record="traveller"/i);
    assert.deepEqual(state, before);
  }
  for (const id of ['practical-gate', 'solo-safety', 'documentation', 'free-text-review']) {
    assert.ok(!decisions.some(decision => decision.id === id));
    assert.equal(renderDecision(id, state), '');
  }
});

test('both modes ask the same practical and screening questions even with a saved open gate', () => {
  const trip = decisionIds(state);
  assert.deepEqual(decisionIds({ ...state, mode: 'inspiration', contextChoice: 'open' }), trip);
  for (const id of ['origin', 'timing', 'duration', 'travel', 'group', 'budget', 'needs', ...topics.map(type => `screening-${type}`)]) assert.ok(trip.includes(id));
});

test('dates avoid duplicate duration and interests reveal only relevant follow-ups', () => {
  const ids = decisionIds({ ...state, periodMode: 'dates', interests: ['food', 'nature'] });
  assert.ok(!ids.includes('duration'));
  assert.ok(ids.includes('food'));
  assert.ok(ids.includes('priority'));
  assert.ok(!decisionIds(state).includes('priority'));
});

test('unknown is an explicit answer rather than an omission or a default', () => {
  for (const [id, key] of [['priority', 'interestPriority'], ['autonomy', 'autonomy'], ['comfort', 'comfort'], ['best-trips', 'bestTripsStatus'], ['personal-statement', 'personalStatementStatus'], ['off-path', 'offPathComfort'], ['accommodation', 'accommodationPreference'], ['food', 'food'], ['origin', 'originMode'], ['timing', 'periodMode'], ['duration', 'durationMode'], ['travel', 'travelLimitMode'], ['occasion', 'occasionStatus'], ['exclusions', 'exclusionsStatus'], ['physical-intensity', 'physicalIntensity']]) {
    const answers = { ...state, interests: ['food', 'nature'] };
    const blank = renderDecision(id, answers);
    assert.match(blank, new RegExp(`name="${key}" value="unknown"`));
    assert.match(blank, /I don&#39;t know yet/);
    assert.doesNotMatch(blank, /\bchecked\b/);
    assert.match(renderDecision(id, { ...answers, [key]: 'unknown' }), new RegExp(`name="${key}" value="unknown" checked`));
  }
  const interests = renderDecision('interests', state);
  assert.match(interests, /name="interestStatus" value="unsure"/);
  assert.doesNotMatch(interests, /value="skipped"|checked/);
  assert.match(renderDecision('pace', state), /I don&#39;t know yet/);
});

test('context-dependent style details appear only for their explicit answer', () => {
  assert.match(renderDecision('autonomy', { ...state, autonomy: options.autonomy[3] }), /name="autonomyDetails"/);
  assert.match(renderDecision('comfort', { ...state, comfort: options.comfort[3] }), /name="comfortMinimums"/);
  assert.doesNotMatch(renderDecision('autonomy', { ...state, autonomy: 'unknown' }), /name="autonomyDetails"/);
  assert.doesNotMatch(renderDecision('personal-statement', state), /<textarea/);
  assert.doesNotMatch(renderDecision('personal-statement', { ...state, personalStatementStatus: 'unknown' }), /<textarea/);
  assert.match(renderDecision('personal-statement', { ...state, personalStatementStatus: 'written', personalStatement: '<quiet>' }), /name="personalStatement"[^]*&lt;quiet&gt;/);
});

test('custom interests and record controls escape text without mutating answers', () => {
  const answers = { ...state, interests: ['food'], otherInterest: '<script>alert(1)</script>' };
  const before = structuredClone(answers);
  const html = renderDecision('priority', answers);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /name="interestPriority" value="equal"/);
  assert.deepEqual(answers, before);
});

test('group counts use accessible badges, explicit zero and blank defaults', () => {
  const blank = renderDecision('group', { ...state, groupKnown: true });
  assert.doesNotMatch(blank, /aria-pressed="true"|name="groupType"[^>]*checked/);
  const answers = { ...state, groupKnown: true, adults: '2', children: '0' };
  const before = structuredClone(answers);
  const html = renderDecision('group', answers);
  assert.doesNotMatch(html, /data-counter=|data-record="traveller"|name="groupChecked"|name="youngChildrenStatus"/);
  for (const [key, selected] of [['adults', 2], ['children', 0]]) {
    assert.match(html, new RegExp(`data-count-panel="${key}"`));
    assert.deepEqual([...html.matchAll(new RegExp(`data-count-field="${key}" data-count="(\\d+)"`, 'g'))].map(match => Number(match[1])), [0, 1, 2, 3, 4, 5]);
    for (let count = 0; count <= 5; count++) assert.match(html, new RegExp(`data-count-field="${key}" data-count="${count}" aria-label="${count} ${key}" aria-pressed="${count === selected}"`));
  }
  assert.deepEqual(answers, before);
  assert.match(renderDecision('group', { ...state, groupKnown: false }), /name="groupKnown" value="no" checked[^]*I don&#39;t know yet/);
  assert.doesNotMatch(renderDecision('group', state), /checked|data-count-field=/);
});

test('custom group counts remain exact and child information is generic and optional', () => {
  const answers = { ...state, groupKnown: true, adults: '8', children: '6', childAges: '6 to 12 years', travellers: [{ id: 'child-1', kind: 'child', ageYears: '4' }] };
  const before = structuredClone(answers);
  const html = renderDecision('group', answers);
  for (const [key, count] of [['adults', '8'], ['children', '6']]) assert.match(html, new RegExp(`data-count-panel="${key}"[^]*?<details open><summary>Another number</summary>[^]*?<input name="${key}" type="number" value="${count}"`));
  assert.doesNotMatch(html, /aria-pressed="true"|ageYears|ageMonths|child-1|groupChecked/);
  assert.match(html, /<details open><summary>Children age range \(optional\)<\/summary>[^]*name="childAges"[^>]*value="6 to 12 years"/);
  for (const value of ['yes', 'no', 'unknown']) assert.match(html, new RegExp(`name="youngChildrenStatus" value="${value}"`));
  assert.doesNotMatch(html, /name="youngChildrenRoutine"/);
  const young = renderDecision('group', { ...answers, adults: '0', youngChildrenStatus: 'yes' });
  assert.match(young, /Young children routines \(optional\)[^]*name="youngChildrenRoutine"/);
  assert.match(young, /Supervision arrangements \(optional\)[^]*name="supervision"/);
  assert.deepEqual(answers, before);
});

test('all duration presets retain independent selections and exact fractional values', () => {
  for (const [unit, counts] of Object.entries({ hours: [2, 4, 6, 12, 24], days: [1, 3, 5, 7, 10, 14], weeks: [1, 2, 3, 4, 6], months: [1, 2, 3, 6, 12] })) {
    const answers = { ...state, durationMode: 'range', durationUnit: unit, durationMin: String(counts[0]), durationMax: String(counts.at(-1)) };
    const before = structuredClone(answers);
    const html = renderDecision('duration', answers);
    for (const [key, selected] of [['durationMin', counts[0]], ['durationMax', counts.at(-1)]]) {
      assert.deepEqual([...html.matchAll(new RegExp(`data-count-field="${key}" data-count="(\\d+)"`, 'g'))].map(match => Number(match[1])), counts);
      for (const count of counts) assert.match(html, new RegExp(`data-count-field="${key}" data-count="${count}" aria-label="${count} ${unit} - (?:minimum|maximum) duration" aria-pressed="${count === selected}"`));
      const exact = html.match(new RegExp(`<input name="${key}"[^>]*>`))[0];
      assert.match(exact, /type="number"[^>]*step="any"/);
      assert.doesNotMatch(exact, /\bmax=/);
    }
    assert.doesNotMatch(html, /data-counter=/);
    assert.deepEqual(answers, before);
  }
  for (const [unit, value] of [['weeks', '2.5'], ['months', '18']]) {
    const html = renderDecision('duration', { ...state, durationMode: 'exact', durationUnit: unit, durationMin: value });
    assert.match(html, /<details open><summary>Another duration/);
    assert.ok(html.includes(`name="durationMin" type="number" value="${value}"`));
    assert.doesNotMatch(html, /aria-pressed="true"|name="durationMax"/);
  }
  assert.doesNotMatch(renderDecision('duration', { ...state, durationMode: 'unknown' }), /data-count-field=|name="duration(?:Min|Max|Unit)"|<details/);
});

test('budget stays conditional with no assumed amount, currency or scope', () => {
  const blank = renderDecision('budget', state);
  assert.doesNotMatch(blank, /checked|type="range"|name="budget(?:Min|Max|Currency|Scope)"/);
  for (const mode of ['amount', 'range']) {
    const answers = { ...state, budgetMode: mode, budgetMin: '', budgetMax: '' };
    const before = structuredClone(answers);
    const html = renderDecision('budget', answers);
    for (const [key, id, output] of [['budgetMin', 'budget-slider', 'budget-display'], ...(mode === 'range' ? [['budgetMax', 'budget-max-slider', 'budget-max-display']] : [])]) {
      assert.match(html, new RegExp(`<output id="${output}" for="${id}"[^>]*>Choose your amount</output>`));
      assert.match(html, new RegExp(`<input id="${id}" type="range" min="100" max="20000" step="50" value="100"[^>]*data-budget-slider="${key}"`));
      assert.match(html, new RegExp(`<input name="${key}" type="number" value=""`));
    }
    for (const key of ['budgetCurrency', 'budgetScope']) {
      assert.match(html, new RegExp(`name="${key}" value="unknown"`));
      assert.doesNotMatch(html, new RegExp(`name="${key}"[^>]*checked`));
    }
    assert.deepEqual(answers, before);
  }
});

test('crossed budget ranges and exact values beyond sliders remain unchanged', () => {
  for (const [min, max] of [['1800', '1500'], ['900', '27550']]) {
    const answers = { ...state, budgetMode: 'range', budgetMin: min, budgetMax: max, budgetScope: 'person', budgetCurrency: 'USD' };
    const before = structuredClone(answers);
    const html = renderDecision('budget', answers);
    for (const [key, value] of [['budgetMin', min], ['budgetMax', max]]) {
      const exact = html.match(new RegExp(`<input name="${key}"[^>]*>`))[0];
      assert.ok(exact.includes(`value="${value}"`));
      assert.doesNotMatch(exact, /\bmax=/);
    }
    assert.ok(html.includes(`USD ${Number(max).toLocaleString('en-US')}</output>`));
    assert.match(html, /<details open><summary>Enter an exact upper amount/);
    assert.deepEqual(answers, before);
  }
});

test('budget margin and conversion remain optional, unknown flights preserve required coverage confirmation', () => {
  for (const currency of ['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'unknown', '']) {
    const html = renderDecision('budget', { ...state, budgetMode: 'amount', budgetMin: '3500', budgetCurrency: currency, budgetMarginAmount: '100', eurConversion: { rate: '0.9', source: 'Source', date: '2026-10-10' } });
    assert.ok(html.includes(`${currency && currency !== 'unknown' ? currency : 'currency unknown'} 3,500</output>`));
    assert.match(html, /Budget flexibility \(optional\)[^]*name="budgetMarginAmount"[^>]*min="0" max="9007199254740991"/);
    assert.equal(html.includes('data-record="conversion"'), Boolean(currency && !['EUR', 'unknown'].includes(currency)));
  }
  const html = renderDecision('includes', { ...state, budgetMode: 'amount', flightsBudget: 'pending', budgetCoverageConfirmed: 'yes' });
  assert.match(html, /name="flightsBudget" value="pending" checked/);
  assert.match(html, /name="budgetCoverageConfirmed" value="yes" checked/);
  assert.doesNotMatch(html, /name="budgetCoverageConfirmed" value="unknown"/);
  assert.ok(!decisionIds({ ...state, budgetMode: 'unknown' }).includes('includes'));
});

test('six compact screenings ask once for the group, with no roster or defaults', () => {
  for (const type of topics) {
    for (const travellers of [[], [{ id: 'traveller-1', kind: 'adult', screening: { [type]: 'yes' } }, { id: 'traveller-2', kind: 'child' }]]) {
      const answers = { ...state, travellers };
      const before = structuredClone(answers);
      const html = renderDecision(`screening-${type}`, answers);
      assert.equal([...html.matchAll(/<fieldset>/g)].length, 1);
      for (const value of ['yes', 'no', 'unknown', 'private']) assert.match(html, new RegExp(`name="screening-${type}" value="${value}"[^>]*data-screening="${type}"`));
      assert.doesNotMatch(html, /checked|traveller-\d|data-record="traveller"|data-add-record=/);
      assert.deepEqual(answers, before);
    }
    for (const value of ['yes', 'no', 'unknown', 'private']) {
      const html = renderDecision(`screening-${type}`, { ...state, tripScreening: { [type]: value } });
      assert.match(html, new RegExp(`name="screening-${type}" value="${value}" checked`));
      assert.equal(html.includes('data-add-record="essential-need"'), value === 'yes');
    }
  }
});

test('essential records persist for every screening answer and only ask practical text', () => {
  for (const answer of ['', 'yes', 'no', 'unknown', 'private']) {
    const answers = { ...state, tripScreening: { food: answer }, essentialNeeds: [{ id: 'need-1', type: 'food', text: '<Peanuts>', affected: 'One companion', participants: ['old-id'], crossContact: 'Separate utensils', severity: 'Known warning', medicalAccess: 'Nearby care', reviewStatus: 'pending' }, { id: 'need-2', type: 'food', text: 'Milk' }, { id: 'need-3', type: 'mobility', text: 'No steps' }] };
    const before = structuredClone(answers);
    const html = renderDecision('screening-food', answers);
    for (const id of ['need-1', 'need-2']) {
      assert.match(html, new RegExp(`data-record-panel="${id}"`));
      assert.match(html, new RegExp(`data-record="essential-need" data-record-id="${id}" data-record-field="text"`));
      assert.match(html, new RegExp(`data-remove-record="essential-need" data-record-id="${id}"`));
    }
    assert.match(html, /&lt;Peanuts&gt;/);
    assert.match(html, /Who is affected\? \(optional\)[^]*data-record-field="affected"/);
    assert.match(html, /Additional practical details \(optional\)[^]*data-record-field="crossContact"[^]*data-record-field="severity"[^]*data-record-field="medicalAccess"/);
    assert.doesNotMatch(html, /need-3|old-id|data-record-field="(?:participants|reviewStatus|requirementKind|strength|margin)"|\brequired\b|value="flexible"/);
    assert.deepEqual(answers, before);
  }
});

test('transport and challenge unknown choices carry the exclusive selection protocol', () => {
  for (const [id, key] of [['travel', 'transport'], ['challenge', 'challengePreferences']]) {
    const html = renderDecision(id, { ...state, [key]: ['unknown'] });
    assert.match(html, new RegExp(`type="checkbox" name="${key}" value="unknown" checked data-exclusive="true"`));
  }
  assert.match(renderDecision('challenge', state), /value="none" data-exclusive="true"/);
  assert.match(renderDecision('motivations', state), /data-exclusive="true"/);
  assert.match(renderDecision('travel', { ...state, transport: ['Driving myself'] }), /name="drivingStatus" value="unknown"/);
  assert.doesNotMatch(renderDecision('travel', state), /name="drivingStatus"/);
  assert.match(renderDecision('timing', { ...state, periodMode: 'dates' }), /Starting-point time zone \(optional\)[^]*name="timeZone"/);
});

test('origin mode controls city and country entry without inferred answers', () => {
  for (const originMode of ['', 'unknown']) assert.doesNotMatch(renderDecision('origin', { ...state, originMode }), /name="originSearch"/);
  const html = renderDecision('origin', { ...state, originMode: 'known', originCity: '<City>', originCountry: 'Country' });
  assert.match(html, /name="originSearch"[^>]*value="&lt;City&gt;, Country"/);
  assert.match(html, /explicit comma/);
});

test('travel history accepts uncertainty and partial lists without mandatory acknowledgment', () => {
  const blank = renderDecision('history', state);
  for (const key of ['travelExperience', 'historyStatus']) assert.match(blank, new RegExp(`name="${key}" value="unknown"`));
  assert.doesNotMatch(blank, /name="history(?:Scope|Completeness|PolicyAcknowledged)"/);
  const html = renderDecision('history', { ...state, historyStatus: 'visited', history: 'Paris, France', historyCompleteness: 'partial' });
  assert.match(html, /name="history"[^]*Paris, France/);
  for (const value of ['complete', 'partial', 'unknown']) assert.match(html, new RegExp(`name="historyCompleteness" value="${value}"`));
  assert.match(html, /Scope of this list \(optional\)/);
  assert.doesNotMatch(html, /historyPolicyAcknowledged|needs completing|name="novelty"/);
  assert.match(html, /territories of a visited sovereign state/);
});

test('best trips retain escaped stable records and no-trip aspiration is optional', () => {
  const answers = { ...state, bestTripsStatus: 'yes', bestTrips: [{ id: 'trip-1', place: '<Coast>', moment: 'Quiet', reason: 'Time together' }] };
  const before = structuredClone(answers);
  const html = renderDecision('best-trips', answers);
  for (const key of ['place', 'moment', 'reason']) assert.match(html, new RegExp(`data-record="best-trip" data-record-id="trip-1" data-record-field="${key}"`));
  assert.match(html, /&lt;Coast&gt;/);
  assert.match(html, /data-add-record="best-trip"/);
  assert.deepEqual(answers, before);
  const no = renderDecision('best-trips', { ...answers, bestTripsStatus: 'no' });
  assert.match(no, /data-record-panel="trip-1"/);
  assert.match(no, /A hope for your first trip \(optional\)[^]*name="firstTripAspiration"/);
  assert.doesNotMatch(no, /before finalis|conflicting/);
});

test('occasion and exclusions use generic optional details without clarification controls', () => {
  assert.doesNotMatch(renderDecision('occasion', state), /name="occasionType"|name="occasionDate"/);
  const occasion = renderDecision('occasion', { ...state, occasionStatus: 'yes' });
  assert.match(occasion, /name="occasionType" value="unknown"/);
  assert.match(occasion, /Occasion details \(optional\)[^]*name="occasionWishes"/);
  const answers = { ...state, exclusionsStatus: 'unknown', exclusions: [{ id: 'exclusion-1', text: '<animals>', strength: 'firm', scope: 'All riding', affected: 'Whole group', participants: ['old-id'], clarification: 'pending' }] };
  const before = structuredClone(answers);
  const html = renderDecision('exclusions', answers);
  assert.match(html, /&lt;animals&gt;/);
  for (const key of ['text', 'strength', 'scope', 'affected']) assert.match(html, new RegExp(`data-record="exclusion" data-record-id="exclusion-1" data-record-field="${key}"`));
  for (const value of ['firm', 'prefer']) assert.match(html, new RegExp(`name="exclusion-1-strength" value="${value}"`));
  assert.match(html, /Scope and affected people \(optional\)/);
  assert.doesNotMatch(html, /data-record-field="(?:participants|clarification)"|old-id/);
  assert.deepEqual(answers, before);
});

test('saved practical notes remain local without transfers or flexible essential requirements', () => {
  for (const essential of [false, true]) {
    const answers = { ...state, needs: ['mobility'], needDetails: { mobility: { text: 'No steps', type: 'flexible', essential, scope: 'participant', affected: 'One companion', participants: ['old-id'], margin: 'Small steps' } } };
    const before = structuredClone(answers);
    const html = renderDecision('needs', answers);
    assert.match(html, /data-need="mobility" data-detail="text"[^]*No steps/);
    assert.match(html, /Specific companion needs/);
    assert.match(html, /data-detail="affected" value="One companion"/);
    assert.doesNotMatch(html, /data-transfer-need|transferTarget|data-detail="participants"|old-id|paste the same|required before/);
    assert.equal(html.includes('value="flexible"'), !essential);
    assert.equal(html.includes('data-detail="margin"'), !essential);
    assert.deepEqual(answers, before);
  }
});

test('motivation priorities offer equal and unknown as explicit answers', () => {
  for (const motivationPriority of ['equal', 'unknown']) {
    const html = renderDecision('motivations', { ...state, motivations: [options.motivations[0], options.motivations[5]], motivationPriority });
    assert.match(html, new RegExp(`name="motivationPriority" value="${motivationPriority}" checked`));
    assert.doesNotMatch(html, /name="motivationPriority" value=""/);
  }
});
