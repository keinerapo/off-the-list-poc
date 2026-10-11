export const CAPTURE_VERSION = 'trip-capture-2';
export const POLICY_VERSION = 'trip-policy-2';

export const screeningQuestions = [
  { id: 'food', label: 'Does anyone travelling have a food allergy or an essential dietary requirement?' },
  { id: 'mobility', label: 'Does anyone need step-free access, limited walking or low-impact activities?' },
  { id: 'altitude', label: 'Does anyone have a known sensitivity or restriction related to altitude?' },
  { id: 'health', label: 'Is there any health-related restriction that affects exertion, remoteness or access to medical care?' },
  { id: 'access', label: 'Are there any other essential access, sensory, communication or accommodation needs?' },
  { id: 'pregnancy', label: 'Should pregnancy-related precautions be considered for anyone during the travel period?' },
];

export function captureDefaults() {
  return {
    interests: [], interestStatus: '', otherInterest: '', interestPriority: '', autonomy: '', comfort: '',
    motivations: [], motivationPriority: '', pace: '', originMode: '', originCity: '', originCountry: '',
    periodMode: '', durationMode: '', travelLimitMode: '', transport: [], groupKnown: '', adults: '', children: '',
    childAges: '', groupNotes: '', youngChildrenStatus: '', budgetMode: '', budgetScope: '',
    tripScreening: { food: '', mobility: '', altitude: '', health: '', access: '', pregnancy: '' },
    presentationName: '', groupType: '', groupChecked: '', supervision: '', travellers: [],
    bestTripsStatus: '', bestTrips: [], firstTripAspiration: '', personalStatement: '', personalStatementStatus: '',
    offPathComfort: '', autonomyDetails: '', comfortMinimums: '', challengePreferences: [], challengeLimits: '',
    accommodationPreference: '', accommodationOther: '', accommodationMinimums: '', youngChildrenRoutine: '',
    travelExperience: '', historyStatus: '', historyScope: '', historyPolicyAcknowledged: '',
    occasionStatus: '', occasionType: '', occasionDate: '', occasionWishes: '', drivingStatus: '',
    timeZone: '', flightSegmentLimit: '', budgetCurrency: '', flightsBudget: '', budgetExcluded: [],
    budgetCoverageConfirmed: '', eurConversion: { rate: '', source: '', date: '' }, budgetMarginAmount: '',
    exclusionsStatus: '', exclusions: [], essentialNeeds: [], physicalIntensity: '',
    soloSafetyApplicability: '', soloExperience: '', freeTextReview: '', confirmation: null, confirmedSnapshot: null,
    captureVersion: CAPTURE_VERSION, policyVersion: POLICY_VERSION,
  };
}

const list = value => Array.isArray(value) ? value : [];
const filled = value => (typeof value === 'string' && value.trim() !== '') || (typeof value === 'number' && Number.isFinite(value));
const integer = (value, max) => filled(value) && /^\d+$/.test(String(value)) && Number(value) <= max;
const positive = value => filled(value) && /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(value)) && Number(value) > 0;
const uncertain = value => typeof value === 'string' && /^(pending|private|unknown|unsure|partial|needs clarification|not sure(?: yet)?\.?|no lo s[eé]|pendiente)$/i.test(value.trim());
const clone = value => structuredClone(value);

export function syncTravellers(state) {
  // Invalid or incomplete counts are not a request to remove the existing roster.
  if (!integer(state.adults, 100) || !integer(state.children, 100) || Number(state.adults) + Number(state.children) > 100) return state;
  const previous = list(state.travellers);
  const archived = [...list(state.unassignedTravellers)];
  const used = new Set([...previous, ...archived].map(traveller => traveller.id));
  let nextId = Math.max(0, ...[...used].map(id => Number(/^traveller-(\d+)$/.exec(id)?.[1]) || 0)) + 1;
  const roster = [];
  for (const [kind, count] of [['adult', Number(state.adults)], ['child', Number(state.children)]]) {
    const matching = previous.filter(traveller => traveller.kind === kind);
    for (let index = 0; index < count; index++) {
      if (matching[index]) roster.push(matching[index]);
      else {
        const id = `traveller-${nextId++}`;
        roster.push({
          id, kind, ageYears: '', ageMonths: '',
          screening: Object.fromEntries(screeningQuestions.map(question => [question.id, ''])),
          documents: { status: '', nationalities: '', residence: '', permits: '', validity: '', alternativeReason: '' },
        });
      }
    }
  }
  const active = new Set(roster.map(traveller => traveller.id));
  for (const traveller of previous) if (!active.has(traveller.id)) archived.push(traveller);
  if (previous.length !== roster.length || previous.some((traveller, index) => traveller.id !== roster[index]?.id || traveller.kind !== roster[index]?.kind)) state.groupChecked = '';
  state.travellers = roster;
  state.unassignedTravellers = archived;
  return state;
}

const originalFields = [
  'mode', 'interests', 'interestStatus', 'otherInterest', 'interestPriority', 'autonomy', 'comfort', 'food', 'memory',
  'motivations', 'motivationPriority', 'purposeNote', 'pace', 'originMode', 'originCity', 'originCountry', 'alternateOrigin',
  'durationMode', 'durationMin', 'durationMax', 'durationUnit', 'periodMode', 'dateStart', 'dateEnd', 'monthStart', 'monthEnd',
  'periodFlexibility', 'travelLimitMode', 'travelLimit', 'transport', 'transportNotes', 'groupKnown', 'adults', 'children',
  'childAges', 'groupNotes', 'budgetMode', 'budgetMin', 'budgetMax', 'budgetScope', 'budgetIncludes', 'budgetFlexibility',
  'novelty', 'history', 'historyCompleteness',
  'needs', 'needDetails', 'needsStatus', 'legacyNovelty',
];

export function captureSnapshot(state = {}) {
  const fields = [...new Set([...originalFields, ...Object.keys(captureDefaults()).filter(key => ![
    'confirmation', 'confirmedSnapshot', 'travellers', 'soloSafetyApplicability', 'soloExperience', 'freeTextReview',
  ].includes(key))])];
  const snapshot = clone(Object.fromEntries(fields.filter(key => state[key] !== undefined).map(key => [key, state[key]])));
  const pick = (record, keys) => Object.fromEntries(keys.filter(key => record?.[key] !== undefined).map(key => [key, record[key]]));
  if (snapshot.tripScreening) snapshot.tripScreening = pick(snapshot.tripScreening, screeningQuestions.map(question => question.id));
  if (snapshot.essentialNeeds) snapshot.essentialNeeds = list(snapshot.essentialNeeds).map(record => pick(record, [
    'id', 'type', 'participants', 'affected', 'text', 'requirementKind', 'crossContact', 'severity', 'medicalAccess', 'reviewStatus',
  ]));
  if (snapshot.exclusions) snapshot.exclusions = list(snapshot.exclusions).map(record => pick(record, ['id', 'text', 'scope', 'participants', 'affected', 'strength', 'clarification']));
  if (snapshot.bestTrips) snapshot.bestTrips = list(snapshot.bestTrips).map(record => pick(record, ['id', 'place', 'moment', 'reason']));
  if (snapshot.eurConversion) snapshot.eurConversion = pick(snapshot.eurConversion, ['rate', 'source', 'date']);
  if (snapshot.needDetails) snapshot.needDetails = Object.fromEntries(Object.entries(snapshot.needDetails).map(([id, record]) => {
    const detail = pick(record, ['text', 'type', 'scope', 'participants', 'affected', 'essential', 'margin']);
    if (detail.essential || ['firm', 'verify'].includes(detail.type)) {
      delete detail.margin;
      if (detail.essential && detail.type === 'flexible') detail.type = 'verify';
    }
    return [id, detail];
  }));
  return snapshot;
}

export function restoreCapture(saved = {}) {
  const old = !saved || saved.captureVersion !== CAPTURE_VERSION || saved.policyVersion !== POLICY_VERSION;
  const state = { ...captureDefaults(), ...clone(saved || {}) };
  state.eurConversion = { rate: '', source: '', date: '', ...state.eurConversion };
  state.travellers = list(state.travellers).map(traveller => ({
    ...traveller,
    screening: { ...Object.fromEntries(screeningQuestions.map(question => [question.id, ''])), ...traveller.screening },
    documents: { status: '', nationalities: '', residence: '', permits: '', validity: '', alternativeReason: '', ...traveller.documents },
  }));
  // A positive legacy answer is retained; silence is never converted to a negative.
  state.tripScreening = Object.fromEntries(screeningQuestions.map(({ id }) => {
    if (Object.hasOwn(saved?.tripScreening || {}, id)) return [id, saved.tripScreening[id]];
    const answers = state.travellers.map(traveller => traveller.screening[id]);
    const status = answers.includes('yes') ? 'yes'
      : answers.length && answers.every(answer => answer === 'no') ? 'no'
        : answers.some(filled) ? 'unknown' : '';
    return [id, status];
  }));
  if (old && !filled(state.originMode) && filled(state.originCity) && filled(state.originCountry)) state.originMode = 'known';
  if (old && !filled(state.personalStatementStatus) && filled(state.personalStatement)) state.personalStatementStatus = 'written';
  if (old) {
    if (filled(state.novelty) && state.novelty !== 'Only new destinations.') state.legacyNovelty = state.novelty;
    state.novelty = 'Only new destinations.';
    state.historyPolicyAcknowledged = '';
  }
  state.captureVersion = CAPTURE_VERSION;
  state.policyVersion = POLICY_VERSION;
  const snapshot = state.confirmedSnapshot;
  const validSnapshot = snapshot && snapshot.captureVersion === CAPTURE_VERSION && snapshot.policyVersion === POLICY_VERSION
    && validateCapture(state).ready && validateCapture(snapshot).ready
    && JSON.stringify(captureSnapshot(state)) === JSON.stringify(captureSnapshot(snapshot));
  if (old || !validSnapshot) {
    state.confirmation = null;
    state.confirmedSnapshot = null;
    state.confirmedAt = '';
  }
  return state;
}

// A parsed day is a calendar precision, not a fabricated midnight departure.
function calendar(value, monthOnly = false) {
  if (typeof value !== 'string') return null;
  const match = (monthOnly ? /^(\d{4})-(\d{2})$/ : /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?)?$/).exec(value);
  if (!match) return null;
  const [, y, m, d = '01', hour, minute, second = '0', fraction = '', offset] = match;
  const year = Number(y), month = Number(m), day = Number(d);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  if (year < 1 || month < 1 || month > 12 || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (hour !== undefined && (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59)) return null;
  if (offset && offset !== 'Z' && (Number(offset.slice(1, 3)) > 23 || Number(offset.slice(4)) > 59)) return null;
  return { year, month, day, dayMs: date.getTime(), hasTime: hour !== undefined,
    wallMs: date.getTime() + ((Number(hour || 0) * 60 + Number(minute || 0)) * 60 + Number(second)) * 1000 + Number(fraction.padEnd(3, '0')), offset };
}

function instant(parsed, timeZone) {
  if (parsed.offset) {
    const offset = parsed.offset === 'Z' ? 0 : (Number(parsed.offset.slice(1, 3)) * 60 + Number(parsed.offset.slice(4))) * (parsed.offset[0] === '+' ? 1 : -1);
    return parsed.wallMs - offset * 60000;
  }
  if (!filled(timeZone)) return null;
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    const offsets = new Set();
    const wallAt = ms => {
      const parts = Object.fromEntries(formatter.formatToParts(ms).map(part => [part.type, part.value]));
      return calendar(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`).wallMs;
    };
    for (const hours of [-36, 0, 36]) {
      const probe = Math.floor(parsed.wallMs / 1000) * 1000 + hours * 3600000;
      offsets.add(wallAt(probe) - probe);
    }
    const candidates = [...offsets].map(offset => parsed.wallMs - offset).filter(ms => wallAt(ms) === Math.floor(parsed.wallMs / 1000) * 1000);
    // DST gaps and ambiguous local times need an explicit offset, not a guess.
    return candidates.length === 1 ? candidates[0] : null;
  } catch { return null; }
}

export function budgetReference(state = {}) {
  const conversion = state.eurConversion || {};
  const validConversion = positive(conversion.rate) && filled(conversion.source) && !uncertain(conversion.source) && Boolean(calendar(conversion.date)) && !calendar(conversion.date).hasTime;
  const amount = state.budgetMode === 'amount';
  const range = state.budgetMode === 'range';
  const lower = range && positive(state.budgetMin) ? Number(state.budgetMin) : null;
  const upper = (amount || range) && positive(amount ? state.budgetMin : state.budgetMax) ? Number(amount ? state.budgetMin : state.budgetMax) : null;
  const currency = filled(state.budgetCurrency) ? state.budgetCurrency : null;
  const euro = currency === 'EUR';
  return {
    currency, scope: filled(state.budgetScope) ? state.budgetScope : null, mode: state.budgetMode ?? null,
    lower, upperCap: upper, marginAmount: filled(state.budgetMarginAmount) ? state.budgetMarginAmount : null,
    flights: filled(state.flightsBudget) ? state.flightsBudget : null,
    included: clone(list(state.budgetIncludes)), excluded: clone(list(state.budgetExcluded)),
    eurConversion: { status: euro || validConversion ? 'recorded' : 'pending', verification: 'pending', rate: euro ? 1 : validConversion ? Number(conversion.rate) : null,
      source: filled(conversion.source) ? conversion.source : null, date: filled(conversion.date) ? conversion.date : null },
    eurLower: lower === null || !(euro || validConversion) ? null : lower * (euro ? 1 : Number(conversion.rate)),
    eurUpperCap: upper === null || !(euro || validConversion) ? null : upper * (euro ? 1 : Number(conversion.rate)),
    allocation: 'not-assigned',
  };
}

function captureValidation(state = {}) {
  const s = { ...captureDefaults(), ...state };
  const issues = [];
  const reviewRequired = ['Current route, safety, legal, entry, provider and price evidence is required.', 'History geography, transit/residence definitions and inverse territorial scope require policy review.'];
  const uncertainties = [];
  const issue = (decision, message) => issues.push({ decision, message });
  const require = (decision, value, message) => { if (!filled(value)) issue(decision, message); };
  const answer = (decision, value, choices, message) => {
    if (!choices.includes(value) && !uncertain(value)) issue(decision, message);
  };
  require('presentation', s.presentationName, 'Provide a preferred name or alias for the reveal.');
  const interests = [...list(s.interests), ...(filled(s.otherInterest) ? ['other'] : [])];
  if (!interests.length && !uncertain(s.interestStatus) && s.interestStatus !== 'skipped') issue('interests', 'Select an interest or explicitly say you are unsure.');
  if (interests.some(value => !filled(value))) issue('interests', 'Selected interests must be nonempty.');
  if (interests.length > 1 && s.interestPriority !== 'equal' && !uncertain(s.interestPriority) && !interests.includes(s.interestPriority)) issue('priority', 'Choose an interest priority, equal importance or unknown.');
  if (list(s.interests).includes('food')) require('food', s.food, 'Declare the food experiences you enjoy, or unknown.');
  if (s.bestTripsStatus === 'yes') {
    if (!list(s.bestTrips).length || list(s.bestTrips).some(trip => !trip || !filled(trip.place) || !filled(trip.moment) || !filled(trip.reason))) issue('best-trips', 'Record at least one favourite trip with its place, moment and reason.');
  } else answer('best-trips', s.bestTripsStatus, ['no'], 'Answer whether you have enjoyed a previous trip, or say unknown.');
  answer('personal-statement', s.personalStatementStatus, ['written'], 'Choose to describe yourself or explicitly say unknown.');
  if (s.personalStatementStatus === 'written') require('personal-statement', s.personalStatement, 'Describe what we should understand about you.');
  if (!uncertain(s.offPathComfort) && (!integer(s.offPathComfort, 5) || Number(s.offPathComfort) < 1)) issue('off-path', 'Choose an off-path comfort level from 1 to 5, or unknown.');
  require('autonomy', s.autonomy, 'Declare your autonomy preference.');
  require('comfort', s.comfort, 'Declare your comfort preference.');
  if (!list(s.challengePreferences).length || list(s.challengePreferences).some(value => !filled(value))) issue('challenge', 'Declare the challenges you welcome, none or unknown.');
  if (list(s.challengePreferences).includes('none') && s.challengePreferences.length > 1) issue('challenge', 'None conflicts with selected challenges.');
  require('accommodation', s.accommodationPreference, 'Declare an accommodation preference, including no preference if applicable.');
  if (/^other$/i.test(s.accommodationPreference)) require('accommodation', s.accommodationOther, 'Describe your other accommodation preference.');
  const motivations = list(s.motivations);
  if (!motivations.length || motivations.some(value => !filled(value))) issue('motivations', 'Declare the trip motivations, or unknown.');
  if (motivations.length > 1 && s.motivationPriority !== 'equal' && !uncertain(s.motivationPriority) && !motivations.includes(s.motivationPriority)) issue('motivations', 'Declare a motivation priority, equal importance or unknown.');
  if (s.occasionStatus === 'yes') {
    require('occasion', s.occasionType, 'Describe the special occasion.');
  } else answer('occasion', s.occasionStatus, ['no'], 'Answer whether this is a special occasion, or unknown.');
  if (s.occasionStatus === 'yes' && filled(s.occasionDate) && !uncertain(s.occasionDate) && (!calendar(s.occasionDate) || calendar(s.occasionDate).hasTime)) issue('occasion', 'Supply a real calendar date for the occasion.');
  require('pace', s.pace, 'Declare the trip pace, or unknown.');
  require('history', s.travelExperience, 'Declare your general travel experience, or unknown.');
  answer('history', s.historyStatus, ['visited', 'none'], 'Declare visited places, no previous travel or unknown.');
  if (s.historyStatus === 'visited') {
    require('history', s.history, 'List the places already visited.');
    answer('history', s.historyCompleteness, ['complete', 'partial'], 'Declare whether your history is complete, partial or unknown.');
  }
  if (s.originMode === 'known') {
    require('origin', s.originCity, 'Provide the starting city.');
    require('origin', s.originCountry, 'Provide the starting country.');
  } else answer('origin', s.originMode, [], 'Declare whether your starting point is known or unknown.');

  const start = calendar(s.dateStart), end = calendar(s.dateEnd);
  let elapsed = null;
  let dateDays = null;
  if (s.periodMode === 'dates') {
    if (!start || !end) issue('timing', 'Provide real departure and return dates, with valid times if supplied.');
    else {
      dateDays = (end.dayMs - start.dayMs) / 86400000;
      if (dateDays < 0) issue('timing', 'The return date cannot precede departure.');
      if (start.hasTime || end.hasTime) {
        if (!start.hasTime || !end.hasTime) issue('timing', 'Supply both times to establish precise elapsed duration.');
        if (!filled(s.timeZone)) issue('timing', 'Declare the starting-point time zone when using hours.');
        else {
          try { new Intl.DateTimeFormat('en', { timeZone: s.timeZone }); } catch { issue('timing', 'Provide a valid IANA time zone.'); }
        }
        if (start.hasTime && end.hasTime) {
          const a = instant(start, s.timeZone), b = instant(end, s.timeZone);
          if (a === null || b === null) issue('timing', 'Local times must exist and be unambiguous; provide offsets around DST changes.');
          else if (b <= a) issue('timing', 'Return must be after departure.');
          else elapsed = (b - a) / 3600000;
        }
      }
    }
  } else if (s.periodMode === 'months') {
    const a = calendar(s.monthStart, true), b = calendar(s.monthEnd, true);
    if (!a || !b || b.dayMs < a.dayMs) issue('timing', 'Provide a real, ordered window of travel months.');
  } else answer('timing', s.periodMode, [], 'Declare travel dates, a window of months or unknown.');
  const durationSupplied = ['exact', 'range'].includes(s.durationMode);
  const durationValid = durationSupplied && positive(s.durationMin) && ['hours', 'days', 'weeks', 'months'].includes(s.durationUnit)
    && (s.durationMode !== 'range' || positive(s.durationMax) && Number(s.durationMax) >= Number(s.durationMin));
  if (durationSupplied && !durationValid) issue('duration', 'Provide a positive duration and an ordered range in a known unit.');
  if (!durationSupplied && !uncertain(s.durationMode) && s.periodMode !== 'dates') issue('duration', 'Declare full trip duration, a range or unknown.');
  if (durationValid) {
    const low = Number(s.durationMin), high = s.durationMode === 'range' ? Number(s.durationMax) : low;
    const factor = { hours: 1, days: 24, weeks: 168 }[s.durationUnit];
    if (factor && elapsed !== null && (elapsed < low * factor - 1e-7 || elapsed > high * factor + 1e-7)) issue('duration', 'The supplied duration conflicts with the precise departure/return interval.');
    if (factor && elapsed === null && dateDays !== null && dateDays >= 0 && (high * factor <= Math.max(0, dateDays - 1) * 24 || low * factor >= (dateDays + 1) * 24)) issue('duration', 'Duration conflicts with the dates even allowing for unknown departure/return times.');
    if (s.durationUnit === 'hours' && s.periodMode === 'dates' && (!start?.hasTime || !end?.hasTime || !filled(s.timeZone))) issue('timing', 'Hour-based trips require both local times and a time zone.');
    if (s.durationUnit === 'months' && s.periodMode === 'dates' && start && end) {
      // Calendar months have no fixed number of hours. Only compare at known calendar precision.
      const monthDays = count => {
        if (!Number.isInteger(count)) return null;
        const date = new Date(start.dayMs);
        date.setUTCDate(1);
        date.setUTCMonth(date.getUTCMonth() + count);
        const last = new Date(date.getTime());
        last.setUTCMonth(last.getUTCMonth() + 1);
        last.setUTCDate(0);
        date.setUTCDate(Math.min(start.day, last.getUTCDate()));
        return (date.getTime() - start.dayMs) / 86400000;
      };
      const a = monthDays(low), b = monthDays(high);
      if (a !== null && b !== null && (dateDays < a || dateDays > b)) issue('duration', 'The dates conflict with the supplied calendar-month duration.');
      if (a === null || b === null) reviewRequired.push('Fractional calendar-month duration needs precise clarification for the route.');
    }
    if (s.periodMode === 'months') {
      const a = calendar(s.monthStart, true), b = calendar(s.monthEnd, true);
      if (a && b && factor) {
        const after = new Date(b.dayMs); after.setUTCMonth(after.getUTCMonth() + 1);
        if (low * factor > (after.getTime() - a.dayMs) / 3600000) issue('duration', 'The minimum duration cannot fit inside the declared month window.');
      }
    }
  }
  if (s.travelLimitMode === 'limit') {
    if (!positive(s.travelLimit)) issue('travel', 'Provide a positive each-way travel limit.');
  } else answer('travel', s.travelLimitMode, ['none'], 'Declare a travel limit, no personal limit or unknown.');
  if (!list(s.transport).length || list(s.transport).some(value => !filled(value))) issue('travel', 'Declare acceptable transport modes, or unknown.');
  if (list(s.transport).some(value => /driving|drive|self-drive/i.test(value)) && !['yes', 'confirmed', 'available'].includes(s.drivingStatus) && !uncertain(s.drivingStatus)) issue('travel', 'Declare driving availability, or unknown.');
  if (filled(s.flightSegmentLimit) && s.flightSegmentLimit !== 'none' && !uncertain(s.flightSegmentLimit) && !positive(s.flightSegmentLimit)) issue('travel', 'A supplied flight-segment limit must be positive.');

  if (s.groupKnown === true) {
    const validCounts = integer(s.adults, 100) && integer(s.children, 100) && Number(s.adults) + Number(s.children) >= 1 && Number(s.adults) + Number(s.children) <= 100;
    if (!validCounts) issue('group', 'Provide explicit adult and child integer counts totalling 1-100.');
    require('group', s.groupType, 'Describe the group, or unknown.');
    if (validCounts && s.groupType === 'solo' && Number(s.adults) + Number(s.children) !== 1) issue('group', 'Solo travel must have exactly one person.');
    if (validCounts && s.groupType === 'couple' && (Number(s.adults) !== 2 || Number(s.children) !== 0)) issue('group', 'Couple travel must have two adults and no children.');
    if (validCounts && Number(s.adults) === 0) reviewRequired.push('Check supervision and legal arrangements for travel without adults.');
  } else if (s.groupKnown !== false && !uncertain(s.groupKnown)) issue('group', 'Declare whether the group is known, or not sure.');
  if (s.groupKnown === true && Number(s.children) > 0) {
    answer('group', s.youngChildrenStatus, ['yes', 'no'], 'Declare whether young children are travelling, or unknown.');
    if (s.youngChildrenStatus === 'yes') reviewRequired.push('Young children: check age-appropriate pace, rest, malaria, medical infrastructure and flight-segment logistics.');
  }
  require('physical-intensity', s.physicalIntensity, 'Declare desired physical intensity, or unknown.');

  const essential = list(s.essentialNeeds);
  for (const { id } of screeningQuestions) {
    const status = s.tripScreening?.[id];
    answer(`screening-${id}`, status, ['yes', 'no'], `Answer ${id} screening with yes, no, unknown or private.`);
    if (status === 'yes') {
      const matching = essential.filter(need => need?.type === id);
      if (!matching.length || matching.some(need => !filled(need.text))) issue(`screening-${id}`, 'A yes answer requires at least one practical essential requirement of the same type with nonempty text.');
      if (matching.some(need => need.essential === false || need.flexible === true || need.strength === 'prefer')) issue(`screening-${id}`, 'Essential requirements cannot be flexible preferences.');
    }
    if (uncertain(status)) {
      uncertainties.push(`${id} screening is ${status}; it is not a negative answer.`);
      reviewRequired.push(`Check ${id} compatibility conservatively; screening remains ${status}.`);
    }
  }
  for (const need of essential) {
    if (!need) continue;
    reviewRequired.push(`Verify essential ${need.type || 'legacy'} requirement: ${need.text || 'saved details pending'}.`);
    if (need.type === 'food') for (const key of ['requirementKind', 'crossContact', 'severity']) {
      if (!filled(need[key]) || uncertain(need[key])) uncertainties.push(`Food requirement ${need.id || need.text || 'record'}: ${key} is ${need[key] || 'unknown'}; do not infer mild severity or safe exposure.`);
    }
  }

  const hasBudget = ['amount', 'range'].includes(s.budgetMode);
  if (hasBudget) {
    if (!positive(s.budgetMin) || s.budgetMode === 'range' && (!positive(s.budgetMax) || Number(s.budgetMax) < Number(s.budgetMin))) issue('budget', 'Provide a positive budget amount or ordered range.');
    if (!/^[A-Z]{3}$/.test(s.budgetCurrency) && !uncertain(s.budgetCurrency)) issue('budget', 'Declare the original currency, or unknown.');
    answer('budget', s.budgetScope, ['person', 'group'], 'Declare per-person or group budget scope, or unknown.');
    if (filled(s.budgetMarginAmount) && !uncertain(s.budgetMarginAmount) && !(positive(s.budgetMarginAmount) || String(s.budgetMarginAmount) === '0')) issue('budget', 'Any spending margin must be explicit and numeric.');
    const conversion = s.eurConversion || {};
    if (s.budgetCurrency !== 'EUR' && ['rate', 'source', 'date'].some(key => filled(conversion[key])) && (!positive(conversion.rate) || !filled(conversion.source) || uncertain(conversion.source) || !calendar(conversion.date) || calendar(conversion.date).hasTime)) uncertainties.push('Supplied EUR conversion is incomplete or invalid; no conversion is inferred.');
    answer('includes', s.flightsBudget, ['included', 'excluded', 'none'], 'Declare flight budget coverage, or pending.');
    if (s.budgetCoverageConfirmed !== 'yes' && s.budgetCoverageConfirmed !== true) issue('includes', 'Explicitly confirm which costs are inside and outside the amount.');
    if (list(s.budgetIncludes).some(cost => list(s.budgetExcluded).includes(cost))) issue('includes', 'A cost cannot be both included and excluded.');
  } else answer('budget', s.budgetMode, [], 'Declare a budget amount, range or unknown.');
  reviewRequired.push('EUR conversion and its source require external checking before applying budget bands.');
  if (s.budgetScope === 'group') reviewRequired.push('Group budget band policy needs review; no per-person allocation is inferred.');

  answer('exclusions', s.exclusionsStatus, ['yes', 'none'], 'Declare additional exclusions, none, unknown or pending.');
  if (s.exclusionsStatus === 'yes' && (!list(s.exclusions).length || list(s.exclusions).some(record => !filled(record?.text)))) issue('exclusions', 'A yes answer requires nonempty text for each exclusion.');
  for (const exclusion of list(s.exclusions)) {
    if (!['firm', 'prefer'].includes(exclusion?.strength)) issue('exclusions', 'Choose firm or prefer for each exclusion.');
    if (filled(exclusion?.text)) reviewRequired.push(`Respect ${exclusion.strength || 'saved'} exclusion: ${exclusion.text}.`);
  }
  for (const id of list(s.needs)) if (!filled(s.needDetails?.[id]?.text)) issue('needs', `Provide practical text for your selected ${id} note.`);
  for (const [id, detail] of Object.entries(s.needDetails || {})) {
    if (detail?.essential || ['firm', 'verify'].includes(detail?.type)) reviewRequired.push(`Respect saved ${id} constraint without a flexibility margin: ${detail.text || 'details pending'}.`);
  }

  const uncertaintyFields = ['presentationName', 'interestStatus', 'interestPriority', 'autonomy', 'comfort', 'bestTripsStatus',
    'personalStatementStatus', 'offPathComfort', 'accommodationPreference', 'motivationPriority', 'pace', 'travelExperience',
    'historyStatus', 'historyCompleteness', 'occasionStatus', 'originMode', 'periodMode', 'durationMode', 'travelLimitMode',
    'groupType', 'youngChildrenStatus', 'budgetMode', 'budgetCurrency', 'budgetScope', 'flightsBudget', 'exclusionsStatus', 'physicalIntensity', 'drivingStatus',
    'personalStatement', 'firstTripAspiration', 'occasionType', 'history', 'originCity', 'originCountry', 'autonomyDetails', 'comfortMinimums', 'challengeLimits'];
  for (const key of uncertaintyFields) if (uncertain(s[key])) uncertainties.push(`${key}: ${s[key]}.`);
  for (const key of ['interests', 'motivations', 'challengePreferences', 'transport']) for (const value of list(s[key])) if (uncertain(value)) uncertainties.push(`${key}: ${value}.`);
  if (s.groupKnown === false || uncertain(s.groupKnown)) {
    uncertainties.push('Group composition is unknown; do not assume solo travel or participant counts.');
    uncertainties.push('Young children applicability is unspecified while the group is unknown.');
  }
  if (!filled(s.historyScope)) uncertainties.push('Travel history scope is unspecified; novelty is not verified.');
  if (s.interestStatus === 'skipped' && !interests.length) uncertainties.push('Interests were explicitly left unknown.');
  if (uncertainties.length) reviewRequired.push('Work around declared uncertainties; do not claim unknown constraints, eligibility or compatibility are verified.');
  return { ready: issues.length === 0, issues, uncertainties: [...new Set(uncertainties)], recommendationVerified: false, reviewRequired: [...new Set(reviewRequired)] };
}

export function validateDecision(state = {}, id) {
  if (id === 'challengePreferences') id = 'challenge';
  if (id === 'duration' && state.periodMode === 'dates') return '';
  return captureValidation(state).issues.find(issue => issue.decision === id)?.message || '';
}

export function validateCapture(state = {}) {
  return captureValidation(state);
}
