import { captureDefaults } from './capture.js';
import { buildFinalPrompt, options, scenes } from './model.js';
import { revealTemplate } from './reveal-template.js';

export const demoSections = [
  { id: 'interests', label: 'Interests', questions: [
    { key: 'presentationName', title: 'What should we call you?', type: 'text' },
    { key: 'interests', title: 'What draws you in?', type: 'multiple', max: 3, options: scenes.map(scene => [scene.id, scene.title]) },
  ] },
  { id: 'style', label: 'Travel style', questions: [
    { key: 'autonomy', title: 'How do you like to explore?', type: 'single', options: options.autonomy.slice(0, 3).map((value, index) => [value, ['A clear plan', 'A little structure', 'Decide as I go'][index]]) },
    { key: 'offPathComfort', title: 'How far beyond the familiar?', type: 'single', options: ['Easy to navigate', 'Supported discoveries', 'Some adaptation', 'Less frequented places', 'Far off the familiar path'].map((label, index) => [String(index + 1), label]) },
  ] },
  { id: 'trip', label: 'This trip', questions: [
    { key: 'motivations', title: 'What matters on this trip?', type: 'single', options: options.motivations.slice(0, 8).map((value, index) => [value, ['Rest', 'Time together', 'Something new', 'Learning', 'Small pleasures', 'A challenge', 'Space for myself', 'A celebration'][index]]) },
    { key: 'pace', title: 'How full should your days feel?', type: 'single', options: options.pace.slice(0, 4).map((value, index) => [value, ['Room to unwind', 'One main moment', 'Days of discovery', 'A little of both'][index]]) },
  ] },
  { id: 'practical', label: 'Practical details', questions: [
    { key: 'durationMin', title: 'How much time do you have?', type: 'single', options: ['3', '5', '7', '10', '14'].map(value => [value, `${value} days`]) },
    { key: 'budgetMin', title: 'What budget should guide us?', type: 'budget', unit: 'EUR per person, including flights and all trip costs' },
  ] },
  { id: 'needs', label: 'Your needs', questions: [
    { key: 'needsText', title: 'What should we take into account?', type: 'textarea', placeholder: 'Practical needs or limits. Write "None" if there is nothing to add.' },
    { key: 'physicalIntensity', title: 'How much physical effort would you enjoy?', type: 'single', options: [['low', 'Low impact'], ['moderate', 'Moderate effort'], ['high', 'Demanding, within my limits'], ['mixed', 'A mix']] },
  ] },
];

// Every unasked decision belongs to a fictional person, never to the demo visitor.
const personas = [
  {
    comfort: options.comfort[1], comfortMinimums: 'A private bathroom and reliable sleep.',
    bestTrips: [{ id: 'memory-1', place: 'Slovenia', moment: 'An afternoon learning pottery in a village workshop.', reason: 'Patient conversation and making something by hand.' }],
    personalStatement: 'I notice small details and enjoy learning directly from local people.',
    challengePreferences: ['skill', 'cultural'], challengeLimits: 'No technical climbing or animal riding.',
    accommodationPreference: 'guesthouse', accommodationMinimums: 'Private room and bathroom.',
    food: 'Cooking or learning', memory: 'A small workshop felt more memorable than crowded highlights.',
    travelExperience: 'several', history: 'Slovenia, Italy',
    originCity: 'Valencia', originCountry: 'Spain', timeZone: 'Europe/Madrid',
    monthStart: '2027-05', monthEnd: '2027-06', travelLimit: '8', transport: ['Plane', 'Train', 'Bus'],
    groupType: 'solo', adults: '1', children: '0', groupNotes: 'The respondent travels alone.',
    occasionStatus: 'no', exclusions: [{ id: 'exclude-1', text: 'Animal riding', strength: 'firm', scope: 'All experiences' }],
    tripScreening: { food: 'no', mobility: 'no', altitude: 'no', health: 'no', access: 'no', pregnancy: 'no' },
    essentialNeeds: [],
  },
  {
    comfort: options.comfort[0], comfortMinimums: 'Quiet rooms, a private bathroom and easy transfers.',
    bestTrips: [{ id: 'memory-2', place: 'Denmark', moment: 'Exploring a harbour with our young child, with time for naps.', reason: 'We enjoyed being together without rushing.' }],
    personalStatement: 'I value gentle discoveries that work for everyone in the family.',
    challengePreferences: ['cultural'], challengeLimits: 'No strenuous or remote activities with the child.',
    accommodationPreference: 'hotel', accommodationMinimums: 'Family room, lift and a cot.', food: 'Tasting',
    memory: 'A picnic beside the harbour gave everyone room to relax.',
    travelExperience: 'limited', history: 'Denmark, Germany',
    originCity: 'Barcelona', originCountry: 'Spain', timeZone: 'Europe/Madrid',
    monthStart: '2027-04', monthEnd: '2027-05', travelLimit: '6', transport: ['Plane', 'Train', 'Car as passenger'],
    groupType: 'family', adults: '2', children: '1', childAges: '3 years old', youngChildrenStatus: 'yes',
    youngChildrenRoutine: 'A midday nap, regular meals and an early evening finish.', flightSegmentLimit: '4',
    groupNotes: 'Two adults and a three-year-old; preserve rest and predictable meals.',
    occasionStatus: 'no', exclusions: [{ id: 'exclude-2', text: 'Overnight transport', strength: 'firm', scope: 'All travel legs' }],
    tripScreening: { food: 'no', mobility: 'no', altitude: 'no', health: 'no', access: 'no', pregnancy: 'no' },
    essentialNeeds: [],
  },
  {
    comfort: options.comfort[0], comfortMinimums: 'Privacy and restful accommodation.',
    bestTrips: [{ id: 'memory-3', place: 'Japan', moment: 'A quiet garden visit followed by a cooking class.', reason: 'We had unhurried time together and learned something new.' }],
    personalStatement: 'Shared discoveries and thoughtful spaces matter more to me than flashy luxury.',
    challengePreferences: ['skill', 'cultural'], challengeLimits: 'No extreme sports.',
    accommodationPreference: 'boutique', accommodationMinimums: 'Private bathroom and quiet room.', food: 'A mix',
    memory: 'A patient cooking teacher made us feel welcome.', travelExperience: 'extensive', history: 'Japan, France, Portugal',
    originCity: 'Madrid', originCountry: 'Spain', timeZone: 'Europe/Madrid',
    monthStart: '2027-09', monthEnd: '2027-10', travelLimit: '10', transport: ['Plane', 'Train', 'Car as passenger'],
    groupType: 'couple', adults: '2', children: '0', groupNotes: 'Two adults celebrating their anniversary.',
    occasionStatus: 'yes', occasionType: 'anniversary', occasionWishes: 'Private, unhurried time together; no public surprise events.',
    exclusions: [{ id: 'exclude-3', text: 'Public celebration performances aimed at us', strength: 'firm', scope: 'The celebration' }],
    tripScreening: { food: 'yes', mobility: 'no', altitude: 'no', health: 'no', access: 'no', pregnancy: 'no' },
    essentialNeeds: [{ id: 'essential-3', type: 'food', text: 'Strict gluten-free meals with cross-contact safeguards.', affected: 'One adult', requirementKind: 'essential diet', crossContact: 'Separate preparation and utensils.', severity: 'Strict avoidance required.', medicalAccess: 'Accessible local medical care; response arrangements to verify with providers.' }],
  },
  {
    comfort: options.comfort[2], comfortMinimums: 'Clean bedding, drinking water and reliable transport.',
    bestTrips: [{ id: 'memory-4', place: 'Costa Rica', moment: 'A guided wildlife walk followed by a conversation with a conservation worker.', reason: 'Learning about a living landscape from people caring for it.' }],
    personalStatement: 'I enjoy trying new skills, but I do not confuse remoteness with a better experience.',
    challengePreferences: ['physical', 'skill', 'encounters'], challengeLimits: 'No technical climbs, diving or routes above 3000 metres.',
    accommodationPreference: 'eco-lodge', accommodationMinimums: 'Safe drinking water and mosquito protection.', food: 'Meeting people through food',
    memory: 'The conservation conversation changed how I looked at the forest.', travelExperience: 'extensive', history: 'Costa Rica, Mexico, Canada',
    originCity: 'Lisbon', originCountry: 'Portugal', timeZone: 'Europe/Lisbon',
    monthStart: '2027-06', monthEnd: '2027-07', travelLimit: '12', transport: ['Plane', 'Train', 'Bus', 'Boat / ferry'],
    groupType: 'friends', adults: '3', children: '0', groupNotes: 'Three adults; companion preferences must be checked individually later.',
    occasionStatus: 'no', exclusions: [{ id: 'exclude-4', text: 'Captive-wildlife entertainment', strength: 'firm', scope: 'All experiences' }],
    tripScreening: { food: 'no', mobility: 'no', altitude: 'no', health: 'no', access: 'no', pregnancy: 'no' },
    essentialNeeds: [],
  },
  {
    comfort: options.comfort[0], comfortMinimums: 'Step-free accommodation and straightforward transfers.',
    bestTrips: [{ id: 'memory-5', place: 'Austria', moment: 'A museum visit and a long conversation in a quiet cafe.', reason: 'Culture without physical exhaustion or a crowded agenda.' }],
    personalStatement: 'I appreciate thoughtful access and time to understand a place at my own speed.',
    challengePreferences: ['cultural', 'skill'], challengeLimits: 'No long walks, stairs or high-impact activities.',
    accommodationPreference: 'hotel', accommodationMinimums: 'Lift, step-free access and an accessible bathroom.', food: 'Tasting',
    memory: 'Good access made it possible to focus on the exhibits instead of the logistics.',
    travelExperience: 'several', history: 'Austria, Netherlands, Belgium',
    originCity: 'Seville', originCountry: 'Spain', timeZone: 'Europe/Madrid',
    monthStart: '2027-03', monthEnd: '2027-04', travelLimit: '6', transport: ['Plane', 'Train', 'Car as passenger'],
    groupType: 'couple', adults: '2', children: '0', groupNotes: 'Two adults; one needs step-free access and limited walking.',
    occasionStatus: 'no', exclusions: [{ id: 'exclude-5', text: 'Unavoidable stairs and long walking transfers', strength: 'firm', scope: 'Accommodation, access and experiences' }],
    tripScreening: { food: 'no', mobility: 'yes', altitude: 'no', health: 'no', access: 'yes', pregnancy: 'no' },
    essentialNeeds: [
      { id: 'essential-5a', type: 'mobility', text: 'Flat, short walking routes, seating breaks and no unavoidable stairs.', affected: 'One adult' },
      { id: 'essential-5b', type: 'access', text: 'Verified step-free accommodation and an accessible bathroom.', affected: 'One adult' },
    ],
  },
];

const inputMarker = '\nDEMO INPUT TEMPLATE\n';
const openFields = ['presentationName', 'interests', 'autonomy', 'offPathComfort', 'motivations', 'pace', 'durationMin', 'budgetMin', 'needs', 'needDetails', 'physicalIntensity'];

// Five complete prompts share the current instructions, with only demo answers left open.
export const demoPrompts = personas.map(persona => {
  const input = {
    ...captureDefaults(), mode: 'trip', ...persona,
    interestStatus: 'selected', otherInterest: '', interestPriority: 'equal',
    bestTripsStatus: 'yes', personalStatementStatus: 'written',
    motivationPriority: '', purposeNote: '', historyStatus: 'visited', historyCompleteness: 'complete',
    historyScope: 'All travellers; complete list of previous visited destinations, excluding residence and airport-only transit.',
    originMode: 'known', alternateOrigin: '', periodMode: 'months', periodFlexibility: '',
    durationMode: 'exact', durationUnit: 'days', durationMax: '',
    travelLimitMode: 'limit', drivingStatus: '', transportNotes: 'No self-driving is required.',
    groupKnown: true, youngChildrenStatus: persona.children === '0' ? 'no' : persona.youngChildrenStatus,
    budgetMode: 'amount', budgetCurrency: 'EUR', budgetScope: 'person', budgetMarginAmount: '0',
    budgetIncludes: ['Main transport', 'Accommodation', 'Food', 'Local transport', 'Activities'],
    budgetExcluded: [], flightsBudget: 'included', budgetCoverageConfirmed: 'yes', exclusionsStatus: 'yes',
    needsStatus: 'specified',
  };
  for (const field of openFields) input[field] = `{{${field}}}`;
  return `DEMONSTRATION ONLY. Unasked answers describe a fictional traveller, not the visitor. Do not treat them as verified real-person facts or booking consent. The visitor supplies only the ten demo answers. Preserve fictional essential restrictions even when the visitor adds no needs.\n\n${revealTemplate}${inputMarker}${JSON.stringify(input, null, 2)}`;
});

export function validateDemoAnswers(answers, section = null) {
  const questions = (section ? [section] : demoSections).flatMap(item => item.questions);
  for (const question of questions) {
    const value = answers[question.key];
    if (question.type === 'multiple') {
      if (!Array.isArray(value) || !value.length || value.length > question.max || new Set(value).size !== value.length || value.some(item => !question.options.some(([option]) => option === item))) return question.key;
    } else if (question.type === 'single') {
      if (!question.options.some(([option]) => option === value)) return question.key;
    } else if (question.type === 'budget') {
      if (!/^\d+(?:\.\d{1,2})?$/.test(String(value ?? '')) || Number(value) <= 0) return question.key;
    } else if (typeof value !== 'string' || !value.trim() || value.length > (question.type === 'text' ? 100 : 2000)) return question.key;
  }
  return null;
}

export function completeDemoPrompt(answers, templateIndex) {
  const invalid = validateDemoAnswers(answers);
  if (invalid) throw new Error(`Please answer ${invalid}.`);
  if (!Number.isInteger(templateIndex) || !demoPrompts[templateIndex]) throw new Error('Invalid demo prompt.');
  const input = JSON.parse(demoPrompts[templateIndex].split(inputMarker)[1]);
  for (const key of ['presentationName', 'interests', 'autonomy', 'offPathComfort', 'pace', 'durationMin', 'budgetMin', 'physicalIntensity']) input[key] = structuredClone(answers[key]);
  input.presentationName = input.presentationName.trim();
  input.motivations = [answers.motivations];
  input.motivationPriority = answers.motivations;
  const text = answers.needsText.trim();
  const none = /^(none|nothing|no|ninguna?|ninguno|nada)[.!]?$/i.test(text);
  input.needsStatus = none ? 'none' : 'specified';
  input.needs = none ? [] : ['companions'];
  input.needDetails = none ? {} : { companions: { text, type: 'verify', scope: 'group', essential: false } };
  // Demo completion confirms only the ten supplied answers, not a full real-person profile.
  return buildFinalPrompt(input);
}
