import { scenes, options } from './model.js';
import { screeningQuestions } from './capture.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const list = value => Array.isArray(value) ? value : [];
const filled = value => value !== undefined && value !== null && String(value).trim() !== '';
const hint = value => `<p class="hint">${esc(value)}</p>`;

function field(state, key, label, type = 'text', note = '', value = state[key], attributes = '') {
  const bounds = ['adults', 'children'].includes(key) ? 'min="0" step="1"' : key === 'budgetMarginAmount' ? 'min="0" max="9007199254740991" step="any"' : 'min="0" step="any"';
  return `<label class="field"><span>${esc(label)}</span><input name="${esc(key)}" type="${esc(type)}" value="${esc(value)}" ${type === 'number' ? bounds : type === 'text' ? 'maxlength="200"' : ''} ${attributes}>${note ? `<span class="hint">${esc(note)}</span>` : ''}</label>`;
}

function text(state, key, label, note = '', attributes = '') {
  return `<label class="field"><span>${esc(label)}</span><textarea name="${esc(key)}" maxlength="1500" rows="3" ${attributes}>${esc(state[key])}</textarea>${note ? `<span class="hint">${esc(note)}</span>` : ''}</label>`;
}

function recordControl(record, type, key, label, items, multi = false, inputType = 'text', note = '') {
  const name = `${record.id}-${key.replaceAll('.', '-')}`;
  const value = key.split('.').reduce((value, part) => value?.[part], record);
  const attrs = `data-record="${esc(type)}" data-record-id="${esc(record.id)}" data-record-field="${esc(key)}"`;
  const temporary = { [name]: value };
  if (items) return choices(temporary, name, label, items, multi, false, attrs);
  return inputType === 'textarea' ? text(temporary, name, label, note, attrs) : field(temporary, name, label, inputType, note, value, attrs);
}

const removeRecord = (type, id) => `<button type="button" class="text-button" data-remove-record="${type}" data-record-id="${esc(id)}">Remove this ${type.replaceAll('-', ' ')}</button>`;

function essentialRegistry(state, type) {
  const records = list(state.essentialNeeds).filter(record => record.type === type);
  const active = state.tripScreening?.[type] === 'yes';
  if (!active && !records.length) return '';
  return `<div class="essential-registry">${hint('Describe what must be possible or avoided, not a diagnosis. Essential requirements are never flexible preferences. Saved requirements remain even if your answer changes.')}${records.map(record => `<section class="subpanel record-panel" data-record-panel="${esc(record.id)}"><h3>Essential ${esc(type)} requirement</h3>${recordControl(record, 'essential-need', 'text', 'Practical requirement or limitation', null, false, 'textarea')}${optional('Who is affected? (optional)', recordControl(record, 'essential-need', 'affected', 'Who should we take this into account for?', null, false, 'text', 'Use a general description, such as the whole group or one companion. No names needed.'), filled(record.affected))}${optional('Additional practical details (optional)', `${type === 'food' ? `${recordControl(record, 'essential-need', 'crossContact', 'Cross-contact safeguards, if known', null, false, 'textarea')}${recordControl(record, 'essential-need', 'severity', 'Known reaction warning, if relevant', null, false, 'text', 'Do not guess. Unknown does not mean mild.')}` : ''}${recordControl(record, 'essential-need', 'medicalAccess', 'Medical access or response arrangements, if relevant', null, false, 'textarea', 'Functional requirements only; no medication list needed.')}`, filled(record.crossContact) || filled(record.severity) || filled(record.medicalAccess))}${removeRecord('essential-need', record.id)}</section>`).join('')}<button type="button" class="button secondary" data-add-record="essential-need" data-need-type="${esc(type)}">Add ${esc(type)} requirement</button></div>`;
}

function choices(state, key, label, items, multi = false, chips = false, attributes = '') {
  return `<fieldset><legend>${esc(label)}</legend><div class="choices${chips ? ' chips' : ''}">${items.map(item => {
    const [value, title, description = ''] = Array.isArray(item) ? item : [item, item];
    const checked = key === 'groupKnown' ? state[key] === (value === 'yes') : multi ? list(state[key]).includes(value) : state[key] === value;
    const exclusive = multi && ['unknown', 'none', options.motivations.at(-1)].includes(value) ? ' data-exclusive="true"' : '';
    return `<label class="choice"><input type="${multi ? 'checkbox' : 'radio'}" name="${esc(key)}" value="${esc(value)}"${checked ? ' checked' : ''}${exclusive} ${attributes}><span>${esc(title)}${description ? `<span class="hint">${esc(description)}</span>` : ''}</span></label>`;
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
  const currency = state.budgetCurrency && state.budgetCurrency !== 'unknown' ? state.budgetCurrency : 'currency unknown';
  return `<section class="budget-band" data-budget-band="${key}"><div class="budget-control"><label class="field" for="${id}">${esc(label)}</label><output id="${output}" for="${id}" aria-live="polite">${filled(state[key]) ? `${esc(currency)} ${esc(Number(state[key]).toLocaleString('en-US'))}` : 'Choose your amount'}</output><input id="${id}" type="range" min="100" max="20000" step="50" value="${esc(state[key] || 100)}" aria-label="${key === 'budgetMin' ? 'Adjust budget' : 'Adjust upper budget'} in ${esc(currency)}" data-budget-slider="${key}"></div>${optional(key === 'budgetMin' ? 'Enter an exact amount' : 'Enter an exact upper amount', field(state, key, `${key === 'budgetMax' ? 'Upper cap' : state.budgetMode === 'range' ? 'Lower target amount' : 'Amount'} (${currency})`, 'number'), filled(state[key]))}</section>`;
}

function participants(state, key, label) {
  const values = [0, 1, 2, 3, 4, 5];
  return `<fieldset class="participant-picker" data-count-panel="${key}"><legend>${label}</legend><div class="count-badges">${values.map(value => `<button type="button" class="count-badge" data-count-field="${key}" data-count="${value}" aria-label="${value} ${label.toLowerCase()}" aria-pressed="${String(state[key]) === String(value)}">${value}</button>`).join('')}</div>${optional('Another number', field(state, key, `${label} - exact number`, 'number', 'Use any whole number, including zero.', state[key], 'inputmode="numeric"'), filled(state[key]) && !values.includes(Number(state[key])))}</fieldset>`;
}

const needs = {
  mobility: 'Mobility & physical effort', environment: 'Heights, water & animals', climate: 'Climate',
  crowds: 'Crowds & noise', food: 'Food & dietary needs', accommodation: 'Accommodation & comfort',
  transport: 'Getting around', companions: 'Companion needs',
};
const transport = ['Plane', 'Train', 'Bus', 'Car as passenger', 'Driving myself', 'Boat / ferry', 'Other'];
const costs = ['Main transport', 'Accommodation', 'Food', 'Local transport', 'Activities'];

const practicalVisible = () => true;
const interestChoices = state => [
  ...scenes.filter(scene => list(state.interests).includes(scene.id)).map(scene => [scene.id, scene.title, scene.description]),
  ...(String(state.otherInterest ?? '').trim() ? [['other', state.otherInterest]] : []),
];
const shortOptions = (values, titles) => values.map((value, index) => [value, titles[index], value]);

export function renderPause(id, state = {}, storageAvailable = false) {
  let title, description, kicker, image = '', note = '';
  const items = [];
  const interests = state.interestStatus === 'selected' ? interestChoices(state) : [];
  if (id === 'autonomy') {
    kicker = 'YOUR FIRST PIECES';
    title = 'Your trip starts here.';
    description = interests.length ? 'These are the experiences you chose. Next, give them your own rhythm.' : 'You can discover what draws you in as you go. Next, explore what feels right for you.';
    items.push(...interests.map(([value, label]) => ['interests', label, value === state.interestPriority ? 'Your priority' : '']));
    if (state.interestPriority === 'equal' && interests.length > 1) note = 'Your selected interests matter equally.';
    const scene = scenes.find(scene => scene.id === interests.find(([value]) => value === state.interestPriority)?.[0]) || scenes.find(scene => scene.id === interests[0]?.[0]);
    if (scene) image = `<img src="${esc(scene.image)}" alt="" loading="lazy">`;
  } else if (id === 'motivations') {
    kicker = 'YOUR PREFERENCES, REFLECTED';
    title = 'A little more like you.';
    description = 'These are your choices, not a traveller label. Now think about this trip: what matters today can be different.';
    if (interests.length) items.push(['interests', interests.map(([, label]) => label).join(' / '), 'Your interests']);
    for (const [key, label, values] of [['autonomy', 'Exploring', options.autonomy], ['comfort', 'Comfort', options.comfort]]) {
      items.push([key, values.includes(state[key]) ? state[key] : 'Still open', label]);
    }
  } else if (id === 'origin') {
    kicker = 'FROM INSPIRATION TO CONTEXT';
    title = 'Inspiration first. Next, the frame.';
    description = 'Origin, timing, group and budget help shape the proposal. You do not need to have everything decided.';
    note = storageAvailable ? 'Take a break if you need one. Your progress is saved in this browser for 7 days after your latest change.' : 'Take a break if you need one, but keep this page open: browser storage is unavailable.';
  } else if (id === 'needs') {
    kicker = 'YOUR TRIP SKETCH';
    title = 'From idea to a little more concrete.';
    description = 'Here is the frame you described. Open details can stay open; this is not a price or availability check.';
    items.push(['origin', state.originMode === 'known' && state.originCity && state.originCountry ? `${state.originCity}, ${state.originCountry}` : 'Still open', 'Starting point']);
    let timing = 'Still open';
    if (state.periodMode === 'dates' && state.dateStart && state.dateEnd) timing = `${state.dateStart.slice(0, 10)} to ${state.dateEnd.slice(0, 10)}`;
    else if (state.periodMode === 'months' && state.monthStart && state.monthEnd) timing = `${state.monthStart} to ${state.monthEnd}`;
    items.push(['timing', timing, 'Travel window']);
    if (state.periodMode !== 'dates') items.push(['duration', ['exact', 'range'].includes(state.durationMode) && filled(state.durationMin) ? `${state.durationMin}${state.durationMode === 'range' ? ` to ${state.durationMax || '?'}` : ''} ${state.durationUnit || 'days'}` : 'Still open', 'Full trip duration']);
    const counts = [state.adults, state.children];
    const total = counts.reduce((sum, value) => sum + Number(value), 0);
    items.push(['group', state.groupKnown === true && counts.every(value => filled(value) && Number.isSafeInteger(Number(value)) && Number(value) >= 0) && total > 0 ? `${total} ${total === 1 ? 'traveller' : 'travellers'}` : 'Still open', 'Group']);
    const budget = ['amount', 'range'].includes(state.budgetMode) && filled(state.budgetMin);
    const currency = state.budgetCurrency && state.budgetCurrency !== 'unknown' ? state.budgetCurrency : 'Currency open';
    const scope = state.budgetScope === 'person' ? 'per person' : state.budgetScope === 'group' ? 'whole group' : 'scope open';
    items.push(['budget', budget ? `${currency} ${state.budgetMin}${state.budgetMode === 'range' ? ` to ${state.budgetMax || '?'}` : ''} / ${scope}` : 'Still open', 'Budget']);
    if (budget) {
      const flights = { included: 'Included in the budget', excluded: 'Paid separately', none: 'No flights', pending: 'Still open' };
      items.push(['includes', flights[state.flightsBudget] || 'Still open', 'Flights']);
      items.push(['includes', state.budgetCoverageConfirmed === 'yes' ? list(state.budgetIncludes).join(' / ') || 'No listed costs included' : 'Still open', 'Included costs']);
    }
  } else if (id === 'screening-food') {
    kicker = 'ROOM FOR YOUR NEEDS';
    title = 'The trip should adapt to you, too.';
    description = 'Next are six topics for the whole group: food, mobility, altitude, health, access and pregnancy precautions. Practical effects are enough; no diagnoses needed.';
    note = 'You can answer "I don\'t know yet" or "Prefer not to share". Unknown or private answers stay open, rather than being treated as no need.';
    const count = list(state.essentialNeeds).length + list(state.needs).filter(key => filled(state.needDetails?.[key]?.text)).length;
    if (count) items.push(['needs', `${count} saved ${count === 1 ? 'need' : 'needs'} retained`, 'Already recorded']);
  } else return '';
  return `<aside class="journey-pause${image ? ' has-image' : ''}" aria-labelledby="pause-title" data-pause="${esc(id)}">${image}<div class="pause-copy"><p class="eyebrow">${esc(kicker)}</p><h2 id="pause-title">${esc(title)}</h2><p>${esc(description)}</p>${items.length ? `<div class="pause-pieces">${items.map(([target, value, label]) => `<button type="button" data-decision="${esc(target)}" aria-label="${esc(`Edit ${label || value}`)}">${label ? `<span>${esc(label)}</span>` : ''}${esc(value)}<span class="pause-edit">Edit &nearr;</span></button>`).join('')}</div>` : ''}${note ? `<p class="pause-note">${esc(note)}</p>` : ''}</div></aside>`;
}

export const decisions = [
  {
    id: 'presentation', stage: 0, title: 'What should we call you?',
    hint: 'A preferred name or alias for your trip reveal. No legal name or contact details needed.', visible: () => true,
    render: state => field(state, 'presentationName', 'Name or alias for your reveal'),
  },
  {
    id: 'interests', stage: 0, title: 'What draws you in?',
    hint: 'Choose up to three experiences you usually enjoy. Unselected interests are not rejections.',
    visible: () => true,
    render(state) {
      const order = [...new Set([...list(state.sceneOrder), ...scenes.map(scene => scene.id)])];
      const ordered = order.map(id => scenes.find(scene => scene.id === id)).filter(Boolean);
      const count = list(state.interests).length + (String(state.otherInterest ?? '').trim() ? 1 : 0);
      return `<p class="selection-count" role="status">${count} of 3 interests selected</p><fieldset><legend>Experiences you enjoy</legend><div class="scene-grid">${ordered.map(scene => `<label class="scene"><img src="${esc(scene.image)}" alt="" loading="lazy"><div class="scene-body"><span class="scene-title">${esc(scene.title)}<input type="checkbox" name="interests" value="${esc(scene.id)}"${list(state.interests).includes(scene.id) ? ' checked' : ''} aria-label="${esc(`${scene.title}. ${scene.description}`)}"></span><p>${esc(scene.description)}</p></div></label>`).join('')}</div></fieldset>${field(state, 'otherInterest', 'Something else?', 'text', 'Optional. Counts as one of your three interests.')}${choices(state, 'interestStatus', 'Still discovering your interests?', [['unsure', "I don't know yet"]], false, true)}`;
    },
  },
  {
    id: 'priority', stage: 0, title: 'Which matters most?',
    hint: 'A priority helps explain the combination. You do not have to choose a favourite.',
    visible: state => interestChoices(state).length > 1,
    render: state => choices(state, 'interestPriority', 'Your strongest influence', [...interestChoices(state), ['equal', 'They matter equally'], ['unknown', "I don't know yet"]]),
  },
  {
    id: 'autonomy', stage: 1, title: 'How do you like to explore?',
    hint: 'Your usual preference, not a fixed personality or a statement about risk.', visible: () => true,
    render: state => `${choices(state, 'autonomy', 'Your way of exploring', [...shortOptions(options.autonomy, ['A clear plan', 'A little structure', 'Decide as I go', 'It depends']), ['unknown', "I don't know yet"]])}${state.autonomy === options.autonomy[3] ? text(state, 'autonomyDetails', 'When would you want guidance, support or structure?') : ''}`,
  },
  {
    id: 'comfort', stage: 1, title: 'What feels comfortable?',
    hint: 'Comfort is separate from budget. Essential needs can be specified later.', visible: () => true,
    render: state => `${choices(state, 'comfort', 'Your usual comfort preference', [...shortOptions(options.comfort, ['Comfort & convenience', 'Simple is good', 'Some discomfort is okay', 'I would rather specify']), ['unknown', "I don't know yet"]])}${state.comfort === options.comfort[3] ? text(state, 'comfortMinimums', 'What practical minimums do you need?', 'Essential requirements can be recorded in the relevant screening topic.') : ''}`,
  },
  {
    id: 'best-trips', stage: 1, title: 'What made a trip special?',
    hint: 'One meaningful getaway is enough. No previous travel is required.', visible: () => true,
    render: state => `${choices(state, 'bestTripsStatus', 'Have you taken a trip or getaway you especially enjoyed?', [['yes', 'Yes'], ['no', 'Not yet'], ['unknown', "I don't know yet"]])}${state.bestTripsStatus === 'yes' || list(state.bestTrips).length ? `${list(state.bestTrips).map(record => `<section class="subpanel record-panel" data-record-panel="${esc(record.id)}"><h3>A trip you loved</h3>${recordControl(record, 'best-trip', 'place', 'Place')}${recordControl(record, 'best-trip', 'moment', 'Favourite experience or moment', null, false, 'textarea')}${recordControl(record, 'best-trip', 'reason', 'Why did it feel exceptional?', null, false, 'textarea')}${removeRecord('best-trip', record.id)}</section>`).join('')}${state.bestTripsStatus === 'yes' ? '<button type="button" class="button secondary" data-add-record="best-trip">Add another trip</button>' : hint('Previously entered trips are retained. You can edit or remove them here.')}` : ''}${state.bestTripsStatus === 'no' ? optional('A hope for your first trip (optional)', text(state, 'firstTripAspiration', 'What would make your first trip worthwhile?', 'No previous travel or invented memories needed.'), filled(state.firstTripAspiration)) : ''}`,
  },
  {
    id: 'personal-statement', stage: 1, title: 'In your own words',
    hint: 'A sentence or two, not an autobiography. Your words are not a diagnosis or consent to risk.', visible: () => true,
    render: state => `${choices(state, 'personalStatementStatus', 'What should we understand about you to choose this trip well?', [['written', 'I can describe it'], ['unknown', "I don't know yet"]])}${state.personalStatementStatus === 'written' ? text(state, 'personalStatement', 'In your own words', 'For example, what helps you enjoy a new place or what makes time away meaningful.') : ''}`,
  },
  {
    id: 'off-path', stage: 1, title: 'How far beyond the familiar?',
    hint: 'This scale guides discovery, not physical capacity or permission to ignore safety and essential needs.', visible: () => true,
    render: state => choices(state, 'offPathComfort', 'Comfort beyond familiar tourist settings', [
      ['1', '1 / Easy to navigate', 'Reliable services and little uncertainty.'],
      ['2', '2 / Supported discoveries', 'Lesser-known places with support and simple logistics.'],
      ['3', '3 / Some adaptation', 'Less familiar surroundings and some adjustment.'],
      ['4', '4 / Less frequented places', 'More demanding logistics within my limits.'],
      ['5', '5 / Far off the familiar path', 'Significant adaptation, always within safety and essential requirements.'],
      ['unknown', "I don't know yet"],
    ]),
  },
  {
    id: 'challenge', stage: 1, title: 'What would stretch you in a good way?',
    hint: 'A challenge is not permission for danger. Firm limits also belong in exclusions or essential requirements.', visible: () => true,
    render: state => `${choices(state, 'challengePreferences', 'Challenges you would welcome', [['physical', 'Physical challenge'], ['skill', 'Learning a skill'], ['cultural', 'Cultural adaptation'], ['encounters', 'Meeting people'], ['other', 'Something else'], ['none', 'None of these'], ['unknown', "I don't know yet"]], true)}${optional('Challenge details or limits (optional)', text(state, 'challengeLimits', 'Another challenge, limits or conditions', 'Essential requirements and firm exclusions are always respected.'), filled(state.challengeLimits))}`,
  },
  {
    id: 'accommodation', stage: 1, title: 'Where would you enjoy staying?',
    hint: 'Accommodation style and practical minimums are separate. Essential access or health requirements need their own record.', visible: () => true,
    render: state => `${choices(state, 'accommodationPreference', 'Your preferred accommodation', [['boutique', 'Boutique hotel'], ['hotel', 'Comfortable hotel'], ['guesthouse', 'Guesthouse'], ['eco-lodge', 'Eco-lodge'], ['other', 'Another style'], ['any', 'No preference among compatible options'], ['unknown', "I don't know yet"]])}${state.accommodationPreference === 'other' ? field(state, 'accommodationOther', 'Your preferred style') : ''}${optional('Accommodation details (optional)', text(state, 'accommodationMinimums', 'Relevant accommodation minimums', 'For example, a private bathroom, climate control or location. Essential access needs have their own screening.'), filled(state.accommodationMinimums))}`,
  },
  {
    id: 'food', stage: 1, title: 'How do you enjoy food?',
    hint: 'Distinguish the food experiences you enjoy, or say if you are still unsure.',
    visible: state => list(state.interests).includes('food'),
    render: state => choices(state, 'food', 'Food experiences', [...options.food, ['unknown', "I don't know yet"]], false, true),
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
      return `${choices(state, 'motivations', 'What you hope to find', shortOptions(options.motivations, ['Rest', 'Time together', 'Something new', 'Learning', 'Small pleasures', 'A challenge', 'Space for myself', 'A celebration', 'Not sure yet']), true)}${list(state.motivations).length === 2 ? `<div id="motivation-priority">${choices(state, 'motivationPriority', 'Which matters most?', [...state.motivations.map(value => [value, shortOptions(options.motivations, ['Rest', 'Time together', 'Something new', 'Learning', 'Small pleasures', 'A challenge', 'Space for myself', 'A celebration', 'Not sure yet']).find(item => item[0] === value)?.[1] ?? value, value]), ['equal', 'They matter equally'], ['unknown', "I don't know yet"]], false, true)}</div>` : ''}${optional('Another purpose (optional)', text(state, 'purposeNote', 'Anything else this trip is for?'), filled(state.purposeNote))}`;
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
      return `<fieldset><legend>A day that suits this trip</legend><div class="choices columns">${cards.map(([title, labels, blocks], index) => `<label class="choice agenda-card"><input type="radio" name="pace" value="${esc(options.pace[index])}"${state.pace === options.pace[index] ? ' checked' : ''}><span><strong>${esc(title)}</strong><svg viewBox="0 0 240 48" width="240" style="max-width:100%;height:auto" aria-hidden="true" focusable="false"><path d="M12 24H228" stroke="currentColor" fill="none" opacity=".25"/>${blocks.map((block, i) => `<rect x="${16 + i * 76}" y="${block ? 10 : 19}" width="56" height="${block ? 28 : 10}" rx="5" fill="currentColor" opacity="${block ? '.7' : '.15'}"/>`).join('')}</svg><span class="hint">${labels.map(esc).join(' / ')}</span><span class="hint">${esc(options.pace[index])}</span></span></label>`).join('')}</div></fieldset>${choices(state, 'pace', 'Still finding your pace?', [[options.pace[4], "I don't know yet"]], false, true)}`;
    },
  },
  {
    id: 'history', stage: 2, title: 'New places or a fresh perspective?',
    hint: 'Only your declared scope is used. A partial list cannot prove a place is new.', visible: () => true,
    render: state => `${choices(state, 'travelExperience', 'Your general travel experience', [['first', 'First trip'], ['limited', 'A little experience'], ['several', 'Several trips'], ['extensive', 'Extensive experience'], ['unknown', "I don't know yet"]])}${choices(state, 'historyStatus', 'Have you visited other countries, regions or territories?', [['visited', 'Yes, add my history'], ['none', 'No previous visits to declare'], ['unknown', "I don't know yet"]])}${state.historyStatus === 'visited' ? `${text(state, 'history', 'Places already visited', 'Use a comma-separated list of cities, regions, countries or territories. Keep your own place names; no geographic links are guessed.')}${choices(state, 'historyCompleteness', 'How complete is this list?', [['complete', 'Complete for the scope I described'], ['partial', 'A partial list'], ['unknown', "I don't know yet"]])}${optional('Scope of this list (optional)', field(state, 'historyScope', 'Whose travel, places or periods does this cover?'), filled(state.historyScope))}` : ''}${hint('Previously visited destinations are excluded, including territories of a visited sovereign state. Paris and London remain editorial exclusions. A partial or unknown history is kept as uncertainty, not proof that a place is new.')}`,
  },
  {
    id: 'occasion', stage: 2, title: 'Is there something to celebrate?',
    hint: 'An occasion is not inferred from your group or motivations, and never overrides essential limits.', visible: () => true,
    render: state => `${choices(state, 'occasionStatus', 'Is this trip for a special occasion?', [['yes', 'Yes'], ['no', 'No'], ['unknown', "I don't know yet"]])}${state.occasionStatus === 'yes' ? `${choices(state, 'occasionType', 'The occasion', [['honeymoon', 'Honeymoon'], ['anniversary', 'Anniversary'], ['birthday', 'Birthday'], ['milestone', 'Another milestone'], ['other', 'Other'], ['unknown', "I don't know yet"]])}${optional('Occasion details (optional)', `${field(state, 'occasionDate', 'Date to celebrate, if it must be specific', 'date', 'Use the trip date rather than personal dates when sufficient.')}${text(state, 'occasionWishes', 'Wishes or limits for the occasion', 'Privacy, a surprise, shared time or anything else.')}`, filled(state.occasionDate) || filled(state.occasionWishes))}` : ''}`,
  },
  {
    id: 'exclusions', stage: 2, title: 'What must this trip not include?',
    hint: 'Firm exclusions are not flexible preferences. Clarify the scope rather than substituting something adjacent.', visible: () => true,
    render: state => `${choices(state, 'exclusionsStatus', 'Any additional exclusions?', [['yes', 'Yes'], ['none', 'No additional known exclusions'], ['unknown', "I don't know yet"]])}${list(state.exclusions).map(record => `<section class="subpanel record-panel" data-record-panel="${esc(record.id)}"><h3>Exclusion</h3>${recordControl(record, 'exclusion', 'text', 'What should be excluded?', null, false, 'textarea')}${recordControl(record, 'exclusion', 'strength', 'How should this be treated?', [['firm', 'Must not include'], ['prefer', 'Prefer to avoid', 'Not for allergies or essential needs.']])}${optional('Scope and affected people (optional)', `${recordControl(record, 'exclusion', 'scope', 'What does this cover?', null, false, 'textarea', 'Destinations, activities or conditions, if helpful.')}${recordControl(record, 'exclusion', 'affected', 'Who is affected?', null, false, 'text', 'A general description is enough; no names needed.')}`, filled(record.scope) || filled(record.affected))}${removeRecord('exclusion', record.id)}</section>`).join('')}${state.exclusionsStatus === 'yes' || list(state.exclusions).length ? '<button type="button" class="button secondary" data-add-record="exclusion">Add exclusion</button>' : ''}`,
  },
  {
    id: 'origin', stage: 3, title: 'Where would you start?',
    hint: 'Use an approximate city and country, not a home address. Locations are not verified.', visible: practicalVisible,
    render: state => `${choices(state, 'originMode', 'Do you know your starting point?', [['known', 'Yes, I can give a city and country'], ['unknown', "I don't know yet"]])}${state.originMode === 'known' ? `${field(state, 'originSearch', 'Starting city, country', 'text', 'Enter city, country with an explicit comma. No home address or inferred location.', `${state.originCity ?? ''}${state.originCountry ? `, ${state.originCountry}` : ''}`)}${optional('Another starting point (optional)', field(state, 'alternateOrigin', 'Alternative airport or starting point'), filled(state.alternateOrigin))}` : ''}`,
  },
  {
    id: 'timing', stage: 3, title: 'When could you travel?',
    hint: 'Departure and return refer to your starting point. No departure time is assumed.', visible: practicalVisible,
    render(state) {
      const time = key => String(state[key] ?? '').match(/T(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)/)?.[1] ?? '';
      const dates = state.periodMode === 'dates' ? `<div class="field-row">${field(state, 'dateStart', 'Departure date', 'date', '', String(state.dateStart ?? '').slice(0, 10))}${field(state, 'dateEnd', 'Return date', 'date', '', String(state.dateEnd ?? '').slice(0, 10))}</div>${hint('This window defines full trip duration, including travel both ways. Existing times must be retained when dates change.')}${optional('Departure and return times (optional)', `<label class="field">Departure time<input type="time" data-date-time="dateStart" value="${esc(time('dateStart'))}" step="any"></label><label class="field">Return time<input type="time" data-date-time="dateEnd" value="${esc(time('dateEnd'))}" step="any"></label>${hint('Times are local to your starting point. Leave blank if unknown; do not assume midnight.')}`, Boolean(time('dateStart') || time('dateEnd')))}` : state.periodMode === 'months' ? `<div class="field-row">${field(state, 'monthStart', 'From month', 'month')}${field(state, 'monthEnd', 'Through month', 'month')}</div>` : '';
      return `${choices(state, 'periodMode', 'Your travel window', [['dates', 'Specific dates'], ['months', 'A window of months'], ['unknown', "I don't know yet"]], false, true)}${dates}${state.periodMode === 'dates' ? optional('Starting-point time zone (optional)', field(state, 'timeZone', 'Time zone at departure and return', 'text', 'For example Europe/Madrid. No time zone is guessed.'), filled(state.timeZone)) : ''}${state.periodMode === 'dates' || state.periodMode === 'months' ? optional('Timing flexibility (optional)', field(state, 'periodFlexibility', 'Explicit flexibility', 'text', 'Only the margin you state may be used; dates are firm otherwise.'), filled(state.periodFlexibility)) : ''}`;
    },
  },
  {
    id: 'duration', stage: 3, title: 'How much time do you have?',
    hint: 'Count the whole trip, from leaving your starting point until returning, including both directions.',
    visible: state => practicalVisible(state) && state.periodMode !== 'dates',
    render: state => `${choices(state, 'durationMode', 'Time available', [['unknown', "I don't know yet"], ['exact', 'Exact duration'], ['range', 'A range']], false, true)}${['exact', 'range'].includes(state.durationMode) ? `${choices(state, 'durationUnit', 'Measured in', ['hours', 'days', 'weeks', 'months'], false, true)}<div class="duration-pickers">${durationPicker(state, 'durationMin', state.durationMode === 'range' ? 'Minimum duration' : 'Duration')}${state.durationMode === 'range' ? durationPicker(state, 'durationMax', 'Maximum duration') : ''}</div>${hint('A range does not mean its upper end is always available. Choose each quantity or enter your own.')}` : ''}`,
  },
  {
    id: 'travel', stage: 3, title: 'How far is comfortable?',
    hint: 'Maximum time each way includes connections and transfers. No limit still needs to fit your full trip.', visible: practicalVisible,
    render: state => `${choices(state, 'travelLimitMode', 'Travel time each way', [['unknown', "I don't know yet"], ['limit', 'Set an hour limit'], ['none', 'No personal limit']], false, true)}${state.travelLimitMode === 'limit' ? field(state, 'travelLimit', 'Maximum hours each way', 'number') : ''}${choices(state, 'transport', 'Acceptable ways to travel', [...transport, ['unknown', "I don't know yet"]], true)}${hint('Choose the modes you accept, or explicitly say you do not know yet. Unknown does not mean all modes or driving ability.')}${list(state.transport).includes('Driving myself') ? choices(state, 'drivingStatus', 'Driving capability and availability for this trip', [['confirmed', 'Confirmed'], ['unknown', "I don't know yet"]]) : ''}${state.youngChildrenStatus === 'yes' && Number(state.children) > 0 ? optional('Flight-segment limit for young children (optional)', field(state, 'flightSegmentLimit', 'Maximum hours per flight segment', 'number', 'Separate from the complete journey each way.'), filled(state.flightSegmentLimit)) : ''}${optional('Other transport conditions (optional)', text(state, 'transportNotes', 'Connections, driving or other conditions'), filled(state.transportNotes))}`,
  },
  {
    id: 'group', stage: 3, title: 'Who is travelling?',
    hint: 'Unknown does not mean solo. Your preferences do not automatically represent your companions.', visible: practicalVisible,
    render: state => `${choices(state, 'groupKnown', 'Can you describe the group?', [['yes', 'Yes, add group details'], ['no', "I don't know yet"]], false, true)}${state.groupKnown === true ? `${choices(state, 'groupType', 'Kind of group', [['solo', 'Solo'], ['couple', 'Couple'], ['family', 'Family'], ['friends', 'Friends'], ['other', 'Another group'], ['unknown', "I don't know yet"]])}<div class="participants-grid">${participants(state, 'adults', 'Adults')}${participants(state, 'children', 'Children')}</div>${Number(state.children) > 0 ? `${choices(state, 'youngChildrenStatus', 'Will any children be under six during the trip?', [['yes', 'Yes'], ['no', 'No'], ['unknown', "I don't know yet"]])}${optional('Children age range (optional)', field(state, 'childAges', 'General ages or age range', 'text', 'For example, preschool children or ages 6 to 12. No individual dates of birth.'), filled(state.childAges))}${state.youngChildrenStatus === 'yes' ? optional('Young children routines (optional)', text(state, 'youngChildrenRoutine', 'Rest, meals and practical travel margins'), filled(state.youngChildrenRoutine)) : ''}${filled(state.adults) && Number(state.adults) === 0 ? optional('Supervision arrangements (optional)', text(state, 'supervision', 'Supervision and practical travel arrangements', 'Any route-specific legal checks belong in later research, not this questionnaire.'), filled(state.supervision)) : ''}` : ''}${optional('Group preferences (optional)', text(state, 'groupNotes', 'Shared preferences or companion needs', 'A general description is enough; no individual profiles needed.'), filled(state.groupNotes))}` : ''}`,
  },
  {
    id: 'budget', stage: 3, title: 'What budget should guide us?',
    hint: 'Choose your original currency. An upper amount is a firm cap, not required spending.', visible: practicalVisible,
    render(state) {
      const currency = state.budgetCurrency && state.budgetCurrency !== 'unknown' ? state.budgetCurrency : 'currency unknown';
      const conversion = { ...state.eurConversion, id: 'eur-conversion' };
      return `${choices(state, 'budgetMode', 'Budget shape', [['amount', 'An amount'], ['range', 'A range'], ['unknown', "I don't know yet"]], false, true)}${['amount', 'range'].includes(state.budgetMode) ? `${choices(state, 'budgetCurrency', 'Original currency', ['EUR', 'USD', 'GBP', 'CAD', 'AUD', ['unknown', "I don't know yet"]], false, true)}<div class="budget-bands ${state.budgetMode === 'range' ? 'is-range' : ''}">${budgetBand(state, 'budgetMin', `${state.budgetMode === 'range' ? 'Lower target amount' : 'Budget amount'} in ${currency}`)}${state.budgetMode === 'range' ? budgetBand(state, 'budgetMax', `Upper cap in ${currency}`) : ''}</div>${hint('Move each band or enter any exact value. No amount is assumed until you choose. The upper end is a firm cap.')}${choices(state, 'budgetScope', 'This budget covers', [['group', 'Whole group'], ['person', 'Per person'], ['unknown', "I don't know yet"]], false, true)}${optional('Budget flexibility (optional)', `${field(state, 'budgetMarginAmount', `Maximum additional amount (${currency})`, 'number', 'A finite, explicit margin in the original currency, not automatic extra spending.')}${filled(state.budgetFlexibility) ? hint(`Previous flexibility note (retained): ${state.budgetFlexibility}`) : ''}`, filled(state.budgetMarginAmount) || filled(state.budgetFlexibility))}${state.budgetCurrency && !['EUR', 'unknown'].includes(state.budgetCurrency) ? optional('Verified EUR conversion (optional)', `<section data-record-panel="eur-conversion">${hint('EUR is the editorial reference. No exchange rate is guessed; conversion needs a source and date.')}${recordControl(conversion, 'conversion', 'rate', `EUR per 1 ${currency}`, null, false, 'number')}${recordControl(conversion, 'conversion', 'source', 'Exchange-rate source')}${recordControl(conversion, 'conversion', 'date', 'Exchange-rate date', null, false, 'date')}</section>`, filled(conversion.rate) || filled(conversion.source) || filled(conversion.date)) : ''}` : ''}`;
    },
  },
  {
    id: 'includes', stage: 3, title: 'What does the budget include?',
    hint: 'Flights are independent. Costs outside the stated amount must still be estimated separately, never treated as free.',
    visible: state => practicalVisible(state) && ['amount', 'range'].includes(state.budgetMode),
    render: state => `${choices(state, 'flightsBudget', 'Does this budget include flights?', [['included', 'Included'], ['excluded', 'Excluded / paid separately'], ['none', 'No flights'], ['pending', "I don't know yet"]])}${state.flightsBudget === 'excluded' ? hint('This cap does not limit flights. They still need a separate estimate.') : ''}${choices(state, 'budgetIncludes', 'Costs covered by your amount', costs, true)}<button type="button" class="text-button" data-action="all-costs">All listed costs</button>${hint('Select every covered cost, then confirm the coverage. Unselected costs are outside the amount only when confirmed, never free. Main transport is not a substitute for the flight answer; flights may remain unknown.')}${choices(state, 'budgetCoverageConfirmed', 'Confirm the cost coverage', [['yes', 'Selected costs are included; unselected costs are outside this amount']])}${list(state.budgetExcluded).length ? hint(`Recorded outside the amount: ${state.budgetExcluded.join(', ')}`) : ''}`,
  },
  {
    id: 'needs', stage: 4, title: 'What should we take into account?',
    hint: 'Optional extra preferences. Essential requirements have separate screening pages and are never removed by changing these topics.', visible: () => true,
    render(state) {
      return `${choices(state, 'needs', 'Topics to consider', Object.entries(needs), true, true)}${choices(state, 'needsStatus', 'Any other practical topics?', [['none', 'Nothing else to add'], ['unknown', "I don't know yet"]], false, true)}${list(state.needs).map(id => {
        const detail = state.needDetails?.[id] ?? {};
        const attrs = `data-need="${esc(id)}"`;
        const treatments = [['firm', 'Firm limit', 'Rule out incompatible experiences.'], ...(!detail.essential ? [['flexible', 'Flexible preference', 'Only within your stated margin.']] : []), ['verify', 'Requires verification', 'Compatibility needs evidence.']];
        return `<section class="subpanel record-panel" data-need-panel="${esc(id)}"><h3>${esc(needs[id] ?? id)}</h3><label class="field">The practical need<textarea ${attrs} data-detail="text" maxlength="1000" rows="3">${esc(detail.text)}</textarea><span class="hint">What makes an experience possible or unsuitable? Avoid private medical details.</span></label>${choices({ [`need-${id}-type`]: detail.essential && detail.type === 'flexible' ? '' : detail.type }, `need-${id}-type`, 'How should we treat it?', treatments, false, true, `${attrs} data-detail="type"`)}<label class="choice"><input type="checkbox" ${attrs} data-detail="essential"${detail.essential ? ' checked' : ''}><span>An allergy or another essential need, never a flexible preference</span></label>${optional('Who is affected? (optional)', `${choices({ [`need-${id}-scope`]: detail.scope }, `need-${id}-scope`, 'General scope', [['me', 'Me'], ['group', 'Whole group'], ['participant', 'Specific companion needs']], false, true, `${attrs} data-detail="scope"`)}<label class="field">General description<input type="text" ${attrs} data-detail="affected" value="${esc(detail.affected)}" maxlength="200"></label>`, filled(detail.scope) || filled(detail.affected))}${detail.type === 'flexible' && !detail.essential ? optional('Acceptable margin (optional)', `<label class="field">Acceptable compromise or margin<input type="text" ${attrs} data-detail="margin" value="${esc(detail.margin)}" maxlength="200"></label>`, filled(detail.margin)) : ''}${detail.essential ? hint('This saved note remains an essential requirement. No transfer or repeated entry is needed.') : ''}</section>`;
      }).join('')}`;
    },
  },
  ...['food', 'mobility', 'altitude', 'health', 'access', 'pregnancy'].map(type => ({
    id: `screening-${type}`, stage: 4, title: `${type === 'food' ? 'Food allergies and essential diets' : type === 'access' ? 'Essential access needs' : `${type[0].toUpperCase()}${type.slice(1)} precautions`}`,
    hint: 'One answer for the whole travel group. Share practical effects, not diagnoses. It is valid to say you do not know or prefer not to share.',
    visible: () => true,
    render(state) {
      const label = screeningQuestions.find(question => question.id === type).label;
      const key = `screening-${type}`;
      return `<div class="group-screening">${choices({ [key]: state.tripScreening?.[type] }, key, label, [['yes', 'Yes, add a practical requirement'], ['no', type === 'pregnancy' ? 'No known precautions needed' : 'No known need'], ['unknown', "I don't know yet"], ['private', 'Prefer not to share']], false, false, `data-screening="${type}"`)}${essentialRegistry(state, type)}</div>`;
    },
  })),
  {
    id: 'physical-intensity', stage: 4, title: 'How much physical effort would you enjoy?',
    hint: 'Desired effort now is separate from agenda pace, off-path level and medical or mobility requirements.', visible: () => true,
    render: state => choices(state, 'physicalIntensity', 'Physical intensity for this trip', [['low', 'Low impact'], ['moderate', 'Moderate effort'], ['high', 'Demanding, within my limits'], ['mixed', 'A mix'], ['unknown', "I don't know yet"]]),
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
