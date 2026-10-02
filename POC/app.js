import { scenes, options, categories, categoryCandidates, buildProfile, buildPrompt } from './model.js';

const KEY = 'off-the-list-poc-v1';
const TTL = 7 * 24 * 60 * 60 * 1000;
const stages = ['Interests', 'Travel style', 'This trip', 'Practical details', 'Your needs', 'Review'];
const needs = { mobility: 'Mobility & physical effort', environment: 'Heights, water & animals', climate: 'Climate', crowds: 'Crowds & noise', food: 'Food & dietary needs', accommodation: 'Accommodation & comfort', transport: 'Getting around', companions: 'Companion needs' };
const fresh = () => ({ mode: '', interests: [], interestStatus: 'skipped', otherInterest: '', interestPriority: '', autonomy: '', comfort: '', food: '', memory: '', motivations: [], motivationPriority: '', purposeNote: '', pace: '', originCity: '', originCountry: '', alternateOrigin: '', durationMode: 'unknown', durationMin: '', durationMax: '', durationUnit: 'days', periodMode: 'unknown', dateStart: '', dateEnd: '', monthStart: '', monthEnd: '', periodFlexibility: '', travelLimitMode: 'unknown', travelLimit: '', transport: [], transportNotes: '', groupKnown: false, adults: '', children: '', childAges: '', groupNotes: '', budgetMode: 'unknown', budgetMin: '', budgetMax: '', budgetScope: 'group', budgetIncludes: [], budgetFlexibility: '', novelty: '', history: '', historyCompleteness: 'unknown', documentationMode: 'unknown', passports: '', residence: '', permits: '', groupDocuments: '', needs: [], needDetails: {}, needsStatus: 'unknown', categoryChoice: '', confirmationVersion: 0, confirmedAt: '', sceneOrder: shuffled(scenes.map(s => s.id)) });
function shuffled(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const value = new Uint32Array(1); crypto.getRandomValues(value);
    const j = value[0] % (i + 1); [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
let state = fresh();
let savedStep = 0;
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (saved && saved.expiresAt > Date.now()) { state = { ...state, ...saved.state }; savedStep = saved.step || 0; }
  else localStorage.removeItem(KEY);
} catch { storageAvailable = false; }
const main = document.querySelector('#main');
let step = 0;
let editingReview = false;
let toastTimer;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function notify(message) { document.querySelector('#status').textContent = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => document.querySelector('#status').textContent = '', 5000); }
function save() {
  if (!storageAvailable) return;
  try { localStorage.setItem(KEY, JSON.stringify({ state, step, expiresAt: Date.now() + TTL })); }
  catch { storageAvailable = false; notify('Browser storage is unavailable. Keep this page open to retain your answers.'); }
}
function field(key, label, type = 'text', hint = '') {
  return `<label class="field">${esc(label)}<input name="${key}" type="${type}" value="${esc(state[key])}" ${type === 'number' ? 'min="0" step="any"' : 'maxlength="200"'}>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</label>`;
}
function text(key, label, hint = '') { return `<label class="field">${esc(label)}<textarea name="${key}" maxlength="1500" rows="3">${esc(state[key])}</textarea>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</label>`; }
function select(key, label, items) { return `<label class="field">${esc(label)}<select name="${key}">${items.map(item => { const [value, title] = Array.isArray(item) ? item : [item, item]; return `<option value="${esc(value)}" ${state[key] === value ? 'selected' : ''}>${esc(title)}</option>`; }).join('')}</select></label>`; }
function choices(key, title, items, multi = false, hint = '', columns = false) {
  return `<fieldset><legend>${esc(title)}</legend>${hint ? `<p class="hint">${esc(hint)}</p>` : ''}<div class="choices ${columns ? 'columns' : ''}">${items.map(item => { const [value, label] = Array.isArray(item) ? item : [item, item]; const checked = key === 'groupKnown' ? state[key] === (value === 'yes') : multi ? state[key].includes(value) : state[key] === value; return `<label class="choice"><input type="${multi ? 'checkbox' : 'radio'}" name="${key}" value="${esc(value)}" ${checked ? 'checked' : ''}><span>${esc(label)}</span></label>`; }).join('')}</div></fieldset>`;
}
function intro(kicker, title, description) { return `<div class="intro"><p class="eyebrow">${esc(kicker)}</p><h1 style="font-size:clamp(34px,4vw,50px)">${esc(title)}</h1><p>${esc(description)}</p></div>`; }
function privacy() { return `<p class="notice">This is an early prototype, not a booking service. No account, no AI calls and no answers sent to a server. ${storageAvailable ? 'Answers are saved only in this browser for 7 days after your latest change. You can delete them below.' : 'Browser storage is unavailable; answers last only while this page is open.'} If you copy the prompt into an AI service, its own data policy applies. Please avoid names, diagnoses and document numbers.</p>`; }
function home() {
  main.innerHTML = `<section class="hero"><div class="hero-arc" aria-hidden="true"></div><div class="hero-copy"><p class="eyebrow">LESS SEARCHING. MORE DISCOVERING.</p><h1>Your next discovery starts with you.</h1><p>Tell us what you enjoy. We'll explore places that fit you, including ones you may not have considered.</p><div class="actions"><a href="#entry" class="button">Find your starting point <span aria-hidden="true">&rarr;</span></a><a href="#how-it-works" class="button secondary">How it works</a></div><p class="hero-note">We don't start with where.<br>We start with you.</p></div><img class="hero-person" src="./assets/people.png" alt="A traveller ready to explore with a backpack and headphones" fetchpriority="high"></section><section class="principles" aria-label="Our approach"><div><strong>Your interests</strong><span>Not a traveller stereotype</span></div><div><strong>Your terms</strong><span>Real needs & limits</span></div><div><strong>New possibilities</strong><span>Destinations in full view</span></div><div><strong>No pressure</strong><span>Explore before you book</span></div></section><section class="how" id="how-it-works"><p class="eyebrow">A DIFFERENT STARTING POINT</p><h2>A little about you.<br>A wider world of possibilities.</h2><div class="how-grid"><article><span>01 / RECOGNISE</span><h3>Choose what draws you in.</h3><p>Food, stories, landscapes or something else entirely. Start with experiences, not a list of countries.</p></article><article><span>02 / MAKE IT YOURS</span><h3>Tell us what matters now.</h3><p>Share your pace and practical needs, or leave the details open when you just want inspiration.</p></article><article><span>03 / EXPLORE</span><h3>Take your profile further.</h3><p>Review your answers, then copy your personal prompt into an AI model to explore destination ideas. This prototype keeps that step manual.</p></article></div>${state.mode ? '<a class="button secondary" href="#resume">Continue my saved answers &rarr;</a>' : ''}<div style="margin-top:30px">${privacy()}</div></section>`;
}
function entry() {
  main.innerHTML = `<section class="shell narrow">${intro('LET\'S BEGIN', 'What brings you here?', 'You don\'t need a destination in mind. Start wherever you are, and change your answers at any time.')}<div class="entry-grid"><button class="entry-card" data-mode="inspiration"><span class="number">01 / KEEP IT OPEN</span><h3>I want inspiration</h3><p>Discover places through your interests. Dates, budget and starting point can wait.</p><span class="arrow" aria-hidden="true">&rarr;</span></button><button class="entry-card" data-mode="trip"><span class="number">02 / ADD SOME CONTEXT</span><h3>I have a trip in mind</h3><p>Shape ideas around your time, group and practical needs. Unknown details are welcome too.</p><span class="arrow" aria-hidden="true">&rarr;</span></button></div><div style="margin-top:30px">${privacy()}</div>${state.mode ? '<a class="text-button" href="#resume">Continue my saved answers</a>' : ''}</section>`;
}
function interests() {
  const ordered = state.sceneOrder.map(id => scenes.find(s => s.id === id)).filter(Boolean);
  const count = state.interests.length + (state.otherInterest.trim() ? 1 : 0);
  return `${intro('IN GENERAL / YOUR INTERESTS', 'What do you usually enjoy when you travel?', 'Choose up to three experiences that matter most to you. You can add something we\'ve missed.')}<p class="selection-count" role="status">${count} of 3 interests selected</p><fieldset><legend class="skip-link">Travel experiences</legend><div class="scene-grid">${ordered.map(s => `<label class="scene"><img src="${esc(s.image)}" alt="" loading="lazy"><div class="scene-body"><span class="scene-title">${esc(s.title)}<input type="checkbox" name="interests" value="${s.id}" ${state.interests.includes(s.id) ? 'checked' : ''} aria-label="${esc(s.title)}"></span><p>${esc(s.description)}</p></div></label>`).join('')}</div></fieldset><div class="section">${field('otherInterest', 'Add another interest', 'text', 'Optional. This counts as one of your three interests.')}${choices('interestStatus', 'Not ready to choose?', [['unsure', "I'm not sure yet"], ['skipped', 'Skip for now']])}</div><div id="priority-block">${interestPriority()}</div>`;
}
function interestPriority() {
  const selected = scenes.filter(s => state.interests.includes(s.id)).map(s => [s.id, s.title]);
  if (state.otherInterest.trim()) selected.push(['other', state.otherInterest]);
  return selected.length > 1 ? `<div class="section">${choices('interestPriority', 'Which of these most influences your choice of where to go?', [...selected, ['equal', 'They matter equally'], ['', 'Skip for now']], false, 'A priority helps us understand the combination. You don\'t have to choose a favourite.')}</div>` : '';
}
function style() {
  return `${intro('IN GENERAL / YOUR TRAVEL STYLE', 'Your way of exploring.', 'These are your usual preferences, not a fixed personality or a promise for every trip.')}${choices('autonomy', 'How do you usually like to explore a place?', [...options.autonomy, ['', 'Skip for now']])}<div class="section">${choices('comfort', 'Which statement best describes you when you travel?', [...options.comfort, ['', 'Skip for now']], false, 'Comfort does not tell us your budget. Essential needs come later.')}</div>${state.interests.includes('food') ? `<div class="section">${choices('food', 'When it comes to food, what appeals to you most?', [...options.food, ['', 'Skip for now']], false, 'One optional follow-up to help distinguish experiences.')}</div>` : ''}<div class="section">${text('memory', 'Think of a trip or getaway you enjoyed. What moment would you like to experience again?', "If you prefer, tell us something you wouldn't want to repeat. One sentence is enough. Optional, and no previous travel required.")}<p class="hint">Your words stay as a note. This prototype does not interpret them or turn them into personality traits.</p></div>`;
}
function currentTrip() {
  return `${intro('FOR THIS TRIP / NOT FOREVER', 'What are you hoping to find?', state.mode === 'inspiration' ? 'Think of a possible next trip, or keep these choices open.' : 'Your current purpose can be different from what you usually enjoy.')}${choices('motivations', 'What would you like this trip to give you?', options.motivations, true, 'Choose up to two, then highlight what matters most.', true)}<div id="motivation-priority">${motivationPriority()}</div>${text('purposeNote', 'Another purpose we should know about? (optional)')}<div class="section">${choices('pace', 'How would you like to spend your days on this trip?', options.pace, false, 'This is about how full your days feel, not how much physical effort you can manage.')}</div><div class="section">${choices('novelty', 'How should we use your travel history for this trip?', [...options.novelty, ['', 'Not decided yet']])}${text('history', 'Places you have visited (optional)', 'Cities, regions or countries are enough. No need to remember every trip.')}${select('historyCompleteness', 'How complete is this list?', [['unknown', 'Not specified'], ['partial', 'Partial - some of my trips'], ['complete', 'Complete for the scope I described']])}</div>`;
}
function motivationPriority() { return state.motivations.length === 2 ? choices('motivationPriority', 'Which matters most for this trip?', [...state.motivations, ['', 'They matter equally / skip']]) : ''; }
function practical() {
  return `${intro('FOR THIS TRIP / PRACTICAL DETAILS', 'The details that shape the possibilities.', 'Everything can stay undecided. Anything you do specify will be respected, not quietly widened.')}<div class="section"><h3>Where would this trip start?</h3><div class="field-row">${field('originCity', 'City')}${field('originCountry', 'Country')}</div>${field('alternateOrigin', 'Alternative airport or starting point (optional)')}<p class="hint">Use an approximate starting point, not a home address. This POC uses free text; it does not verify locations.</p></div><div class="section"><h3>How much time do you have, including travel?</h3><p class="hint">Count the full time from leaving your starting point until you need to be back, including both directions.</p>${select('durationMode', 'Time available', [['unknown', 'Not decided yet'], ['exact', 'Exact duration'], ['range', 'A range']])}${state.durationMode !== 'unknown' ? `<div class="subpanel"><div class="field-row">${field('durationMin', state.durationMode === 'range' ? 'Minimum' : 'Duration', 'number')}${state.durationMode === 'range' ? field('durationMax', 'Maximum', 'number') : ''}</div>${select('durationUnit', 'Unit', ['hours', 'days', 'weeks', 'months'])}</div>` : ''}${select('periodMode', 'When could you travel?', [['unknown', 'Not decided yet'], ['dates', 'Departure and return dates / times'], ['months', 'A window of months']])}${state.periodMode === 'dates' ? `<div class="subpanel"><div class="field-row">${field('dateStart', 'Leave starting point', 'datetime-local')}${field('dateEnd', 'Need to be back', 'datetime-local')}</div><p class="hint">Both times refer to your starting point's local time. When duration is undecided, this window defines it; do not enter the same duration again.</p>${field('periodFlexibility', 'Date flexibility, if any (e.g. +/- 2 days)')}</div>` : state.periodMode === 'months' ? `<div class="subpanel"><div class="field-row">${field('monthStart', 'From month', 'month')}${field('monthEnd', 'Through month', 'month')}</div>${field('periodFlexibility', 'Window flexibility, if any')}</div>` : ''}</div><div class="section"><h3>Getting there</h3>${select('travelLimitMode', 'Do you have a maximum travel time each way?', [['unknown', 'Not decided yet'], ['none', 'No specific limit'], ['limit', 'Set a limit']])}${state.travelLimitMode === 'limit' ? field('travelLimit', 'Maximum hours each way', 'number', 'Include connections and transfers, not just the main flight or ride.') : ''}<details ${state.transport.length || state.transportNotes ? 'open' : ''}><summary>Transport preferences or restrictions (optional)</summary>${choices('transport', 'Acceptable ways to travel', ['Plane', 'Train', 'Bus', 'Car as passenger', 'Driving myself', 'Boat / ferry', 'Other'], true, 'Select only what you are happy to use. No selection means unknown, not all modes accepted.', true)}${text('transportNotes', 'Connections, driving, overnight travel or other conditions')}</details></div><div class="section"><h3>Who is travelling?</h3>${choices('groupKnown', 'Can you describe the group?', [['yes', 'Add group details'], ['no', 'Not decided yet']])}${state.groupKnown ? `<div class="subpanel"><div class="field-row">${field('adults', 'Adults', 'number')}${field('children', 'Children', 'number')}</div>${Number(state.children) > 0 ? field('childAges', 'Child ages or useful age ranges', 'text', 'No names or dates of birth.') : ''}${text('groupNotes', 'Shared preferences or needs (optional)', 'Tell us what applies to everyone or to a specific anonymous participant. Your own interests do not represent everyone.')}</div>` : ''}</div><div class="section"><h3>What budget should we work within?</h3>${select('budgetMode', 'Budget in USD', [['unknown', 'Not decided yet'], ['amount', 'An upper limit'], ['range', 'A target range']])}${state.budgetMode !== 'unknown' ? `<div class="subpanel"><div class="field-row">${field('budgetMin', state.budgetMode === 'range' ? 'Target range from (USD)' : 'Upper limit (USD)', 'number')}${state.budgetMode === 'range' ? field('budgetMax', 'Upper cap (USD)', 'number') : ''}</div>${select('budgetScope', 'This budget is', [['group', 'For the whole group'], ['person', 'Per person']])}${choices('budgetIncludes', 'What does it include?', ['Main transport', 'Accommodation', 'Food', 'Local transport', 'Activities'], true, 'Compare the actual trip on the same basis.', true)}<p class="hint">The upper amount is a firm cap, not an obligation to spend it. A range describes your target spending range.</p>${field('budgetFlexibility', 'Explicit flexibility, if any (e.g. up to USD 100 more)')}</div>` : ''}</div>`;
}
function needsPage() {
  return `${intro('FOR YOU & YOUR GROUP / NEEDS', 'What should we take into account?', 'Share practical effects, not diagnoses. Essential needs are never cancelled out by a great experience.')}${choices('needs', 'Is there anything we should avoid or take into account so you can enjoy this trip?', Object.entries(needs), true, 'Only selected topics open a detail box.', true)}${choices('needsStatus', 'If there is nothing to specify', [['none', 'Nothing to add for now'], ['unknown', 'Skip for now']])}${state.needs.map(id => { const d = state.needDetails[id]; return `<div class="subpanel"><h3>${needs[id]}</h3><label class="field">What is the practical need?<textarea data-need="${id}" data-detail="text" maxlength="1000">${esc(d.text)}</textarea><span class="hint">Describe what makes an experience possible or unsuitable. Avoid private medical details.</span></label><div class="field-row"><label class="field">How should we treat it?<select data-need="${id}" data-detail="type">${[['firm', 'Firm limit - rule out incompatibility'], ['flexible', 'Flexible preference - avoid where possible'], ['verify', 'Essential need requiring verification']].map(([v,t]) => `<option value="${v}" ${d.type === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label class="field">Who does this apply to?<select data-need="${id}" data-detail="scope">${[['me', 'Me'], ['group', 'The whole group'], ['participant', 'A specific anonymous participant']].map(([v,t]) => `<option value="${v}" ${d.scope === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>${d.type === 'flexible' ? `<label class="field">Acceptable compromise / margin<input data-need="${id}" data-detail="margin" value="${esc(d.margin)}" maxlength="200"></label>` : ''}<p class="hint">Allergies and essential accessibility or dietary needs must stay firm or require verification, even when other preferences are flexible.</p></div>`; }).join('')}<div class="section"><h3>Entry and transit documentation</h3><p class="hint">Only useful when entry or transit needs checking. You can leave verification pending. Never enter document numbers or upload documents.</p>${select('documentationMode', 'Would you like to add relevant documentation context?', [['unknown', 'Leave verification pending'], ['provided', 'Add nationalities and residence'], ['not-needed', 'I believe it is not needed for this trip']])}${state.documentationMode === 'provided' ? `<div class="subpanel">${field('passports', 'Passport nationality / nationalities (me)')}${field('residence', 'Country of residence')}${field('permits', 'Relevant permits (optional, no numbers)')}${text('groupDocuments', 'Relevant nationalities / permits of other travellers (optional)', 'No names. Missing group information means group entry remains unverified.')}</div>` : ''}</div>`;
}
function categoryPanel() {
  const candidates = categoryCandidates(state);
  const automatic = categories.find(c => c.name === candidates.automatic);
  const offered = automatic ? [automatic] : candidates.choices;
  const chosen = state.categoryChoice === 'none' ? null : categories.find(c => c.name === state.categoryChoice) || automatic;
  return `<div class="category"><p class="eyebrow">AN OPTIONAL NAME, NOT A LABEL</p><h3>${esc(chosen?.name || 'Your travel preferences')}</h3><p>${esc(chosen?.description || 'Your combination of interests is useful even when no single name captures it.')}</p><p class="hint">A starting point, not a box. Your preferences and this trip's needs shape the recommendations. This name is never used to select destinations.</p>${offered.length ? choices('categoryChoice', automatic ? 'Does this description feel right? (optional)' : 'Two descriptions you might relate to (optional)', [...offered.map(c => [c.name, `${c.name}: ${c.description}`]), ['none', 'Neither feels right'], ['', automatic ? 'Keep suggested description' : 'Skip the name']]) : ''}</div>`;
}
function summaryCard(title, list, target) { return `<article class="review-card"><h3>${title}</h3><ul>${list.map(line => `<li>${esc(line)}</li>`).join('')}</ul>${target !== undefined ? `<button type="button" class="text-button" data-edit="${target}">${target < 2 ? 'Edit my preferences' : 'Adjust this trip'}</button>${target === 0 ? '<br><button type="button" class="text-button" data-edit="1">Edit travel style & memory</button>' : ''}` : ''}</article>`; }
function review() {
  const profile = buildProfile(state);
  return `${intro('YOUR STARTING POINT / REVIEW', 'Does this sound like you?', 'Check what you shared before creating the prompt. Edit the original answers, not just their wording.')}${categoryPanel()}<div class="review-grid">${summaryCard('Your travel preferences', profile.preferences, 0)}${summaryCard('For this trip', profile.trip, 2)}${summaryCard('Conditions to respect', profile.conditions, 3)}${summaryCard('Still unknown or unconfirmed', profile.unknowns.filter(s => !s.startsWith('Profile snapshot confirmation')), 4)}</div><p class="notice" style="margin-top:24px">The memory is included in your own words, without automatic interpretation. Creating the prompt confirms these answers, not any assumptions about them. Review it before sharing with an AI service.</p><label class="choice"><input type="checkbox" id="confirm-profile"><span>I have reviewed my answers and want to create my prompt.</span></label>`;
}
function renderForm(focus = true) {
  const pages = [interests, style, currentTrip, practical, needsPage, review];
  main.innerHTML = `<section class="shell ${step === 0 || step === 5 ? '' : 'narrow'}"><ol class="stages" aria-label="Questionnaire stages">${stages.map((s,i) => `<li ${i === step ? 'aria-current="step"' : ''}>${i + 1}. ${s}</li>`).join('')}</ol><form id="capture">${pages[step]()}<div id="form-error" role="alert"></div><div class="form-navigation"><button type="button" class="text-button" data-action="back">&larr; ${step ? 'Back' : 'Change starting point'}</button><button class="button" type="submit">${step === 5 ? 'Create my prompt' : editingReview ? 'Save & return to review' : 'Continue'} <span aria-hidden="true">&rarr;</span></button></div><p class="step-note">${storageAvailable ? 'Saved in this browser only. You can stop and return within 7 days.' : 'Not saved: keep this page open.'} No answer is sent to an AI service.</p></form></section>`;
  if (step === 4) {
    for (const id of state.needs) {
      const panel = main.querySelector(`textarea[data-need="${id}"]`).closest('.subpanel');
      panel.insertAdjacentHTML('beforeend', `<label class="choice"><input type="checkbox" data-need="${id}" data-detail="essential" ${state.needDetails[id].essential ? 'checked' : ''}><span>This is an allergy or another essential need, not a flexible preference.</span></label>`);
    }
  }
  if (focus) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
}
function validate() {
  if (step === 0 && state.interests.length + (state.otherInterest.trim() ? 1 : 0) > 3) return 'Choose up to three interests, including your added interest.';
  if (step === 3) {
    if (state.durationMode !== 'unknown') {
      if (!(Number(state.durationMin) > 0)) return 'Enter a duration greater than zero, or choose Not decided yet.';
      if (state.durationMode === 'range' && !(Number(state.durationMax) >= Number(state.durationMin))) return 'The maximum duration must be at least the minimum.';
    }
    for (const [mode, a, b] of [['dates', 'dateStart', 'dateEnd'], ['months', 'monthStart', 'monthEnd']]) {
      if (state.periodMode === mode && (!state[a] || !state[b] || state[b] <= state[a] && mode === 'dates' || state[b] < state[a])) return 'Add a valid departure and return window, or choose Not decided yet.';
    }
    if (state.travelLimitMode === 'limit' && !(Number(state.travelLimit) > 0)) return 'Add a maximum travel time greater than zero, or leave it undecided.';
    if (state.groupKnown && (!/^\d+$/.test(state.adults) || !/^\d+$/.test(state.children) || Number(state.adults) + Number(state.children) < 1)) return 'Enter whole numbers for adults and children, with at least one traveller, or leave the group undecided.';
    if (state.groupKnown && Number(state.children) > 0 && !state.childAges.trim()) return 'Add useful child ages or ranges, or leave group details undecided.';
    if (state.budgetMode !== 'unknown') {
      if (!(Number(state.budgetMin) > 0)) return 'Enter a positive budget, or choose Not decided yet.';
      if (state.budgetMode === 'range' && !(Number(state.budgetMax) >= Number(state.budgetMin))) return 'The upper budget cap must be at least the lower amount.';
      if (!state.budgetIncludes.length) return 'Select what the budget includes, or leave it undecided.';
    }
  }
  if (step === 4 && state.needs.some(id => !state.needDetails[id].text.trim())) return 'Describe the practical need for each selected topic, or deselect the topic to leave it unknown.';
  if (step === 5 && !document.querySelector('#confirm-profile').checked) return 'Review and confirm your answers before creating the prompt.';
  return '';
}
function normalise() {
  if (state.durationMode === 'unknown') { state.durationMin = ''; state.durationMax = ''; }
  if (state.durationMode === 'exact') state.durationMax = '';
  if (state.periodMode !== 'dates') { state.dateStart = ''; state.dateEnd = ''; }
  if (state.periodMode !== 'months') { state.monthStart = ''; state.monthEnd = ''; }
  if (state.periodMode === 'unknown') state.periodFlexibility = '';
  if (state.travelLimitMode !== 'limit') state.travelLimit = '';
  if (!state.groupKnown) { state.adults = ''; state.children = ''; state.childAges = ''; state.groupNotes = ''; }
  else if (Number(state.children) === 0) state.childAges = '';
  if (state.budgetMode === 'unknown') { state.budgetMin = ''; state.budgetMax = ''; state.budgetIncludes = []; state.budgetFlexibility = ''; }
  if (state.budgetMode === 'amount') state.budgetMax = '';
  if (state.documentationMode !== 'provided') { state.passports = ''; state.residence = ''; state.permits = ''; state.groupDocuments = ''; }
  if (!state.interests.includes('food')) state.food = '';
  if (!state.interests.includes(state.interestPriority) && state.interestPriority !== 'equal' && !(state.interestPriority === 'other' && state.otherInterest.trim())) state.interestPriority = '';
  if (state.interests.length + (state.otherInterest.trim() ? 1 : 0) <= 1) state.interestPriority = '';
  if (!state.motivations.includes(state.motivationPriority)) state.motivationPriority = '';
  const result = categoryCandidates(state);
  if (![result.automatic, ...result.choices.map(c => c.name), '', 'none'].includes(state.categoryChoice)) state.categoryChoice = '';
}
function result() {
  if (!state.confirmedAt) { step = 5; location.hash = 'form/5'; return; }
  const category = state.categoryChoice === 'none' ? null : categories.find(c => c.name === (state.categoryChoice || categoryCandidates(state).automatic));
  main.innerHTML = `<section class="shell narrow"><div class="result-header">${intro('READY TO EXPLORE / YOUR PROMPT', 'A profile. A starting point. New possibilities.', 'Copy this prompt into the AI model of your choice. You decide where to share it and which ideas to explore.')}<p><strong>${esc(category?.name || 'Your travel preferences')}</strong>${category ? `: ${esc(category.description)}` : ''}</p><p class="hint">Confirmed version ${state.confirmationVersion}. The optional profile name is not included in the recommendation prompt.</p></div><div class="notice">No destinations have been researched by this website. For current sources and practical checks, use a model with web access. Without it, ask for unverified inspiration only. Costs, access and entry permission are never guaranteed.</div><div class="actions export-actions"><button class="button" data-action="copy">Copy prompt <span aria-hidden="true">&nearr;</span></button><button class="button secondary" data-action="download">Download prompt .txt</button><button class="text-button" data-edit="5">Review / edit answers</button></div><label class="field" for="prompt">Your complete recommendation prompt</label><textarea class="prompt" id="prompt" readonly spellcheck="false">${esc(buildPrompt(state))}</textarea><p class="hint">The prompt includes your answers, explicit priorities, practical limits, unknowns and instructions for up to three destination recommendations. Read any personal notes before sharing.</p><details><summary>Export answers for this validation session</summary><p class="hint">Includes the scene order shown, rule version and your answers. No analytics are sent anywhere. Keep this export private.</p><button class="button secondary" data-action="export">Download session .json</button></details><div class="actions"><button class="button secondary" data-action="make-trip">${state.mode === 'inspiration' ? 'Make this a trip' : 'Adjust this trip'}</button><a class="text-button" href="#home">Return home</a></div></section>`;
}
function route() {
  const hash = location.hash.slice(1);
  if (hash === 'resume') { location.hash = state.confirmedAt ? 'result' : `form/${savedStep}`; return; }
  if (hash.startsWith('form/')) { if (!state.mode) { location.hash = 'entry'; return; } step = Math.min(5, Math.max(0, Number(hash.split('/')[1]) || 0)); savedStep = step; renderForm(); save(); }
  else if (hash === 'entry') entry();
  else if (hash === 'result') result();
  else { home(); if (hash === 'how-it-works') requestAnimationFrame(() => document.querySelector('#how-it-works').scrollIntoView()); }
  if (hash !== 'how-it-works') { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
}
main.addEventListener('input', event => {
  const el = event.target;
  if (el.dataset.need) { state.confirmedAt = ''; state.needDetails[el.dataset.need][el.dataset.detail] = el.value; save(); return; }
  if (el.name && !['radio', 'checkbox'].includes(el.type)) {
    state.confirmedAt = '';
    state[el.name] = el.value;
    if (el.name === 'otherInterest') {
      state.interestStatus = state.interests.length || el.value.trim() ? 'selected' : 'skipped';
      normalise();
      document.querySelector('.selection-count').textContent = `${state.interests.length + (el.value.trim() ? 1 : 0)} of 3 interests selected`;
      document.querySelector('#priority-block').innerHTML = interestPriority();
      document.querySelectorAll('[name=interestStatus]').forEach(r => r.checked = r.value === state.interestStatus);
    }
    save();
  }
});
main.addEventListener('change', event => {
  const el = event.target;
  if (el.dataset.need) {
    state.confirmedAt = '';
    const detail = state.needDetails[el.dataset.need];
    detail[el.dataset.detail] = el.type === 'checkbox' ? el.checked : el.value;
    if (detail.essential && detail.type === 'flexible') { detail.type = 'verify'; notify('Essential needs cannot be treated as flexible preferences. Verification is required.'); }
    save();
    if (['type', 'essential'].includes(el.dataset.detail)) renderForm(false);
    return;
  }
  const key = el.name;
  if (!key) return;
  state.confirmedAt = '';
  if (el.type === 'checkbox') {
    let selected = [...state[key]];
    if (el.checked) selected.push(el.value); else selected = selected.filter(v => v !== el.value);
    if (key === 'interests' && selected.length + (state.otherInterest.trim() ? 1 : 0) > 3) { el.checked = false; notify('Choose up to three interests. Deselect one to add another.'); return; }
    if (key === 'motivations') {
      const unsure = "I'm not sure yet.";
      if (el.checked && el.value === unsure) selected = [unsure];
      else selected = selected.filter(v => v !== unsure);
      if (selected.length > 2) { el.checked = false; notify('Choose up to two motivations.'); return; }
    }
    state[key] = selected;
    if (key === 'interests') state.interestStatus = selected.length || state.otherInterest.trim() ? 'selected' : 'skipped';
    if (key === 'needs') {
      state.needsStatus = selected.length ? 'specified' : 'unknown';
      for (const id of selected) state.needDetails[id] ||= { text: '', type: 'verify', scope: 'me', margin: '', essential: id === 'food' };
      for (const id of Object.keys(state.needDetails)) if (!selected.includes(id)) delete state.needDetails[id];
    }
  } else if (key === 'groupKnown') state.groupKnown = el.value === 'yes';
  else state[key] = el.value;
  if (key === 'interestStatus') { state.interests = []; state.otherInterest = ''; state.interestPriority = ''; }
  if (key === 'needsStatus') { state.needs = []; state.needDetails = {}; }
  normalise(); save();
  if (['interests', 'interestStatus', 'needs', 'needsStatus', 'motivations', 'groupKnown', 'durationMode', 'periodMode', 'travelLimitMode', 'budgetMode', 'documentationMode', 'categoryChoice'].includes(key)) {
    const scroll = window.scrollY; renderForm(false); window.scrollTo(0, scroll);
    const replacement = [...main.querySelectorAll('[name]')].find(item => item.name === key && item.value === el.value); replacement?.focus({ preventScroll: true });
  }
  if (key === 'children') renderForm(false);
});
main.addEventListener('submit', event => {
  event.preventDefault(); normalise();
  const error = validate();
  if (error) { const box = document.querySelector('#form-error'); box.className = 'error'; box.textContent = error; box.scrollIntoView({ block: 'center' }); return; }
  if (step === 5) { state.confirmationVersion++; state.confirmedAt = new Date().toISOString(); save(); location.hash = 'result'; }
  else { if (editingReview) { editingReview = false; step = 5; } else step++; save(); location.hash = `form/${step}`; }
});
function download(content, name, type) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
main.addEventListener('click', async event => {
  const el = event.target.closest('button'); if (!el) return;
  if (el.dataset.mode) { state.confirmedAt = ''; state.mode = el.dataset.mode; editingReview = false; step = 0; save(); location.hash = 'form/0'; }
  if (el.dataset.edit !== undefined) { editingReview = el.dataset.edit !== '5'; location.hash = `form/${el.dataset.edit}`; }
  if (el.dataset.action === 'back') { editingReview = false; location.hash = step ? `form/${step - 1}` : 'entry'; }
  if (el.dataset.action === 'copy') {
    try { await navigator.clipboard.writeText(buildPrompt(state)); notify('Prompt copied. Ready to paste into your AI model.'); }
    catch { const prompt = document.querySelector('#prompt'); prompt.focus(); prompt.select(); notify('Clipboard access is unavailable. The prompt is selected; use your browser\'s Copy command.'); }
  }
  if (el.dataset.action === 'download') download(buildPrompt(state), 'off-the-list-prompt.txt', 'text/plain');
  if (el.dataset.action === 'export') download(JSON.stringify({ captureVersion: 'poc-1', rulesVersion: 'refined-ordinal-1', promptVersion: 'poc-1', exportedAt: new Date().toISOString(), state }, null, 2), 'off-the-list-session.json', 'application/json');
  if (el.dataset.action === 'make-trip') { state.confirmedAt = ''; state.mode = 'trip'; editingReview = true; save(); location.hash = 'form/3'; }
});
document.querySelector('#delete-session').addEventListener('click', () => {
  if (!window.confirm('Delete all answers saved by this prototype in this browser? Downloaded files and data you shared elsewhere will not be deleted.')) return;
  try { localStorage.removeItem(KEY); } catch { /* In-memory reset still works without storage. */ }
  state = fresh(); savedStep = 0; step = 0; editingReview = false;
  if (location.hash === '#home') route(); else location.hash = 'home';
  notify('Your answers have been deleted from this prototype.');
});
window.addEventListener('hashchange', route);
route();
