import { scenes, options } from './model.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const list = value => Array.isArray(value) ? value : [];
const filled = value => value !== undefined && value !== null && String(value).trim() !== '';
const hint = value => `<p class="hint">${esc(value)}</p>`;

function field(state, key, label, type = 'text', note = '', value = state[key], attributes = '') {
  return `<label class="field"><span>${esc(label)}</span><input name="${esc(key)}" type="${esc(type)}" value="${esc(value)}" ${type === 'number' ? 'min="0" step="any"' : type === 'text' ? 'maxlength="200"' : ''} ${attributes}>${note ? `<span class="hint">${esc(note)}</span>` : ''}</label>`;
}

function text(state, key, label, note = '') {
  return `<label class="field"><span>${esc(label)}</span><textarea name="${esc(key)}" maxlength="1500" rows="3">${esc(state[key])}</textarea>${note ? `<span class="hint">${esc(note)}</span>` : ''}</label>`;
}

function choices(state, key, label, items, multi = false, chips = false, attributes = '') {
  return `<fieldset><legend>${esc(label)}</legend><div class="choices${chips ? ' chips' : ''}">${items.map(item => {
    const [value, title, description = ''] = Array.isArray(item) ? item : [item, item];
    const checked = key === 'groupKnown' ? state[key] === (value === 'yes') : multi ? list(state[key]).includes(value) : state[key] === value;
    return `<label class="choice"><input type="${multi ? 'checkbox' : 'radio'}" name="${esc(key)}" value="${esc(value)}"${checked ? ' checked' : ''} ${attributes}><span>${esc(title)}${description ? `<span class="hint">${esc(description)}</span>` : ''}</span></label>`;
  }).join('')}</div></fieldset>`;
}

function optional(label, content, open = false) {
  return `<details${open ? ' open' : ''}><summary>${esc(label)}</summary><div class="subpanel">${content}</div></details>`;
}

function durationPicker(state, key, label) {
  const unit = state.durationUnit || 'days';
  const values = { hours: [2, 4, 6, 12, 24], days: [1, 3, 5, 7, 10, 14], weeks: [1, 2, 3, 4, 6], months: [1, 2, 3, 6, 12] }[unit];
  return `<fieldset class="duration-picker" data-count-panel="${key}"><legend>${label}</legend><div class="duration-options">${values.map(value => `<button type="button" data-count-field="${key}" data-count="${value}" aria-label="${value} ${unit} - ${label.toLowerCase()}" aria-pressed="${String(state[key]) === String(value)}"><strong>${value}</strong><span>${unit}</span></button>`).join('')}</div>${optional('Another duration', field(state, key, `${label} - exact quantity`, 'number', `Any positive quantity in ${unit}, including fractions.`, state[key], 'inputmode="decimal"'), filled(state[key]) && !values.includes(Number(state[key])))}</fieldset>`;
}

function budgetBand(state, key, label) {
  const id = key === 'budgetMin' ? 'budget-slider' : 'budget-max-slider';
  const output = key === 'budgetMin' ? 'budget-display' : 'budget-max-display';
  return `<section class="budget-band" data-budget-band="${key}"><div class="budget-control"><label class="field" for="${id}">${label}</label><output id="${output}" for="${id}" aria-live="polite">${filled(state[key]) ? `USD ${esc(Number(state[key]).toLocaleString('en-US'))}` : 'Choose your amount'}</output><input id="${id}" type="range" min="100" max="20000" step="50" value="${esc(state[key] || 100)}" aria-label="${key === 'budgetMin' ? 'Adjust budget in USD' : 'Adjust upper budget in USD'}" data-budget-slider="${key}"></div>${optional(key === 'budgetMin' ? 'Enter an exact amount' : 'Enter an exact upper amount', field(state, key, key === 'budgetMax' ? 'Upper cap (USD)' : state.budgetMode === 'range' ? 'Lower target amount (USD)' : 'Amount (USD)', 'number'), filled(state[key]))}</section>`;
}

function participants(state, key, label) {
  const values = key === 'children' ? [0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5];
  return `<fieldset class="participant-picker" data-count-panel="${key}"><legend>${label}</legend><div class="count-badges">${values.map(value => `<button type="button" class="count-badge" data-count-field="${key}" data-count="${value}" aria-label="${value} ${label.toLowerCase()}" aria-pressed="${String(state[key]) === String(value)}">${value}</button>`).join('')}</div>${optional('Another number', field(state, key, `${label} - exact number`, 'number', 'Use any whole number, including zero.', state[key], 'inputmode="numeric"'), filled(state[key]) && !values.includes(Number(state[key])))}</fieldset>`;
}

const needs = {
  mobility: 'Mobility & physical effort', environment: 'Heights, water & animals', climate: 'Climate',
  crowds: 'Crowds & noise', food: 'Food & dietary needs', accommodation: 'Accommodation & comfort',
  transport: 'Getting around', companions: 'Companion needs',
};
const transport = ['Plane', 'Train', 'Bus', 'Car as passenger', 'Driving myself', 'Boat / ferry', 'Other'];
const costs = ['Main transport', 'Accommodation', 'Food', 'Local transport', 'Activities'];

// Infer the gate only for existing answers, never from model defaults such as units or budget scope.
function contextChoice(state) {
  if (state.contextChoice === 'open' || state.contextChoice === 'add') return state.contextChoice;
  const values = ['originCity', 'originCountry', 'alternateOrigin', 'durationMin', 'durationMax', 'dateStart', 'dateEnd', 'monthStart', 'monthEnd', 'periodFlexibility', 'travelLimit', 'transportNotes', 'adults', 'children', 'childAges', 'groupNotes', 'budgetMin', 'budgetMax', 'budgetFlexibility', 'passports', 'residence', 'permits', 'groupDocuments'];
  const declaredMode = [['durationMode', ['exact', 'range']], ['periodMode', ['dates', 'months']], ['travelLimitMode', ['limit', 'none']], ['budgetMode', ['amount', 'range']], ['documentationMode', ['provided', 'not-needed']]].some(([key, values]) => values.includes(state[key]));
  return values.some(key => filled(state[key])) || declaredMode || state.groupKnown || list(state.transport).length || list(state.budgetIncludes).length ? 'add' : 'open';
}

const practicalVisible = state => state.mode !== 'inspiration' || contextChoice(state) === 'add';
const interestChoices = state => [
  ...scenes.filter(scene => list(state.interests).includes(scene.id)).map(scene => [scene.id, scene.title, scene.description]),
  ...(String(state.otherInterest ?? '').trim() ? [['other', state.otherInterest]] : []),
];
const shortOptions = (values, titles) => values.map((value, index) => [value, titles[index], value]);

export const decisions = [
  {
    id: 'interests', stage: 0, title: 'What draws you in?',
    hint: 'Choose up to three experiences you usually enjoy. Unselected interests are not rejections.',
    visible: () => true,
    render(state) {
      const order = [...new Set([...list(state.sceneOrder), ...scenes.map(scene => scene.id)])];
      const ordered = order.map(id => scenes.find(scene => scene.id === id)).filter(Boolean);
      const count = list(state.interests).length + (String(state.otherInterest ?? '').trim() ? 1 : 0);
      return `<p class="selection-count" role="status">${count} of 3 interests selected</p><fieldset><legend>Experiences you enjoy</legend><div class="scene-grid">${ordered.map(scene => `<label class="scene"><img src="${esc(scene.image)}" alt="" loading="lazy"><div class="scene-body"><span class="scene-title">${esc(scene.title)}<input type="checkbox" name="interests" value="${esc(scene.id)}"${list(state.interests).includes(scene.id) ? ' checked' : ''} aria-label="${esc(`${scene.title}. ${scene.description}`)}"></span><p>${esc(scene.description)}</p></div></label>`).join('')}</div></fieldset>${field(state, 'otherInterest', 'Something else?', 'text', 'Optional. Counts as one of your three interests.')}${choices(state, 'interestStatus', 'Leave this open', [['unsure', 'Not sure yet'], ['skipped', 'Skip for now']], false, true)}`;
    },
  },
  {
    id: 'priority', stage: 0, title: 'Which matters most?',
    hint: 'A priority helps explain the combination. You do not have to choose a favourite.',
    visible: state => interestChoices(state).length > 1,
    render: state => choices(state, 'interestPriority', 'Your strongest influence', [...interestChoices(state), ['equal', 'They matter equally'], ['', 'Skip for now']]),
  },
  {
    id: 'autonomy', stage: 1, title: 'How do you like to explore?',
    hint: 'Your usual preference, not a fixed personality or a statement about risk.', visible: () => true,
    render: state => choices(state, 'autonomy', 'Your way of exploring', [...shortOptions(options.autonomy, ['A clear plan', 'A little structure', 'Decide as I go', 'It depends']), ['', 'Skip for now']]),
  },
  {
    id: 'comfort', stage: 1, title: 'What feels comfortable?',
    hint: 'Comfort is separate from budget. Essential needs can be specified later.', visible: () => true,
    render: state => choices(state, 'comfort', 'Your usual comfort preference', [...shortOptions(options.comfort, ['Comfort & convenience', 'Simple is good', 'Some discomfort is okay', 'I would rather specify']), ['', 'Skip for now']]),
  },
  {
    id: 'food', stage: 1, title: 'How do you enjoy food?',
    hint: 'An optional detail to distinguish the food experiences you enjoy.',
    visible: state => list(state.interests).includes('food'),
    render: state => choices(state, 'food', 'Food experiences', [...options.food, ['', 'Skip for now']], false, true),
  },
  {
    id: 'memory', stage: 1, title: 'A moment worth keeping?',
    hint: 'Optional, with no previous travel required. Your words stay raw and unconfirmed.', visible: () => true,
    render: state => optional('Add a travel memory (optional)', text(state, 'memory', 'A moment to repeat, or something to avoid', 'One sentence is enough. This note is not interpreted as a personality trait or a confirmed restriction.'), filled(state.memory)),
  },
  {
    id: 'motivations', stage: 2, title: 'What matters on this trip?',
    hint: 'Choose up to two. What matters now can differ from your usual interests.', visible: () => true,
    render(state) {
      return `${choices(state, 'motivations', 'What you hope to find', shortOptions(options.motivations, ['Rest', 'Time together', 'Something new', 'Learning', 'Small pleasures', 'A challenge', 'Space for myself', 'A celebration', 'Not sure yet']), true)}${list(state.motivations).length === 2 ? `<div id="motivation-priority">${choices(state, 'motivationPriority', 'Which matters most?', [...state.motivations.map(value => [value, shortOptions(options.motivations, ['Rest', 'Time together', 'Something new', 'Learning', 'Small pleasures', 'A challenge', 'Space for myself', 'A celebration', 'Not sure yet']).find(item => item[0] === value)?.[1] ?? value, value]), ['', 'Equal / skip']], false, true)}</div>` : ''}${optional('Another purpose (optional)', text(state, 'purposeNote', 'Anything else this trip is for?'), filled(state.purposeNote))}`;
    },
  },
  {
    id: 'pace', stage: 2, title: 'How full should your days feel?',
    hint: 'Agenda load, not physical capacity. These are illustrations, not promised itineraries.', visible: () => true,
    render(state) {
      const cards = [
        ['Room to unwind', ['Slow morning', 'An occasional experience', 'Free evening'], [0, 1, 0]],
        ['One main moment', ['Easy morning', 'One main activity', 'Unhurried evening'], [0, 2, 0]],
        ['Days of discovery', ['Morning discovery', 'More to explore', 'An evening experience'], [2, 2, 1]],
        ['A little of both', ['A relaxed day', 'A busier day', 'Room to change pace'], [0, 2, 1]],
      ];
      return `<fieldset><legend>A day that suits this trip</legend><div class="choices columns">${cards.map(([title, labels, blocks], index) => `<label class="choice agenda-card"><input type="radio" name="pace" value="${esc(options.pace[index])}"${state.pace === options.pace[index] ? ' checked' : ''}><span><strong>${esc(title)}</strong><svg viewBox="0 0 240 48" width="240" style="max-width:100%;height:auto" aria-hidden="true" focusable="false"><path d="M12 24H228" stroke="currentColor" fill="none" opacity=".25"/>${blocks.map((block, i) => `<rect x="${16 + i * 76}" y="${block ? 10 : 19}" width="56" height="${block ? 28 : 10}" rx="5" fill="currentColor" opacity="${block ? '.7' : '.15'}"/>`).join('')}</svg><span class="hint">${labels.map(esc).join(' / ')}</span><span class="hint">${esc(options.pace[index])}</span></span></label>`).join('')}</div></fieldset>${choices(state, 'pace', 'Or leave your pace open', [[options.pace[4], 'Not sure yet', options.pace[4]]], false, true)}`;
    },
  },
  {
    id: 'history', stage: 2, title: 'New places or a fresh perspective?',
    hint: 'Only your declared scope is used. A partial list cannot prove a place is new.', visible: () => true,
    render: state => `${choices(state, 'novelty', 'Your discovery preference', [...shortOptions(options.novelty, ['New destinations only', 'New regions, familiar countries', 'Returning differently is fine']), ['', 'Not decided yet']], false, true)}${optional('Places you have visited (optional)', `${text(state, 'history', 'Cities, regions or countries', 'No need to remember every trip. State the scope of your list.')}${choices(state, 'historyCompleteness', 'How complete is this list?', [['unknown', 'Not specified'], ['partial', 'Some of my trips'], ['complete', 'Complete for the scope described']], false, true)}`, filled(state.history))}`,
  },
  {
    id: 'practical-gate', stage: 3, title: 'Keep it open or add context?',
    hint: 'Inspiration can start without dates or a budget. Unknown details are not unlimited resources.',
    visible: state => state.mode === 'inspiration',
    render: state => choices({ contextChoice: contextChoice(state) }, 'contextChoice', 'How much context would you like to add?', [['open', 'Keep it open', 'Continue with inspiration; practical checks remain pending.'], ['add', 'Add a few details', 'Share a starting point, time, group or budget. Anything can stay undecided.']], false, false, 'data-ui="contextChoice"'),
  },
  {
    id: 'origin', stage: 3, title: 'Where would you start?',
    hint: 'Use an approximate city and country, not a home address. Locations are not verified.', visible: practicalVisible,
    render: state => `${field(state, 'originSearch', 'Starting city, country', 'text', 'Enter city, country with an explicit comma, for example: your city, your country. Text without a comma must not be guessed or split.', `${state.originCity ?? ''}${state.originCountry ? `, ${state.originCountry}` : ''}`)}${optional('Another starting point (optional)', field(state, 'alternateOrigin', 'Alternative airport or starting point'), filled(state.alternateOrigin))}`,
  },
  {
    id: 'timing', stage: 3, title: 'When could you travel?',
    hint: 'Departure and return refer to your starting point. No departure time is assumed.', visible: practicalVisible,
    render(state) {
      const time = key => String(state[key] ?? '').match(/T(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)/)?.[1] ?? '';
      const dates = state.periodMode === 'dates' ? `<div class="field-row">${field(state, 'dateStart', 'Departure date', 'date', '', String(state.dateStart ?? '').slice(0, 10))}${field(state, 'dateEnd', 'Return date', 'date', '', String(state.dateEnd ?? '').slice(0, 10))}</div>${hint('This window defines full trip duration, including travel both ways. Existing times must be retained when dates change.')}${optional('Departure and return times (optional)', `<label class="field">Departure time<input type="time" data-date-time="dateStart" value="${esc(time('dateStart'))}" step="any"></label><label class="field">Return time<input type="time" data-date-time="dateEnd" value="${esc(time('dateEnd'))}" step="any"></label>${hint('Times are local to your starting point. Leave blank if unknown; do not assume midnight.')}`, Boolean(time('dateStart') || time('dateEnd')))}` : state.periodMode === 'months' ? `<div class="field-row">${field(state, 'monthStart', 'From month', 'month')}${field(state, 'monthEnd', 'Through month', 'month')}</div>` : '';
      return `${choices(state, 'periodMode', 'Your travel window', [['dates', 'Specific dates'], ['months', 'A window of months'], ['unknown', 'Not decided yet']], false, true)}${dates}${state.periodMode === 'dates' || state.periodMode === 'months' ? optional('Timing flexibility (optional)', field(state, 'periodFlexibility', 'Explicit flexibility', 'text', 'Only the margin you state may be used; dates are firm otherwise.'), filled(state.periodFlexibility)) : ''}`;
    },
  },
  {
    id: 'duration', stage: 3, title: 'How much time do you have?',
    hint: 'Count the whole trip, from leaving your starting point until returning, including both directions.',
    visible: state => practicalVisible(state) && state.periodMode !== 'dates',
    render: state => `${choices(state, 'durationMode', 'Time available', [['unknown', 'Not decided yet'], ['exact', 'Exact duration'], ['range', 'A range']], false, true)}${['exact', 'range'].includes(state.durationMode) ? `${choices(state, 'durationUnit', 'Measured in', ['hours', 'days', 'weeks', 'months'], false, true)}<div class="duration-pickers">${durationPicker(state, 'durationMin', state.durationMode === 'range' ? 'Minimum duration' : 'Duration')}${state.durationMode === 'range' ? durationPicker(state, 'durationMax', 'Maximum duration') : ''}</div>${hint('A range does not mean its upper end is always available. Choose each quantity or enter your own.')}` : ''}`,
  },
  {
    id: 'travel', stage: 3, title: 'How far is comfortable?',
    hint: 'Maximum time each way includes connections and transfers. No limit still needs to fit your full trip.', visible: practicalVisible,
    render: state => `${choices(state, 'travelLimitMode', 'Travel time each way', [['unknown', 'Not decided yet'], ['limit', 'Set an hour limit'], ['none', 'No personal limit']], false, true)}${state.travelLimitMode === 'limit' ? field(state, 'travelLimit', 'Maximum hours each way', 'number') : ''}${optional('Transport preferences (optional)', `${choices(state, 'transport', 'Acceptable ways to travel', transport, true)}${hint('Select only modes you are happy to use. No selection means unknown, not all modes accepted or driving ability.')}${text(state, 'transportNotes', 'Connections, driving or other conditions')}`, list(state.transport).length > 0 || filled(state.transportNotes))}`,
  },
  {
    id: 'group', stage: 3, title: 'Who is travelling?',
    hint: 'Unknown does not mean solo. Your preferences do not automatically represent your companions.', visible: practicalVisible,
    render: state => `${choices(state, 'groupKnown', 'Can you describe the group?', [['yes', 'Add group details'], ['no', 'Not decided yet']], false, true)}${state.groupKnown ? `<div class="participants-grid">${participants(state, 'adults', 'Adults')}${participants(state, 'children', 'Children')}</div>${Number(state.children) > 0 ? field(state, 'childAges', 'Child ages or age ranges', 'text', 'No names or dates of birth.') : ''}${optional('Group preferences (optional)', text(state, 'groupNotes', 'Shared preferences or companion needs', 'Describe everyone or a specific anonymous participant. Companion information is an indirect report.'), filled(state.groupNotes))}` : ''}`,
  },
  {
    id: 'budget', stage: 3, title: 'What budget should guide us?',
    hint: 'Amounts are in USD. An upper amount is a firm cap, not required spending.', visible: practicalVisible,
    render(state) {
      return `${choices(state, 'budgetMode', 'Budget shape', [['amount', 'An amount'], ['range', 'A range'], ['unknown', 'Not decided yet']], false, true)}${['amount', 'range'].includes(state.budgetMode) ? `<div class="budget-bands ${state.budgetMode === 'range' ? 'is-range' : ''}">${budgetBand(state, 'budgetMin', state.budgetMode === 'range' ? 'Lower target amount in USD' : 'Budget amount in USD')}${state.budgetMode === 'range' ? budgetBand(state, 'budgetMax', 'Upper cap in USD') : ''}</div>${hint('Move each band or enter any exact value. No amount is assumed until you choose. The upper end is a firm cap.')}${choices(state, 'budgetScope', 'This budget covers', [['group', 'Whole group'], ['person', 'Per person']], false, true)}${optional('Budget flexibility (optional)', field(state, 'budgetFlexibility', 'Explicit flexibility', 'text', 'Only the stated margin may be used, for example up to USD 100 more.'), filled(state.budgetFlexibility))}` : ''}`;
    },
  },
  {
    id: 'includes', stage: 3, title: 'What does the budget include?',
    hint: 'Compare costs on the same basis. Unselected costs remain unspecified, not free.',
    visible: state => practicalVisible(state) && ['amount', 'range'].includes(state.budgetMode),
    render: state => `${choices(state, 'budgetIncludes', 'Costs covered by your amount', costs, true)}<button type="button" class="text-button" data-action="all-costs">All listed costs</button>`,
  },
  {
    id: 'needs', stage: 4, title: 'What should we take into account?',
    hint: 'Share practical effects, not diagnoses. Essential needs are never cancelled out by a great experience.', visible: () => true,
    render(state) {
      return `${choices(state, 'needs', 'Topics to consider', Object.entries(needs), true, true)}${choices(state, 'needsStatus', 'Or leave this open', [['none', 'Nothing to add for now'], ['unknown', 'Not sure / skip']], false, true)}${list(state.needs).map(id => {
        const detail = state.needDetails?.[id] ?? {};
        const attrs = `data-need="${esc(id)}"`;
        return `<section class="subpanel"><h3>${esc(needs[id] ?? id)}</h3><label class="field">The practical need<textarea ${attrs} data-detail="text" maxlength="1000" rows="3">${esc(detail.text)}</textarea><span class="hint">What makes an experience possible or unsuitable? Avoid private medical details.</span></label>${choices({ [`need-${id}-type`]: detail.type }, `need-${id}-type`, 'How should we treat it?', [['firm', 'Firm limit', 'Rule out incompatible experiences.'], ['flexible', 'Flexible preference', 'Avoid where possible; only use your stated margin.'], ['verify', 'Requires verification', 'Compatibility needs evidence before it can be claimed.']], false, true, `${attrs} data-detail="type"`)}${choices({ [`need-${id}-scope`]: detail.scope }, `need-${id}-scope`, 'Who does this apply to?', [['me', 'Me'], ['group', 'Whole group', 'Indirectly reported by you.'], ['participant', 'One anonymous participant', 'Indirectly reported by you.']], false, true, `${attrs} data-detail="scope"`)}<label class="choice"><input type="checkbox" ${attrs} data-detail="essential"${detail.essential ? ' checked' : ''}><span>An allergy or another essential need, not a flexible preference</span></label>${detail.type === 'flexible' ? optional('Acceptable margin (optional)', `<label class="field">Acceptable compromise or margin<input type="text" ${attrs} data-detail="margin" value="${esc(detail.margin)}" maxlength="200"></label>`, filled(detail.margin)) : ''}${hint('Allergies and essential accessibility or dietary needs must stay firm or require verification. Missing detail or scope needs clarification.')}</section>`;
      }).join('')}`;
    },
  },
  {
    id: 'documentation', stage: 4, title: 'Any documentation context?',
    hint: 'Optional. Entry and transit requirements must still be checked for the actual route and every traveller.',
    visible: practicalVisible,
    render: state => optional('Entry and transit documentation (optional)', `${choices(state, 'documentationMode', 'Documentation context', [['unknown', 'Leave verification pending'], ['provided', 'Add nationalities & residence'], ['not-needed', 'I believe it is not needed', 'Applicability still needs checking for the route.']], false, true)}${state.documentationMode === 'provided' ? `${field(state, 'passports', 'My passport nationality / nationalities')}${field(state, 'residence', 'Country of residence')}${field(state, 'permits', 'Relevant permits', 'text', 'Optional. No document numbers.')}${text(state, 'groupDocuments', 'Other travellers: nationalities or permits', 'Optional, without names. Your documents do not establish eligibility for the group.')}` : ''}`, state.documentationMode === 'provided' || state.documentationMode === 'not-needed'),
  },
];

export function decisionVisible(id, state = {}) {
  return decisions.find(decision => decision.id === id)?.visible(state) ?? false;
}

export function renderDecision(id, state = {}) {
  const decision = decisions.find(decision => decision.id === id);
  return decision?.visible(state) ? decision.render(state) : '';
}

export function decisionIds(state = {}) {
  return decisions.filter(decision => decision.visible(state)).map(decision => decision.id);
}
