import { captureDefaults, validateCapture, captureSnapshot, budgetReference, CAPTURE_VERSION, POLICY_VERSION } from './capture.js';
import { revealTemplate } from './reveal-template.js';

export const scenes = [
  { id: 'food', title: 'Taste a Place', description: 'Discover regional ingredients, dishes and the stories behind them.', image: './assets/scenes/taste_a_place.jpeg' },
  { id: 'stories', title: 'Understand Its Stories', description: 'Explore history, heritage and the ways people live.', image: './assets/scenes/Understand_Its _Stories.jpeg' },
  { id: 'urban', title: 'Find Your Urban Rhythm', description: 'Discover neighbourhoods, architecture and everyday city life.', image: './assets/scenes/Urban_Rhythm.jpeg' },
  { id: 'nature', title: 'Be Close to Nature', description: 'Spend time with landscapes, ecosystems and wildlife in their natural setting.', image: './assets/scenes/Be_Close_to_Nature.jpeg' },
  { id: 'water', title: 'Spend Time by the Water', description: 'Enjoy coasts, lakes or rivers in a way that suits you.', image: './assets/scenes/Spend_Time_Water.jpeg' },
  { id: 'challenge', title: 'Take On a Challenge', description: 'Try a demanding experience or learn a skill that stretches you.', image: './assets/scenes/Take_On_a_Challenge.jpeg' },
  { id: 'connection', title: 'Make a Human Connection', description: 'Share conversations, encounters or activities with other people.', image: './assets/scenes/Make_a_Human_Connection.jpeg' },
  { id: 'creative', title: 'Create and Discover', description: 'Explore art, crafts and creative experiences.', image: './assets/scenes/create_and_discover.jpeg' },
  { id: 'energy', title: 'Enjoy the Energy', description: 'Experience music, performances, celebrations and entertainment.', image: './assets/scenes/enjoy_the_energy.jpeg' },
  { id: 'surroundings', title: 'Enjoy Your Surroundings', description: 'Enjoy your accommodation, its spaces and small pleasures without needing a full agenda.', image: './assets/scenes/Enjoy_Your_Surroundings.jpeg' },
];

export const options = {
  autonomy: [
    'With a clear plan and arrangements taken care of.',
    'With a few things arranged and room to improvise.',
    'Mostly freely, deciding as I go.',
    'It depends on the experience.',
  ],
  comfort: [
    'Comfort and convenience are an important part of my enjoyment.',
    'I enjoy simple places, provided my essential needs are met.',
    'I can accept some discomfort for an experience that matters to me.',
    "It depends; I'd rather specify what I need.",
  ],
  motivations: [
    'Rest and a slower pace.',
    "Quality time with the people I'm travelling with.",
    'New places or experiences.',
    'Learning and understanding a place.',
    'Flavours, activities and small pleasures.',
    'A challenge.',
    'Space for myself.',
    'A special celebration.',
    "I'm not sure yet.",
  ],
  pace: [
    'Plenty of free time, with an occasional experience.',
    'One main activity a day, without filling the schedule.',
    'Active days with several things to discover.',
    'A mix of relaxed and busy days.',
    "I'm not sure yet.",
  ],
  food: ['Tasting', 'Cooking or learning', 'Meeting people through food', 'A mix'],
  novelty: [
    'Only new destinations.',
    'New regions in countries I already know.',
    'Returning is fine if the experience is different.',
  ],
};

export const categories = [
  { name: 'The Pioneer', description: 'You are drawn to discoveries that broaden your view: a place, an experience or a different way to see somewhere familiar.', interest: null },
  { name: 'The Edge Walker', description: 'A meaningful challenge can be part of what makes a trip memorable for you, whether it asks you to move, learn or try something unfamiliar.', interest: 'challenge' },
  { name: 'The Quiet Seeker', description: 'You value time to settle into a place, notice its details and enjoy experiences without rushing through them.', interest: null },
  { name: 'The Connector', description: 'Encounters and shared experiences help you connect with a place, while leaving room for the balance of company and privacy you enjoy.', interest: 'connection' },
  { name: 'The Deep Diver', description: 'You enjoy going beyond the highlights to understand a place through its stories, ideas, people and practices.', interest: 'stories' },
  { name: 'The Naturalist', description: 'Landscapes, ecosystems and the natural world give you compelling reasons to explore, at the pace and level of comfort that suit you.', interest: 'nature' },
  { name: 'The Epicure', description: 'Food and flavours help you discover a place, from everyday specialities to the experiences you most enjoy around them.', interest: 'food' },
];

export function categoryCandidates(state = {}) {
  if (state.interestStatus !== 'selected') return { automatic: null, choices: [] };
  const declared = categories.filter(category => category.interest !== null && state.interests?.includes(category.interest));
  const priority = declared.filter(category => category.interest === state.interestPriority);
  if (priority.length === 1) return { automatic: priority[0].name, choices: [] };
  return { automatic: null, choices: declared.length >= 2 ? declared.slice(0, 2) : [] };
}

// Defaults describe missing answers, not unlimited resources or consent.
const defaults = {
  mode: null, interests: [], interestStatus: 'skipped', otherInterest: '', interestPriority: '',
  autonomy: '', comfort: '', food: '', memory: '', motivations: [], motivationPriority: '', purposeNote: '', pace: '',
  originMode: '', originCity: '', originCountry: '', alternateOrigin: '', durationMode: 'unknown', durationMin: '', durationMax: '', durationUnit: 'days',
  periodMode: 'unknown', dateStart: '', dateEnd: '', monthStart: '', monthEnd: '', periodFlexibility: '',
  travelLimitMode: 'unknown', travelLimit: '', transport: [], transportNotes: '', groupKnown: false,
  adults: '', children: '', childAges: '', groupNotes: '', budgetMode: 'unknown', budgetMin: '', budgetMax: '',
  budgetScope: '', budgetIncludes: [], budgetFlexibility: '', novelty: '', history: '', historyCompleteness: 'unknown',
  needs: [], needDetails: {}, needsStatus: 'unknown', confirmationVersion: 0, confirmedAt: '',
};

export function buildProfile(state = {}) {
  const s = { ...defaults, ...captureDefaults(), ...state };
  const profile = { preferences: [], trip: [], conditions: [], unknowns: [] };
  const { preferences, trip, conditions, unknowns } = profile;
  const describe = (target, label, value) => {
    if (value !== '' && value != null) target.push(`${label}: ${value}`);
  };

  preferences.push('Selections are declared interests, not evidence of intensity. Unselected interests are unknown or not prioritised, not rejected.');
  if (s.interestStatus === 'selected') {
    for (const id of s.interests) {
      const scene = scenes.find(item => item.id === id);
      preferences.push(`Declared habitual interest: ${scene ? `${scene.title}. ${scene.description}` : id}`);
    }
    if (!s.interests.length && !s.otherInterest) unknowns.push('Habitual interests: no interests provided.');
  } else unknowns.push(`Habitual interests: ${s.interestStatus === 'unsure' ? 'not sure yet' : 'skipped'}.`);
  if (s.otherInterest) preferences.push(`Other habitual interest (raw declaration): ${s.otherInterest}`);
  if (s.interestPriority === 'equal') preferences.push('Habitual interest priority: selected interests matter equally.');
  else if (s.interestStatus === 'selected' && s.interests.includes(s.interestPriority)) {
    describe(preferences, 'Explicit habitual interest priority', scenes.find(scene => scene.id === s.interestPriority)?.title ?? s.interestPriority);
  } else if (s.interestPriority === 'other' && s.otherInterest) {
    preferences.push(`Explicit habitual interest priority: other interest (${s.otherInterest})`);
  } else unknowns.push('Comparative habitual interest priority: unknown; a single selection does not establish high intensity.');
  describe(preferences, 'Habitual autonomy', s.autonomy);
  describe(preferences, 'Habitual comfort', s.comfort);
  if (s.food) describe(preferences, 'Food interest nuance', s.food);
  if (s.memory) {
    preferences.push(`Optional memory (raw text; interpretation unconfirmed): ${s.memory}`);
    unknowns.push('Memory interpretation: unconfirmed; no preferences or exclusions have been extracted. Potential essential restrictions require clarification or precaution.');
  }
  unknowns.push('Habitual pace, physical capacity and risk tolerance: not established by interests, off-path preference or desired intensity.');

  describe(trip, 'Request mode', s.mode === 'inspiration' ? 'inspiration' : s.mode === 'trip' ? 'a trip in mind' : '');
  if (s.motivations.length) trip.push(`Current trip motivations: ${s.motivations.join(' / ')}`);
  if (!s.motivations.length || s.motivations.includes("I'm not sure yet.")) unknowns.push('Current trip motivation: unknown or not sure yet.');
  if (s.motivationPriority && s.motivations.includes(s.motivationPriority) && s.motivationPriority !== "I'm not sure yet.") {
    describe(trip, 'Explicit current motivation priority', s.motivationPriority);
  } else unknowns.push('Current motivation priority: not declared.');
  if (s.purposeNote) describe(trip, 'Other trip purpose (raw declaration)', s.purposeNote);
  describe(trip, 'Current trip pace (agenda load, not physical capacity)', s.pace);
  if (s.pace === "I'm not sure yet.") unknowns.push('Current trip pace: not sure yet.');
  describe(trip, 'Novelty / repetition scope for this trip', s.novelty);
  if (s.history) trip.push(`Travel history (raw; ${s.historyCompleteness} completeness): ${s.history}`);
  if (!s.history || s.historyCompleteness !== 'complete') unknowns.push('Travel history is missing, partial or of unknown completeness; absence from it does not prove a destination is new.');
  unknowns.push('Whether a destination is already on the traveller\'s radar: unknown until feedback.');

   if (s.originMode === 'unknown') unknowns.push('Starting point: explicitly unknown; route, travel burden and departure costs remain open assumptions.');
   else {
     describe(conditions, 'Starting city', s.originCity);
     describe(conditions, 'Starting country', s.originCountry);
     if (!s.originCity || !s.originCountry) unknowns.push('Starting point: unknown; route and departure costs remain pending.');
     if (s.alternateOrigin) describe(conditions, 'Alternative starting point', s.alternateOrigin);
   }
  if (s.durationMode === 'exact') describe(conditions, `Exact full trip duration (${s.durationUnit}; firm, includes both directions)`, s.durationMin);
  else if (s.durationMode === 'range') {
    describe(conditions, `Minimum full trip duration (${s.durationUnit})`, s.durationMin);
    describe(conditions, `Maximum full trip duration (${s.durationUnit}; firm)`, s.durationMax);
    conditions.push('Duration range: state the time each proposal needs; do not assume the upper end is always available.');
  } else if (s.periodMode === 'dates' && s.dateStart && s.dateEnd) {
    conditions.push('Full trip duration is defined by the departure / return window at the starting point. Calculate elapsed time using its actual time zone; no separate duration is assumed.');
  } else unknowns.push('Full trip duration: unknown, not unlimited.');
  if (s.periodMode === 'dates') {
    describe(conditions, 'Travel start date (firm by default)', s.dateStart);
    describe(conditions, 'Travel end date (firm by default)', s.dateEnd);
  } else if (s.periodMode === 'months') {
    describe(conditions, 'Travel window start month (firm by default)', s.monthStart);
    describe(conditions, 'Travel window end month (firm by default)', s.monthEnd);
  } else unknowns.push('Travel period: unknown; season, prices and availability remain pending.');
  if (s.periodFlexibility) describe(conditions, 'Explicit period flexibility (only the stated margin)', s.periodFlexibility);
  if (s.travelLimitMode === 'limit') describe(conditions, 'Maximum hours each way (firm; connections and transfers included)', s.travelLimit);
  else if (s.travelLimitMode === 'none') conditions.push('No specific personal limit each way; total duration and usable time still constrain travel.');
  else unknowns.push('Maximum travel time each way: unknown, not unlimited.');
  if (s.transport.length) conditions.push(`Acceptable transport declared: ${s.transport.join(' / ')}`);
  else unknowns.push('Acceptable transport: unknown; do not assume flights or driving ability.');
  if (s.transportNotes) describe(conditions, 'Transport conditions (raw declaration)', s.transportNotes);

  if (s.groupKnown === true) {
    describe(trip, 'Adults in the group', s.adults);
    describe(trip, 'Children in the group', s.children);
    if (s.childAges) describe(trip, 'Child ages / ranges', s.childAges);
    else if (s.children !== '0') unknowns.push('Child ages: unknown where relevant.');
  } else unknowns.push('Group composition: unknown; do not assume solo travel or a group size.');
  if (s.groupNotes) trip.push(`Group preferences / needs (indirect report by respondent): ${s.groupNotes}`);
  trip.push('Personal preferences belong to the respondent; companion information is indirect and does not establish individual companion profiles.');

  if (s.budgetMode === 'amount' || s.budgetMode === 'range') {
    const currency = s.budgetCurrency || 'currency unknown';
    if (s.budgetScope === 'person' || s.budgetScope === 'group') conditions.push(`Budget scope: ${currency} ${s.budgetScope === 'person' ? 'per person' : 'for the whole group'}; do not interchange these scopes.`);
    else unknowns.push('Budget scope: unknown; clarify per person versus whole group before estimating affordability.');
    if (!s.budgetCurrency) unknowns.push('Budget currency: unknown; do not assume USD or EUR.');
    if (s.budgetMode === 'amount') describe(conditions, `Budget upper cap (${currency}; firm by default, not required spending)`, s.budgetMin);
    else {
      describe(conditions, `Budget target range lower end (${currency}; not required spending)`, s.budgetMin);
      describe(conditions, `Budget target range upper cap (${currency}; firm by default, not required spending)`, s.budgetMax);
    }
    if (s.budgetIncludes.length) conditions.push(`Budget includes: ${s.budgetIncludes.join(' / ')}`);
    else unknowns.push('Budget components: unknown; clarify what the cap covers before claiming affordability.');
    if (s.budgetFlexibility) describe(conditions, 'Explicit budget flexibility (only the stated margin)', s.budgetFlexibility);
  } else unknowns.push('Budget: unknown, not unlimited; costs and affordability remain pending.');

  unknowns.push('Entry and transit eligibility: unresolved until actual route and usable documents are known later; no documents are collected in this questionnaire.');

  if (s.needsStatus === 'none') conditions.push('Nothing to add for now: not blanket acceptance of every activity or condition.');
  else if (s.needsStatus === 'unknown') unknowns.push('Functional needs / restrictions: unknown, not absence of restrictions.');
  if (s.needsStatus === 'specified' && !s.needs.length) unknowns.push('Needs marked specified but no need selected: clarification required.');
  for (const id of s.needs) {
    const detail = s.needDetails[id] ?? {};
    const type = detail.essential && detail.type === 'flexible' ? 'essential need; requires verification (cannot be flexible)' : detail.type === 'flexible' ? 'flexible preference' : detail.type === 'verify' ? 'requires verification' : 'firm restriction';
    const scope = detail.affected || (detail.scope === 'me' ? 'respondent' : detail.scope === 'group' ? 'whole group (indirect report)' : detail.scope === 'participant' ? 'specific anonymous participant (indirect report)' : 'scope unknown');
    const margin = detail.type === 'flexible' && !detail.essential && detail.margin
      ? `explicit margin: ${detail.margin}`
      : detail.margin ? 'legacy margin ignored for firm, verification or essential restriction' : 'no flexibility margin declared';
    conditions.push(`Need ${id}: ${detail.text || 'details not provided'}; ${type}; applies to ${scope}; ${margin}.`);
    if (!detail.text) unknowns.push(`Need ${id}: practical detail remains pending; clarify before claiming compatibility.`);
  }
  if (s.needs.length && s.needsStatus !== 'specified') unknowns.push('Needs status conflicts with supplied needs; preserve the restrictions and clarify.');
  if (s.confirmationVersion > 0 && s.confirmedAt) trip.push(`Snapshot confirmation: version ${s.confirmationVersion}, recorded at ${s.confirmedAt}; memory interpretations remain unconfirmed.`);
  else unknowns.push('Profile snapshot confirmation: not recorded.');

  const readable = value => Array.isArray(value) ? value.map(readable).join(' / ') || 'none supplied'
    : value && typeof value === 'object' ? Object.entries(value).map(([key, item]) => `${key}: ${readable(item)}`).join('; ')
      : value === true ? 'yes' : value === false ? 'no' : value === '' || value == null ? 'unknown' : String(value);
  for (const [label, key] of [
    ['Presentation name / alias', 'presentationName'], ['Declared group type', 'groupType'],
    ['Group needs checked', 'groupChecked'], ['Minor supervision', 'supervision'],
    ['Best trips status', 'bestTripsStatus'], ['First-trip aspiration (raw declaration)', 'firstTripAspiration'],
    ['Travel experience (declared)', 'travelExperience'], ['History status', 'historyStatus'],
    ['History scope', 'historyScope'], ['No-repeat policy acknowledged', 'historyPolicyAcknowledged'],
    ['Occasion status', 'occasionStatus'], ['Occasion type', 'occasionType'], ['Occasion date', 'occasionDate'],
    ['Occasion wishes (raw declaration)', 'occasionWishes'], ['Young children status', 'youngChildrenStatus'], ['Young children routine', 'youngChildrenRoutine'],
  ]) describe(trip, label, s[key] === '' || s[key] == null ? '' : readable(s[key]));
  for (const [label, key] of [
    ['Personal statement status', 'personalStatementStatus'], ['Off-path comfort (1-5; not risk consent)', 'offPathComfort'],
    ['Situational autonomy details', 'autonomyDetails'], ['Comfort minimums', 'comfortMinimums'],
    ['Welcomed challenges', 'challengePreferences'], ['Challenge limits', 'challengeLimits'],
    ['Accommodation preference', 'accommodationPreference'], ['Other accommodation preference', 'accommodationOther'],
    ['Accommodation minimums', 'accommodationMinimums'], ['Desired physical intensity (not capacity)', 'physicalIntensity'],
  ]) describe(preferences, label, s[key] === '' || s[key] == null ? '' : readable(s[key]));
  if (s.personalStatementStatus !== 'unknown') describe(preferences, 'Personal statement (raw declaration)', s.personalStatement);
  for (const [label, key] of [
    ['Driving status', 'drivingStatus'], ['Origin time zone', 'timeZone'], ['Flight segment limit (not total each way)', 'flightSegmentLimit'],
    ['Captured budget currency', 'budgetCurrency'], ['Flights budget treatment', 'flightsBudget'],
    ['Budget excluded components', 'budgetExcluded'], ['Budget coverage confirmed', 'budgetCoverageConfirmed'],
    ['Bounded budget margin amount (captured currency)', 'budgetMarginAmount'], ['Captured EUR conversion (requires external verification)', 'eurConversion'],
    ['Additional exclusions status', 'exclusionsStatus'],
  ]) describe(conditions, label, s[key] === '' || s[key] == null ? '' : readable(s[key]));

  for (const account of s.bestTrips ?? []) {
    trip.push(`Best trip ${readable(account.id)} (raw declaration): place: ${readable(account.place)}; favourite moment: ${readable(account.moment)}; why it mattered: ${readable(account.reason)}.`);
  }
  conditions.push(`Trip functional screening: ${['food', 'mobility', 'altitude', 'health', 'access', 'pregnancy'].map(key => `${key}: ${readable(s.tripScreening?.[key])}`).join('; ')}. Answered unknown/private means an open assumption, not no or a missing answer.`);
  for (const exclusion of s.exclusions ?? []) {
    conditions.push(`Exclusion ${readable(exclusion.id)}: ${readable(exclusion.text)}; scope: ${readable(exclusion.scope)}; affected: ${readable(exclusion.affected)}; strength: ${readable(exclusion.strength)}; clarification: ${readable(exclusion.clarification)}.`);
  }
  for (const need of s.essentialNeeds ?? []) {
    // Only the functional contract is rendered; extra clinical/identity properties are not repeated.
    conditions.push(`Essential need ${readable(need.id)} (${readable(need.type)}): ${readable(need.text)}${need.affected ? `; affected: ${readable(need.affected)}` : ''}; cannot be waived by a flexibility margin.`);
    for (const key of ['requirementKind', 'crossContact', 'severity', 'medicalAccess', 'reviewStatus']) {
      if (need[key]) describe(conditions, `Need ${readable(need.id)} optional ${key} (not verified)`, readable(need[key]));
    }
  }
  const readiness = validateCapture(state);
  trip.push(`Capture readiness: ${readiness.ready ? 'mandatory answers supplied; open points permitted' : 'mandatory answers missing or invalid'}; recommendation verified: false.`);
  for (const issue of readiness.issues) unknowns.push(`Readiness issue [${issue.decision}]: ${issue.message}`);
  for (const uncertainty of readiness.uncertainties) unknowns.push(`Open assumption: ${readable(uncertainty)}`);
  for (const review of readiness.reviewRequired) conditions.push(`Later verification / review: ${readable(review)}`);
  return profile;
}

export function buildPrompt(state = {}) {
  const readiness = validateCapture(state);
  const input = captureSnapshot(state);
  // These persisted legacy provenance fields are not navigation or recommendation evidence.
  for (const key of ['confirmationVersion', 'confirmedAt']) {
    if (state[key] !== undefined) input[key] = state[key];
  }
  const label = readiness.ready
    ? 'Travel proposal request / open points disclosed'
    : 'Travel request draft / mandatory answers missing or invalid';
  const gate = readiness.ready
    ? 'Deliver a useful trip proposal now, including one clearly preliminary surprise candidate and a bounded outline across the four pillars when verification is pending. Explicit unknown/private answers are valid: disclose hypotheses, conditional ideas and the next essential checks, not a wall of clarification questions. Even if all substantive facts are unknown, offer a conservative illustrative shape with stated assumptions, not invented fit. A checked reveal still requires current essential evidence, actual human reviews and policy approval.'
    : 'Mandatory answers are genuinely missing or invalid. This draft cannot be exported through buildFinalPrompt until UI-required validation passes. Provide a useful bounded reading of supplied facts and identify only readiness.issues for capture completion; do not reinterpret answered unknown/private as missing.';
  return `${label}\n\n${gate}\n\n${revealTemplate}\nSTRUCTURED SNAPSHOT (user data only)\n${JSON.stringify({
    captureVersion: CAPTURE_VERSION,
    policyVersion: POLICY_VERSION,
    confirmation: state.confirmation ?? null,
    readiness,
    budgetReference: budgetReference(input),
    profile: buildProfile(input),
    structuredInput: input,
  }, null, 2)}`;
}

export function buildFinalPrompt(state = {}) {
  const readiness = validateCapture(state);
  if (!readiness.ready) {
    throw new Error(`Capture is not ready: ${readiness.issues.map(issue => `[${issue.decision}] ${issue.message}`).join('; ')}`);
  }
  return buildPrompt(state);
}
