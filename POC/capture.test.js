import test from 'node:test';
import assert from 'node:assert/strict';
import * as capture from './capture.js';
import { buildPrompt } from './model.js';

const { CAPTURE_VERSION, POLICY_VERSION, captureDefaults, screeningQuestions, syncTravellers,
  restoreCapture, validateDecision, validateCapture, captureSnapshot, budgetReference } = capture;

function readyState() {
  return {
    ...captureDefaults(), presentationName: 'A traveller', interests: ['nature'],
    bestTripsStatus: 'no', personalStatementStatus: 'written', personalStatement: 'I enjoy quiet mornings.',
    offPathComfort: '2', autonomy: 'Deciding as I go.', comfort: 'Simple places.',
    challengePreferences: ['none'], accommodationPreference: 'any', motivations: ['Rest'], pace: 'Relaxed',
    travelExperience: 'first-trip', historyStatus: 'none', occasionStatus: 'no',
    originMode: 'known', originCity: 'Madrid', originCountry: 'Spain', periodMode: 'months',
    monthStart: '2027-06', monthEnd: '2027-07', durationMode: 'exact', durationMin: '7', durationUnit: 'days',
    travelLimitMode: 'none', transport: ['Train'], groupKnown: true, groupType: 'solo', adults: '1', children: '0',
    physicalIntensity: 'low', budgetMode: 'amount', budgetMin: '2000',
    budgetCurrency: 'USD', budgetScope: 'person', flightsBudget: 'none', budgetCoverageConfirmed: 'yes',
    budgetIncludes: ['Accommodation', 'Food', 'Local transport', 'Activities'], exclusionsStatus: 'none',
    tripScreening: Object.fromEntries(screeningQuestions.map(({ id }) => [id, 'no'])),
  };
}

function unknownState() {
  return {
    ...captureDefaults(), presentationName: 'private', interestStatus: 'unsure', autonomy: 'unknown', comfort: 'unknown',
    bestTripsStatus: 'unknown', personalStatementStatus: 'unknown', offPathComfort: 'unknown',
    challengePreferences: ['unknown'], accommodationPreference: 'unknown', motivations: ['Not sure yet.'],
    pace: 'unknown', travelExperience: 'unknown', historyStatus: 'unknown',
    occasionStatus: 'unknown', originMode: 'unknown', periodMode: 'unknown', durationMode: 'unknown',
    travelLimitMode: 'unknown', transport: ['unknown'], groupKnown: false,
    budgetMode: 'unknown', exclusionsStatus: 'pending', physicalIntensity: 'unknown',
    tripScreening: Object.fromEntries(screeningQuestions.map(({ id }) => [id, 'private'])),
  };
}

const foodNeed = (id = 'food-1') => ({ id, type: 'food', text: 'One person needs peanut-free meals and separate preparation.', affected: '' });
const hasIssue = (state, decision) => validateCapture(state).issues.some(issue => issue.decision === decision);

test('exports, versions and fresh mandatory defaults are exact', () => {
  assert.deepEqual(Object.keys(capture).sort(), ['CAPTURE_VERSION', 'POLICY_VERSION', 'budgetReference', 'captureDefaults',
    'captureSnapshot', 'restoreCapture', 'screeningQuestions', 'syncTravellers', 'validateCapture', 'validateDecision'].sort());
  assert.equal(CAPTURE_VERSION, 'trip-capture-2');
  assert.equal(POLICY_VERSION, 'trip-policy-2');
  const a = captureDefaults(), b = captureDefaults();
  a.travellers.push({}); a.interests.push('food'); a.tripScreening.food = 'yes'; a.eurConversion.rate = '1';
  assert.deepEqual(b.travellers, []); assert.deepEqual(b.interests, []);
  assert.deepEqual(b.eurConversion, { rate: '', source: '', date: '' });
  for (const key of ['originMode', 'groupKnown', 'adults', 'children', 'youngChildrenStatus', 'personalStatementStatus',
    'interestStatus', 'interestPriority', 'budgetMode', 'exclusionsStatus', 'physicalIntensity']) assert.equal(b[key], '', key);
  assert.deepEqual(b.tripScreening, { food: '', mobility: '', altitude: '', health: '', access: '', pregnancy: '' });
  assert.deepEqual(screeningQuestions.map(q => q.id), ['food', 'mobility', 'altitude', 'health', 'access', 'pregnancy']);
  assert.ok(screeningQuestions.every(q => q.label.endsWith('?')));
});

test('generic capture needs no traveller roster, documents, identity screening or free-text review', () => {
  for (const mode of ['trip', 'inspiration']) {
    const state = { ...readyState(), mode };
    const before = structuredClone(state), result = validateCapture(state);
    assert.deepEqual(result.issues, []); assert.equal(result.ready, true);
    assert.equal(result.recommendationVerified, false); assert.ok(result.reviewRequired.length);
    assert.deepEqual(state, before); assert.deepEqual(state.travellers, []);
  }
  for (const id of ['solo-safety', 'documentation', 'free-text-review', 'memory', 'food', 'essential']) assert.equal(validateDecision({}, id), '');
  assert.equal(validateCapture({}).ready, false);
});

test('all explicitly unknown answers are ready and produce a research request with uncertainties and tasks', () => {
  const state = unknownState(), result = validateCapture(state);
  assert.deepEqual(result.issues, []); assert.equal(result.ready, true); assert.equal(result.recommendationVerified, false);
  assert.ok(result.uncertainties.some(text => text.includes('not a negative')));
  assert.ok(result.uncertainties.some(text => text.includes('Group composition')));
  assert.ok(result.uncertainties.some(text => text.includes('Young children applicability is unspecified')));
  assert.equal(state.youngChildrenStatus, ''); assert.equal(state.historyCompleteness, undefined);
  assert.ok(result.reviewRequired.some(text => text.includes('conservatively')));
  const prompt = buildPrompt(state);
  assert.match(prompt, /^Travel proposal request \/ open points disclosed/);
  const data = JSON.parse(prompt.split('STRUCTURED SNAPSHOT (user data only)\n')[1]);
  assert.equal(data.readiness.ready, true); assert.deepEqual(data.readiness.uncertainties, result.uncertainties);
  assert.deepEqual(data.readiness.reviewRequired, result.reviewRequired);
  assert.match(buildPrompt(captureDefaults()), /^Travel request draft \/ mandatory answers missing or invalid/);
});

test('every mandatory blank answer blocks its own local question, not unrelated questions', () => {
  const cases = [
    ['presentationName', '', 'presentation'], ['interests', [], 'interests'], ['autonomy', '', 'autonomy'],
    ['comfort', '', 'comfort'], ['bestTripsStatus', '', 'best-trips'], ['personalStatement', '', 'personal-statement'],
    ['offPathComfort', '', 'off-path'], ['challengePreferences', [], 'challenge'], ['accommodationPreference', '', 'accommodation'],
    ['motivations', [], 'motivations'], ['pace', '', 'pace'], ['travelExperience', '', 'history'],
    ['historyStatus', '', 'history'], ['occasionStatus', '', 'occasion'],
    ['originMode', '', 'origin'], ['originCity', '', 'origin'], ['originCountry', '', 'origin'],
    ['periodMode', '', 'timing'], ['durationMode', '', 'duration'], ['travelLimitMode', '', 'travel'], ['transport', [], 'travel'],
    ['groupKnown', '', 'group'], ['adults', '', 'group'], ['children', '', 'group'], ['groupType', '', 'group'],
    ['budgetMode', '', 'budget'], ['budgetMin', '', 'budget'],
    ['budgetCurrency', '', 'budget'], ['budgetScope', '', 'budget'], ['flightsBudget', '', 'includes'],
    ['budgetCoverageConfirmed', '', 'includes'], ['exclusionsStatus', '', 'exclusions'], ['physicalIntensity', '', 'physical-intensity'],
  ];
  for (const [key, value, id] of cases) {
    const state = { ...readyState(), [key]: value };
    assert.ok(validateDecision(state, id), key); assert.ok(hasIssue(state, id), key);
    assert.equal(validateDecision(state, id === 'presentation' ? 'comfort' : 'presentation'), '', key);
    assert.equal(validateDecision(state, id), validateCapture(state).issues.find(issue => issue.decision === id).message);
  }
  assert.ok(validateDecision({}, 'presentation')); assert.equal(validateDecision({}, 'not-a-question'), '');
  assert.ok(validateDecision({ ...readyState(), challengePreferences: [] }, 'challengePreferences'));
});

test('conditional details are only required for affirmative declarations and explicit other choices', () => {
  const state = readyState();
  state.bestTripsStatus = 'yes'; state.bestTrips = [{ place: 'Coast', moment: 'Walking', reason: '' }];
  assert.ok(hasIssue(state, 'best-trips')); state.bestTrips[0].reason = 'Quiet time.';
  state.autonomy = 'It depends.'; state.comfort = 'I would rather specify.';
  state.challengeLimits = ''; state.accommodationMinimums = '';
  assert.equal(validateCapture(state).ready, true);
  state.accommodationPreference = 'other'; assert.ok(hasIssue(state, 'accommodation'));
  state.accommodationOther = 'Cabin'; state.occasionStatus = 'yes'; assert.ok(hasIssue(state, 'occasion'));
  state.occasionType = 'unknown'; assert.equal(validateCapture(state).ready, true);
  state.occasionDate = '2027-02-29'; assert.ok(hasIssue(state, 'occasion'));
  state.occasionStatus = 'unknown'; assert.equal(validateCapture(state).ready, true);
  state.bestTripsStatus = 'no'; state.firstTripAspiration = 'unknown'; assert.equal(validateCapture(state).ready, true);
  state.bestTripsStatus = 'unknown'; state.bestTrips[0].reason = ''; assert.equal(validateCapture(state).ready, true);
});

test('interest and motivation priorities require an explicit answer only when multiple selected', () => {
  const state = readyState(); state.interests.push('food'); state.food = 'unknown'; state.motivations.push('Learning');
  assert.ok(hasIssue(state, 'priority')); assert.ok(hasIssue(state, 'motivations'));
  for (const priority of ['equal', 'unknown', 'pending']) {
    state.interestPriority = priority; state.motivationPriority = priority;
    assert.equal(validateCapture(state).ready, true);
  }
  state.interestPriority = 'food'; state.motivationPriority = 'Learning'; assert.equal(validateCapture(state).ready, true);
  state.interests = []; state.otherInterest = ''; state.interestStatus = 'skipped'; assert.equal(validateCapture(state).ready, true);
  state.interestStatus = 'unknown'; assert.equal(validateCapture(state).ready, true);
  state.challengePreferences = ['none', 'physical']; assert.ok(hasIssue(state, 'challenge'));
});

test('screening is trip-level; unknown/private/pending are valid, yes requires practical nonflexible records', () => {
  for (const { id } of screeningQuestions) {
    const state = readyState(); state.tripScreening[id] = '';
    assert.ok(validateDecision(state, `screening-${id}`));
    for (const status of ['no', 'unknown', 'private', 'pending', 'not sure']) {
      state.tripScreening[id] = status; assert.equal(validateCapture(state).ready, true, `${id}: ${status}`);
    }
    state.tripScreening[id] = 'yes'; assert.ok(hasIssue(state, `screening-${id}`));
    state.essentialNeeds = [{ type: id, text: 'One person needs practical route conditions.', affected: '' }];
    assert.equal(validateCapture(state).ready, true);
    state.essentialNeeds[0].text = ' '; assert.ok(hasIssue(state, `screening-${id}`));
    state.essentialNeeds[0].text = 'Practical conditions.';
    for (const flags of [{ flexible: true }, { essential: false }, { strength: 'prefer' }]) {
      assert.ok(hasIssue({ ...state, essentialNeeds: [{ ...state.essentialNeeds[0], ...flags }] }, `screening-${id}`));
    }
    state.tripScreening[id] = 'no'; assert.equal(validateCapture(state).ready, true);
    assert.ok(validateCapture(state).reviewRequired.some(text => text.includes('Practical conditions')));
  }
});

test('separate allergy records retain effects, affected descriptions and legacy IDs without identity requirements', () => {
  const state = readyState(); state.tripScreening.food = 'yes';
  state.essentialNeeds = [foodNeed(), { ...foodNeed('food-2'), text: 'Another person cannot eat shellfish.',
    affected: 'One companion', participants: ['former-traveller'], severity: 'unknown', crossContact: 'private', medicalAccess: 'Nearby care' }];
  const result = validateCapture(state); assert.equal(result.ready, true);
  assert.ok(result.uncertainties.some(text => text.includes('crossContact')));
  assert.ok(result.uncertainties.some(text => text.includes('do not infer mild')));
  assert.equal(result.reviewRequired.filter(text => text.startsWith('Verify essential food')).length, 2);
  assert.deepEqual(captureSnapshot(state).essentialNeeds, state.essentialNeeds);
  state.essentialNeeds[0].reviewStatus = 'pending'; state.essentialNeeds[0].requirementKind = '';
  assert.equal(validateCapture(state).ready, true);
});

test('group counts are explicit only when known; ages and routines are optional and no per-person checks apply', () => {
  const state = readyState(); state.groupType = 'family'; state.children = '2'; state.youngChildrenStatus = 'yes';
  assert.equal(validateCapture(state).ready, true);
  assert.ok(validateCapture(state).reviewRequired.some(text => text.includes('Young children')));
  state.childAges = 'Approximately 3 and 8'; assert.equal(captureSnapshot(state).childAges, state.childAges);
  for (const value of ['', '-1', '1.5', '101', '1e2']) assert.ok(hasIssue({ ...state, adults: value }, 'group'));
  assert.ok(hasIssue({ ...state, adults: '0', children: '0' }, 'group'));
  state.adults = '0'; assert.equal(validateCapture(state).ready, true);
  assert.ok(validateCapture(state).reviewRequired.some(text => text.includes('supervision')));
  for (const groupKnown of [false, 'unknown', 'not sure']) assert.equal(validateCapture({ ...state, groupKnown, adults: '', children: '', groupType: '' }).ready, true);
  assert.ok(hasIssue({ ...state, groupKnown: 'true' }, 'group'));
  assert.ok(hasIssue({ ...readyState(), groupType: 'couple' }, 'group'));
  assert.equal(validateCapture({ ...readyState(), groupType: 'couple', adults: '2' }).ready, true);
});

test('legacy sync preserves stable IDs and removed participant context without readiness reconciliation', () => {
  const state = readyState(); syncTravellers(state); const adult = state.travellers[0];
  state.children = '1'; state.groupType = 'family'; state.youngChildrenStatus = 'unknown'; syncTravellers(state);
  const child = state.travellers[1]; child.documents.nationalities = 'LOCAL_ONLY'; child.screening.food = 'yes';
  state.essentialNeeds = [{ ...foodNeed(), participants: [child.id] }];
  state.children = '0'; syncTravellers(state);
  assert.equal(state.unassignedTravellers[0], child); assert.equal(validateCapture(state).ready, true);
  state.children = '1'; syncTravellers(state); assert.equal(state.travellers[1].id, 'traveller-3');
  assert.equal(state.travellers[0], adult); assert.equal(state.essentialNeeds[0].participants[0], child.id);
  const roster = state.travellers; state.adults = ''; syncTravellers(state); assert.equal(state.travellers, roster);
});

test('legacy needs and free text stay raw, require no exact duplication or fabricated medical interpretation', () => {
  const state = readyState(); state.memory = 'Soy alergica y necesito silla de ruedas; must avoid altitude.';
  state.needs = ['mobility']; state.needDetails = { mobility: { text: 'No stairs.', type: 'firm', participants: ['former'] } };
  state.exclusionsStatus = 'yes'; state.exclusions = [{ text: 'No animal riding.', strength: 'firm', affected: '' }];
  const before = structuredClone(state); assert.equal(validateCapture(state).ready, true); assert.deepEqual(state, before);
  assert.ok(validateCapture(state).reviewRequired.some(text => text.includes('No stairs')));
  state.needDetails.mobility.text = ''; assert.ok(hasIssue(state, 'needs'));
  state.needs = []; assert.equal(validateCapture(state).ready, true);
  state.exclusions[0].text = ''; assert.ok(hasIssue(state, 'exclusions'));
  for (const status of ['none', 'unknown', 'pending']) {
    state.exclusionsStatus = status; assert.equal(validateCapture(state).ready, true);
  }
});

test('snapshot omits all concrete documentation and roster data, preserves constraints and strips firm margins', () => {
  const state = readyState(); syncTravellers(state);
  Object.assign(state, { passports: 'SECRET_PASSPORT', residence: 'SECRET_RESIDENCE', permits: 'SECRET_PERMIT',
    groupDocuments: 'SECRET_GROUP', documentationMode: 'provided', secret: 'SECRET_EXTRA',
    confirmedSnapshot: { recursive: true }, confirmation: { at: 'now' }, sceneOrder: ['food'] });
  state.travellers[0].documents.nationalities = 'SECRET_NATIONALITY';
  state.unassignedTravellers = [{ id: 'former', documents: { passport: 'SECRET_ARCHIVED' } }];
  state.essentialNeeds = [{ ...foodNeed(), participants: ['traveller-1'], margin: 'SECRET_MARGIN', diagnosis: 'SECRET_DIAGNOSIS' }];
  state.exclusions = [{ text: 'No boats', strength: 'firm', affected: 'Group', participants: ['former'], margin: 'SECRET_EX_MARGIN' }];
  state.needDetails = { food: { text: 'Peanuts', type: 'flexible', essential: true, margin: 'SECRET_FOOD_MARGIN' },
    transport: { text: 'No boats', type: 'firm', margin: 'SECRET_FIRM_MARGIN' },
    access: { text: 'Check access', type: 'verify', margin: 'SECRET_VERIFY_MARGIN' },
    comfort: { text: 'Quiet', type: 'flexible', margin: 'Some noise' } };
  const before = structuredClone(state), snapshot = captureSnapshot(state);
  assert.doesNotMatch(JSON.stringify(snapshot), /SECRET_/);
  for (const key of ['travellers', 'unassignedTravellers', 'passports', 'residence', 'permits', 'groupDocuments',
    'documentationMode', 'confirmation', 'confirmedSnapshot', 'sceneOrder']) assert.equal(key in snapshot, false, key);
  assert.equal(snapshot.needDetails.food.type, 'verify'); assert.equal(snapshot.needDetails.comfort.margin, 'Some noise');
  assert.deepEqual(snapshot.essentialNeeds[0].participants, ['traveller-1']); assert.equal(snapshot.exclusions[0].affected, 'Group');
  snapshot.tripScreening.food = 'yes'; assert.deepEqual(state, before);
  assert.deepEqual(captureSnapshot(captureSnapshot(state)), captureSnapshot(state));
  assert.doesNotMatch(buildPrompt(state), /SECRET_/);
});

test('migration preserves sensitive answers locally and needs unchanged while clearing old policy confirmation', () => {
  const saved = { ...readyState(), captureVersion: 'original-capture-1', policyVersion: 'original-policy-1',
    passports: 'LOCAL_PASSPORT', residence: 'LOCAL_RESIDENCE', permits: 'LOCAL_PERMIT', groupDocuments: 'LOCAL_GROUP',
    confirmation: { at: 'old' }, confirmedAt: 'yesterday', needs: ['food'],
    needDetails: { food: { text: 'Peanuts', essential: true, margin: 'old margin' } }, customOldField: 'keep' };
  delete saved.tripScreening; syncTravellers(saved); saved.travellers[0].documents.nationalities = 'LOCAL_NATIONALITY';
  saved.travellers[0].screening.food = 'yes'; saved.essentialNeeds = [foodNeed()];
  const before = structuredClone(saved), restored = restoreCapture(saved);
  assert.equal(restored.captureVersion, CAPTURE_VERSION); assert.equal(restored.policyVersion, POLICY_VERSION);
  assert.equal(restored.confirmation, null); assert.equal(restored.confirmedSnapshot, null); assert.equal(restored.confirmedAt, '');
  assert.equal(restored.customOldField, 'keep'); assert.equal(restored.passports, saved.passports);
  assert.equal(restored.residence, saved.residence); assert.equal(restored.permits, saved.permits);
  assert.equal(restored.groupDocuments, saved.groupDocuments);
  assert.equal(restored.travellers[0].documents.nationalities, 'LOCAL_NATIONALITY');
  assert.deepEqual(restored.needs, saved.needs); assert.deepEqual(restored.needDetails, saved.needDetails);
  assert.deepEqual(restored.essentialNeeds, saved.essentialNeeds); assert.deepEqual(saved, before);
  assert.doesNotMatch(JSON.stringify(captureSnapshot(restored)), /LOCAL_/);
});

test('legacy screening aggregation is positive-first, all-active-no only, and never invents negative answers', () => {
  const cases = [[[], ''], [['', ''], ''], [['no', ''], 'unknown'], [['no', 'no'], 'no'],
    [['private', 'private'], 'unknown'], [['yes', 'no'], 'yes'], [['yes', ''], 'yes'], [['pending', 'no'], 'unknown']];
  for (const [answers, expected] of cases) {
    const saved = { travellers: answers.map((food, index) => ({ id: `traveller-${index + 1}`, kind: 'adult', screening: { food } })),
      unassignedTravellers: [{ id: 'former', screening: { food: 'yes' } }] };
    assert.equal(restoreCapture(saved).tripScreening.food, expected, JSON.stringify(answers));
  }
  const saved = { tripScreening: { food: 'private', mobility: '' }, travellers: [{ screening: { food: 'yes', mobility: 'no' } }] };
  assert.equal(restoreCapture(saved).tripScreening.food, 'private'); assert.equal(restoreCapture(saved).tripScreening.mobility, '');
  const restored = restoreCapture({ originCity: 'Madrid', originCountry: 'Spain' }); assert.equal(restored.originMode, 'known');
});

test('current confirmation survives only when a valid matching versioned snapshot is unchanged', () => {
  const state = unknownState(); state.confirmation = { version: CAPTURE_VERSION }; state.confirmedAt = '2026-10-10';
  state.confirmedSnapshot = captureSnapshot(state);
  assert.equal(restoreCapture(state).confirmedAt, state.confirmedAt);
  for (const changed of [{ presentationName: 'Changed' }, { confirmedSnapshot: {} }, { policyVersion: 'old' }, { physicalIntensity: '' }]) {
    assert.equal(restoreCapture({ ...state, ...changed }).confirmation, null);
  }
  const local = structuredClone(state); local.passports = 'Local change'; assert.deepEqual(restoreCapture(local).confirmation, state.confirmation);
  const incomplete = captureDefaults(); incomplete.confirmation = {}; incomplete.confirmedSnapshot = captureSnapshot(incomplete);
  assert.equal(restoreCapture(incomplete).confirmation, null);
});

test('visibility matches required history, food and young-children answers without hidden-field blockers', () => {
  for (const historyStatus of ['none', 'unknown']) {
    const state = { ...readyState(), historyStatus, historyCompleteness: '', history: '' };
    assert.equal(validateDecision(state, 'history'), ''); assert.equal(validateCapture(state).ready, true);
  }
  const visited = { ...readyState(), historyStatus: 'visited', history: 'Spain', historyCompleteness: '' };
  assert.ok(validateDecision(visited, 'history'));
  for (const historyCompleteness of ['complete', 'partial', 'unknown']) assert.equal(validateCapture({ ...visited, historyCompleteness }).ready, true);

  const food = { ...readyState(), interests: ['food'], food: '' };
  assert.ok(validateDecision(food, 'food')); assert.equal(validateDecision(food, 'screening-food'), '');
  for (const value of ['Cooking', 'unknown']) assert.equal(validateCapture({ ...food, food: value }).ready, true);
  assert.equal(validateDecision({ ...food, interests: ['nature'] }, 'food'), '');

  const family = { ...readyState(), groupType: 'family', children: '1', youngChildrenStatus: '' };
  assert.ok(validateDecision(family, 'group'));
  for (const youngChildrenStatus of ['yes', 'no', 'unknown']) assert.equal(validateCapture({ ...family, youngChildrenStatus }).ready, true);
  for (const changed of [{ children: '0' }, { groupKnown: false, adults: '', children: '', groupType: '' }]) {
    const state = { ...family, ...changed }; assert.equal(validateDecision(state, 'group'), '');
    assert.equal(validateCapture(state).ready, true);
  }
  assert.equal(captureDefaults().groupKnown, '');
  assert.ok(validateDecision({ ...unknownState(), groupKnown: '' }, 'group'));
  assert.equal(validateDecision({ ...unknownState(), groupKnown: false }, 'group'), '');
  const dates = { ...readyState(), periodMode: 'dates', dateStart: '2028-02-29', dateEnd: '2028-03-07', durationMin: '10' };
  assert.ok(hasIssue(dates, 'duration')); assert.equal(validateDecision(dates, 'duration'), '');
});

test('no-trip aspiration and unselected extra needs are optional; selected needs require only text', () => {
  const state = readyState(); assert.equal(state.firstTripAspiration, '');
  assert.equal(validateDecision(state, 'best-trips'), ''); assert.equal(validateCapture(state).ready, true);
  state.needs = []; state.needsStatus = ''; assert.equal(validateDecision(state, 'needs'), '');
  state.needs = ['mobility']; state.needDetails = { mobility: { text: '' } };
  assert.ok(validateDecision(state, 'needs')); state.needDetails.mobility.text = 'Short walks.';
  assert.equal(validateDecision(state, 'needs'), ''); assert.equal(validateCapture(state).ready, true);
});

test('personal statement requires explicit status and written text, migrating old text without overwriting answers', () => {
  const state = { ...readyState(), personalStatementStatus: 'written', personalStatement: ' ' };
  assert.ok(validateDecision(state, 'personal-statement'));
  assert.equal(validateDecision({ ...state, personalStatementStatus: 'unknown' }, 'personal-statement'), '');
  assert.ok(validateDecision({ ...state, personalStatement: 'Saved text', personalStatementStatus: '' }, 'personal-statement'));
  const saved = { personalStatement: 'Saved text' }, before = structuredClone(saved);
  const restored = restoreCapture(saved);
  assert.equal(restored.personalStatementStatus, 'written'); assert.equal(restored.personalStatement, saved.personalStatement);
  assert.deepEqual(saved, before);
  assert.equal(restoreCapture({ ...saved, personalStatementStatus: 'unknown' }).personalStatementStatus, 'unknown');
  assert.equal(restoreCapture({ personalStatement: ' ' }).personalStatementStatus, '');
  assert.equal(restoreCapture({ ...saved, captureVersion: CAPTURE_VERSION, policyVersion: POLICY_VERSION }).personalStatementStatus, '');
});

test('displayed exclusions require explicit firm or prefer strength even when status changes', () => {
  const state = { ...readyState(), exclusionsStatus: 'yes', exclusions: [{ text: 'No boats', strength: '' }] };
  assert.ok(validateDecision(state, 'exclusions'));
  for (const strength of ['firm', 'prefer']) assert.equal(validateCapture({ ...state, exclusions: [{ text: 'No boats', strength }] }).ready, true);
  for (const strength of ['', 'unknown', 'pending']) for (const exclusionsStatus of ['yes', 'none', 'unknown']) {
    assert.ok(validateDecision({ ...state, exclusionsStatus, exclusions: [{ text: 'No boats', strength }] }, 'exclusions'));
  }
  assert.equal(validateDecision({ ...state, exclusionsStatus: 'none', exclusions: [] }, 'exclusions'), '');
});

test('calendar dates, ordered ranges and known-precision duration conflicts remain validated', () => {
  const state = { ...readyState(), periodMode: 'dates', dateStart: '2028-02-29', dateEnd: '2028-03-07' };
  assert.equal(validateCapture(state).ready, true);
  for (const dateStart of ['2027-02-29', '2028-04-31', '2028-13-01', '2028-02-29T24:00']) assert.ok(hasIssue({ ...state, dateStart }, 'timing'));
  assert.ok(hasIssue({ ...state, dateEnd: '2028-02-28' }, 'timing'));
  assert.ok(hasIssue({ ...state, durationMin: '10' }, 'duration'));
  assert.equal(hasIssue({ ...state, durationMin: '7.5' }, 'duration'), false);
  assert.ok(hasIssue({ ...state, durationMode: 'range', durationMax: '6' }, 'duration'));
  assert.equal(validateCapture({ ...state, durationMode: '', durationMin: '' }).ready, true, 'Dates hide the duration question');
  assert.equal(validateCapture({ ...state, durationMode: 'unknown' }).ready, true);
  assert.ok(hasIssue({ ...state, periodMode: 'months', monthStart: '2027-13' }, 'timing'));
  assert.ok(hasIssue({ ...state, periodMode: 'months', monthStart: '2027-06', monthEnd: '2027-06', durationMin: '40' }, 'duration'));
});

test('hour precision, actual DST offsets and calendar months are not fabricated', () => {
  const state = { ...readyState(), periodMode: 'dates', dateStart: '2027-03-28T00:00', dateEnd: '2027-03-29T00:00',
    durationUnit: 'hours', durationMin: '23', timeZone: 'Europe/Madrid' };
  assert.equal(validateCapture(state).ready, true);
  for (const changed of [{ timeZone: '' }, { timeZone: 'Fake/Zone' }, { dateStart: '2027-03-28' },
    { dateStart: '2027-03-28T02:30' }, { dateStart: '2027-10-31T02:30', dateEnd: '2027-11-01T02:30' }]) assert.ok(hasIssue({ ...state, ...changed }, 'timing'));
  assert.ok(hasIssue({ ...state, durationMin: '24' }, 'duration'));
  assert.equal(validateCapture({ ...state, dateStart: '2027-10-31T02:30+02:00', dateEnd: '2027-11-01T01:30+01:00', durationMin: '24' }).ready, true);
  const months = { ...state, dateStart: '2028-01-31', dateEnd: '2028-02-29', durationUnit: 'months', durationMin: '1' };
  assert.equal(validateCapture(months).ready, true); assert.ok(hasIssue({ ...months, dateEnd: '2028-03-02' }, 'duration'));
});

test('budget preserves currency, scope, caps and recorded conversion without claiming external verification', () => {
  const empty = budgetReference(); assert.equal(empty.upperCap, null); assert.equal(empty.currency, null); assert.equal(empty.eurConversion.rate, null);
  const state = { ...readyState(), budgetScope: 'group' };
  let ref = budgetReference(state); assert.equal(ref.upperCap, 2000); assert.equal(ref.eurUpperCap, null);
  assert.equal(ref.eurConversion.status, 'pending'); assert.equal(ref.allocation, 'not-assigned');
  state.eurConversion = { rate: '0.9', source: 'ECB reference', date: '2026-10-09' };
  ref = budgetReference(state); assert.equal(ref.eurUpperCap, 1800); assert.equal(ref.scope, 'group');
  assert.equal(ref.eurConversion.status, 'recorded'); assert.equal(ref.eurConversion.verification, 'pending');
  state.budgetMode = 'range'; state.budgetMax = '3000'; ref = budgetReference(state);
  assert.equal(ref.lower, 2000); assert.equal(ref.upperCap, 3000); assert.equal(ref.eurLower, 1800);
  const euro = budgetReference({ ...state, budgetCurrency: 'EUR', eurConversion: {} });
  assert.equal(euro.eurUpperCap, 3000); assert.equal(euro.eurConversion.rate, 1); assert.equal(euro.eurConversion.status, 'recorded');
  for (const conversion of [{ rate: '0.9' }, { rate: '-1', source: 'ECB', date: '2026-10-09' }, { rate: '0.9', source: 'ECB', date: '2026-02-30' }]) {
    const copy = { ...state, eurConversion: conversion }; assert.equal(validateCapture(copy).ready, true);
    assert.equal(budgetReference(copy).eurUpperCap, null);
  }
  assert.ok(hasIssue({ ...state, budgetMax: '1000' }, 'budget'));
  assert.equal(validateCapture({ ...state, budgetCurrency: 'unknown', budgetScope: 'unknown' }).ready, true);
  assert.equal(validateCapture({ ...state, budgetFlexibility: 'A little extra' }).ready, true);
  assert.ok(hasIssue({ ...state, budgetMarginAmount: '-1' }, 'budget'));
});

test('flight coverage may be pending but cost confirmation is an actual explicit yes', () => {
  const state = readyState(); state.flightsBudget = 'pending'; state.budgetIncludes = [];
  assert.equal(validateCapture(state).ready, true);
  for (const value of ['', false, 'unknown', 'pending', 'no']) assert.ok(hasIssue({ ...state, budgetCoverageConfirmed: value }, 'includes'));
  assert.equal(validateCapture({ ...state, budgetCoverageConfirmed: true }).ready, true);
  state.budgetIncludes = ['Food']; state.budgetExcluded = ['Food']; assert.ok(hasIssue(state, 'includes'));
  state.budgetMode = 'unknown'; assert.equal(validateCapture(state).ready, true, 'Coverage is not displayed without an amount');
  state.transport = ['Driving myself']; assert.ok(hasIssue(state, 'travel'));
  state.drivingStatus = 'pending'; assert.equal(validateCapture(state).ready, true);
});
