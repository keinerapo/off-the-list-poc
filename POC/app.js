import { scenes, categories, categoryCandidates, buildProfile, buildPrompt } from './model.js';
import { decisions, decisionIds, renderDecision } from './canvas.js';

const KEY = 'off-the-list-poc-v1';
const TTL = 7 * 24 * 60 * 60 * 1000;
const stages = ['Interests', 'Travel style', 'This trip', 'Practical details', 'Your needs', 'Review'];
const fresh = () => ({ mode: '', interests: [], interestStatus: 'skipped', otherInterest: '', interestPriority: '', autonomy: '', comfort: '', food: '', memory: '', motivations: [], motivationPriority: '', purposeNote: '', pace: '', originCity: '', originCountry: '', alternateOrigin: '', durationMode: 'unknown', durationMin: '', durationMax: '', durationUnit: 'days', periodMode: 'unknown', dateStart: '', dateEnd: '', monthStart: '', monthEnd: '', periodFlexibility: '', travelLimitMode: 'unknown', travelLimit: '', transport: [], transportNotes: '', groupKnown: false, adults: '', children: '', childAges: '', groupNotes: '', budgetMode: 'unknown', budgetMin: '', budgetMax: '', budgetScope: '', budgetIncludes: [], budgetFlexibility: '', novelty: '', history: '', historyCompleteness: 'unknown', documentationMode: 'unknown', passports: '', residence: '', permits: '', groupDocuments: '', needs: [], needDetails: {}, needsStatus: 'unknown', categoryChoice: '', confirmationVersion: 0, confirmedAt: '', sceneOrder: shuffled(scenes.map(s => s.id)) });
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
let currentDecision = 'interests';
let toastTimer;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function notify(message) { document.querySelector('#status').textContent = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => document.querySelector('#status').textContent = '', 5000); }
function save() {
  if (!storageAvailable) return;
  try { localStorage.setItem(KEY, JSON.stringify({ state, step, decision: currentDecision, expiresAt: Date.now() + TTL })); }
  catch { storageAvailable = false; notify('Browser storage is unavailable. Keep this page open to retain your answers.'); }
}
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
  const decision = decisions.find(d => d.id === currentDecision);
  step = currentDecision === 'review' ? 5 : decision.stage;
  const content = currentDecision === 'review' ? `${review()}<details><summary>Edit a specific answer</summary><div class="sheet-items">${decisionIds(state).map(id => `<button type="button" data-decision="${id}">${esc(decisions.find(d => d.id === id).title)}</button>`).join('')}</div></details>` : `${intro(step < 2 ? 'YOUR USUAL PREFERENCES' : 'FOR THIS TRIP', decision.title, decision.hint)}${renderDecision(currentDecision, state)}`;
  document.body.classList.add('capturing');
  const html = `<section class="shell decision-shell ${currentDecision === 'interests' || currentDecision === 'review' ? '' : 'narrow'}"><ol class="stages" aria-label="Questionnaire stages">${stages.map((s,i) => `<li ${i === step ? 'aria-current="step"' : ''}><button type="button" data-stage="${i}">${s}</button></li>`).join('')}</ol><div id="trip-sheet">${tripSheet()}</div><form id="capture" class="decision-canvas">${content}<div id="form-error" role="alert"></div><div class="form-navigation"><button type="button" class="text-button" data-action="back">&larr; ${currentDecision === 'interests' ? 'Change starting point' : 'Back'}</button><button class="button" type="submit">${step === 5 ? 'Create my prompt' : editingReview ? 'Save & return to review' : 'Continue'} <span aria-hidden="true">&rarr;</span></button></div><p class="step-note">${storageAvailable ? 'Saved in this browser. Pause and return within 7 days.' : 'Not saved: keep this page open.'} No answers sent to AI.</p></form></section>`;
  if (focus) main.innerHTML = html;
  else updateMarkup(main, html);
  if (focus) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
}
// Reconcile selection changes in place; only navigation creates a new animated canvas.
function updateMarkup(root, html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  const key = node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return node.nodeName;
    const control = node.matches('label') ? node.querySelector('input,textarea') : node;
    if (control?.matches('input,textarea')) return `${node.nodeName}:${control.name || control.dataset.need || control.dataset.dateTime}:${control.dataset.detail || ''}:${['radio','checkbox'].includes(control.type) ? control.getAttribute('value') : ''}`;
    return `${node.nodeName}:${node.id || node.dataset.needPanel || node.dataset.countPanel || node.dataset.budgetBand || node.dataset.count || (node.matches('.trip-sheet') ? 'trip-sheet' : node.matches('fieldset') ? node.querySelector('legend')?.textContent : node.matches('details') ? node.querySelector('summary')?.textContent : '') || ''}`;
  };
  function reconcile(parent, desired) {
    let cursor = parent.firstChild;
    for (const next of [...desired.childNodes]) {
      let current = cursor;
      if (!current || key(current) !== key(next)) {
        current = [...parent.childNodes].slice(cursor ? [...parent.childNodes].indexOf(cursor) : parent.childNodes.length).find(node => key(node) === key(next));
        if (current) parent.insertBefore(current, cursor);
        else { current = next.cloneNode(true); parent.insertBefore(current, cursor); }
      }
      if (next.nodeType === Node.TEXT_NODE) {
        if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
      } else if (next.nodeType === Node.ELEMENT_NODE) {
        for (const attr of [...current.attributes]) if (!next.hasAttribute(attr.name) && !(current.matches('details') && attr.name === 'open')) current.removeAttribute(attr.name);
        for (const attr of next.attributes) if (current.getAttribute(attr.name) !== attr.value && !(current.matches('details') && attr.name === 'open')) current.setAttribute(attr.name, attr.value);
        if (current.matches('input')) {
          current.checked = next.checked;
          if (current.value !== next.value) current.value = next.value;
        } else if (current.matches('textarea')) {
          if (current.value !== next.value) current.value = next.value;
        } else reconcile(current, next);
      }
      cursor = current.nextSibling;
    }
    while (cursor) { const following = cursor.nextSibling; cursor.remove(); cursor = following; }
  }
  reconcile(root, template.content);
}
function updateTripSheet() {
  const root = document.querySelector('#trip-sheet');
  if (root) updateMarkup(root, tripSheet());
}
function tripSheet() {
  const items = [];
  if (state.interests.length) items.push(['interests', `${state.interests.length} interests`]);
  if (state.originCity) items.push(['origin', `From ${state.originCity}${state.originCountry ? `, ${state.originCountry}` : ''}`]);
  if (state.periodMode === 'dates' && state.dateStart && state.dateEnd) items.push(['timing', `${state.dateStart.slice(0,10)} to ${state.dateEnd.slice(0,10)}`]);
  else if (state.durationMode !== 'unknown' && state.durationMin) items.push(['duration', `${state.durationMin}${state.durationMode === 'range' ? `-${state.durationMax || '?'}` : ''} ${state.durationUnit}`]);
  if (state.groupKnown) items.push(['group', `${Number(state.adults) + Number(state.children)} travellers`]);
  if (state.budgetMode !== 'unknown' && state.budgetMin) items.push(['budget', `USD ${state.budgetMin}${state.budgetMode === 'range' ? `-${state.budgetMax || '?'}` : ''}${state.budgetScope ? state.budgetScope === 'person' ? ' / person' : ' / group' : ' / scope pending'}`]);
  if (state.needs.length) items.push(['needs', `${state.needs.length} needs`]);
  return `<details class="trip-sheet" ${window.innerWidth > 600 ? 'open' : ''}><summary>Your starting point <span>${items.length ? `${items.length} ${items.length === 1 ? 'piece' : 'pieces'} so far` : 'Still taking shape'}</span></summary><div class="sheet-items">${items.map(([id,label]) => `<button type="button" data-decision="${id}">${esc(label)} <span aria-hidden="true">&nearr;</span></button>`).join('') || '<p>Every answer adds a little context. Unknowns are welcome.</p>'}</div></details>`;
}
function goDecision(id) {
  location.hash = id === 'review' ? 'form/5' : `decision/${id}`;
}
function validate() {
  if (currentDecision === 'interests' && state.interests.length + (state.otherInterest.trim() ? 1 : 0) > 3) return 'Choose up to three interests, including your added interest.';
  if (currentDecision === 'origin' && state.originCity && !state.originCountry) return 'Add your country after a comma, or clear the starting point to leave it unknown.';
  if (currentDecision === 'duration') {
    if (state.durationMode !== 'unknown') {
      if (!(Number(state.durationMin) > 0)) return 'Enter a duration greater than zero, or choose Not decided yet.';
      if (state.durationMode === 'range' && !(Number(state.durationMax) >= Number(state.durationMin))) return 'The maximum duration must be at least the minimum.';
    }
  }
  if (currentDecision === 'timing') {
    for (const [mode, a, b] of [['dates', 'dateStart', 'dateEnd'], ['months', 'monthStart', 'monthEnd']]) {
      if (state.periodMode === mode && (!state[a] || !state[b] || state[b] <= state[a] && mode === 'dates' || state[b] < state[a])) return 'Add a valid departure and return window, or choose Not decided yet.';
    }
  }
  if (currentDecision === 'travel' && state.travelLimitMode === 'limit' && !(Number(state.travelLimit) > 0)) return 'Add a maximum travel time greater than zero, or leave it undecided.';
  if (currentDecision === 'group') {
    if (state.groupKnown && (!/^\d+$/.test(state.adults) || !/^\d+$/.test(state.children) || Number(state.adults) + Number(state.children) < 1)) return 'Enter whole numbers for adults and children, with at least one traveller, or leave the group undecided.';
    if (state.groupKnown && Number(state.children) > 0 && !state.childAges.trim()) return 'Add useful child ages or ranges, or leave group details undecided.';
  }
  if (currentDecision === 'budget' && state.budgetMode !== 'unknown') {
      if (!(Number(state.budgetMin) > 0)) return 'Enter a positive budget, or choose Not decided yet.';
      if (state.budgetMode === 'range' && !(Number(state.budgetMax) >= Number(state.budgetMin))) return 'The upper budget cap must be at least the lower amount.';
      if (!state.budgetScope) return 'Choose whether the budget covers each person or the whole group.';
  }
  if (currentDecision === 'includes' && !state.budgetIncludes.length) return 'Select what the budget includes, or return to leave the budget undecided.';
  if (currentDecision === 'needs' && state.needs.some(id => !state.needDetails[id].text.trim())) return 'Describe the practical need for each selected topic, or deselect the topic to leave it unknown.';
  if (currentDecision === 'review') {
    for (const id of decisionIds(state)) {
      const previous = currentDecision;
      currentDecision = id;
      const error = validate();
      currentDecision = previous;
      if (error) return `${error} Edit the ${decisions.find(d => d.id === id).title.toLowerCase()} decision.`;
    }
    if (!document.querySelector('#confirm-profile').checked) return 'Review and confirm your answers before creating the prompt.';
  }
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
  if (state.budgetMode === 'unknown') { state.budgetMin = ''; state.budgetMax = ''; state.budgetScope = ''; state.budgetIncludes = []; state.budgetFlexibility = ''; }
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
  document.body.classList.remove('capturing');
  if (hash === 'resume') {
    let savedDecision;
    try { savedDecision = JSON.parse(localStorage.getItem(KEY))?.decision; } catch { /* Use saved stage if unavailable. */ }
    if (state.confirmedAt) location.hash = 'result';
    else if (savedDecision && (decisionIds(state).includes(savedDecision) || savedDecision === 'review')) goDecision(savedDecision);
    else location.hash = `form/${savedStep}`;
    return;
  }
  if (hash.startsWith('form/') || hash.startsWith('decision/')) {
    if (!state.mode) { location.hash = 'entry'; return; }
    const value = hash.split('/')[1];
    if (hash.startsWith('form/')) { const stage = Math.min(5, Math.max(0, Number(value) || 0)); currentDecision = stage === 5 ? 'review' : decisions.find(d => d.stage === stage && d.visible(state))?.id || 'needs'; }
    else currentDecision = decisionIds(state).includes(value) ? value : 'interests';
    renderForm(); savedStep = step; save();
  }
  else if (hash === 'entry') entry();
  else if (hash === 'result') result();
  else { home(); if (hash === 'how-it-works') requestAnimationFrame(() => document.querySelector('#how-it-works').scrollIntoView()); }
  if (hash !== 'how-it-works') { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
}
main.addEventListener('input', event => {
  const el = event.target;
  if (el.dataset.budgetSlider) {
    state.confirmedAt = '';
    const key = el.dataset.budgetSlider;
    state[key] = el.value;
    main.querySelector(`[data-budget-band="${key}"] output`).textContent = `USD ${Number(el.value).toLocaleString('en-US')}`;
    main.querySelector(`[name="${key}"]`).value = el.value;
    save(); updateTripSheet(); return;
  }
  if (el.dataset.dateTime) {
    state.confirmedAt = '';
    const date = state[el.dataset.dateTime]?.slice(0,10);
    if (!date) { notify('Choose the date first before adding a time.'); el.value = ''; return; }
    state[el.dataset.dateTime] = `${date}${el.value ? `T${el.value}` : ''}`;
    save(); return;
  }
  if (el.dataset.need) { if (['radio','checkbox'].includes(el.type)) return; state.confirmedAt = ''; state.needDetails[el.dataset.need][el.dataset.detail] = el.value; save(); return; }
  if (el.name && !['radio', 'checkbox'].includes(el.type)) {
    state.confirmedAt = '';
    if (el.name === 'originSearch') {
      const comma = el.value.lastIndexOf(',');
      state.originCity = (comma < 0 ? el.value : el.value.slice(0, comma)).trim();
      state.originCountry = comma < 0 ? '' : el.value.slice(comma + 1).trim();
    } else if (['dateStart','dateEnd'].includes(el.name)) {
      const time = state[el.name].split('T')[1];
      state[el.name] = el.value ? `${el.value}${time ? `T${time}` : ''}` : '';
    } else {
      state[el.name] = el.value;
      if (el.name === 'budgetMin' && el.value && state.budgetMode === 'unknown') state.budgetMode = 'amount';
    }
    if (el.name === 'otherInterest') {
      state.interestStatus = state.interests.length || el.value.trim() ? 'selected' : 'skipped';
      normalise();
      document.querySelector('.selection-count').textContent = `${state.interests.length + (el.value.trim() ? 1 : 0)} of 3 interests selected`;
      document.querySelectorAll('[name=interestStatus]').forEach(r => r.checked = r.value === state.interestStatus);
    }
    save();
    if (['budgetMin','budgetMax'].includes(el.name)) {
      const band = main.querySelector(`[data-budget-band="${el.name}"]`);
      band.querySelector('output').textContent = el.value ? `USD ${Number(el.value).toLocaleString('en-US')}` : 'Choose your amount';
      band.querySelector('[type=range]').value = el.value || 100;
    }
    if (['adults','children','durationMin','durationMax'].includes(el.name)) {
      const group = main.querySelector(`[data-count-panel="${el.name}"]`);
      group?.querySelectorAll('[data-count]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.count === el.value)));
      if (el.name === 'children') normalise();
      save();
    }
    updateTripSheet();
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
  if (!['radio','checkbox'].includes(el.type)) {
    if (key === 'children') renderForm(false);
    return;
  }
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
  } else if (key === 'groupKnown') {
    state.groupKnown = el.value === 'yes';
    if (state.groupKnown && !state.adults && !state.children) { state.adults = '1'; state.children = '0'; }
  }
  else state[key] = el.value;
  if (key === 'interestStatus') { state.interests = []; state.otherInterest = ''; state.interestPriority = ''; }
  if (key === 'needsStatus') { state.needs = []; state.needDetails = {}; }
  normalise(); save();
  if (key === 'contextChoice' && el.value === 'open') {
    if ((state.originCity || state.budgetMode !== 'unknown' || state.periodMode !== 'unknown' || state.durationMode !== 'unknown' || state.groupKnown || state.travelLimitMode !== 'unknown' || state.transport.length || state.documentationMode !== 'unknown') && !window.confirm('Keeping inspiration open will clear your starting point, dates, duration, travel limits, transport, group, budget and documentation details. Your interests and personal needs will remain. Continue?')) {
      state.contextChoice = 'add'; save(); renderForm(false); return;
    }
    // Explicitly keeping inspiration open removes practical conditions, never personal needs.
    const blank = fresh();
    for (const field of ['originCity','originCountry','alternateOrigin','durationMode','durationMin','durationMax','periodMode','dateStart','dateEnd','monthStart','monthEnd','periodFlexibility','travelLimitMode','travelLimit','transport','transportNotes','groupKnown','adults','children','childAges','groupNotes','budgetMode','budgetMin','budgetMax','budgetScope','budgetIncludes','budgetFlexibility','documentationMode','passports','residence','permits','groupDocuments']) state[field] = blank[field];
    save();
  }
  if (key === 'periodMode' && el.value === 'dates') { state.durationMode = 'unknown'; state.durationMin = ''; state.durationMax = ''; save(); }
  if (['interests', 'interestStatus', 'needs', 'needsStatus', 'motivations', 'groupKnown', 'durationMode', 'durationUnit', 'periodMode', 'travelLimitMode', 'budgetMode', 'documentationMode', 'categoryChoice', 'contextChoice'].includes(key)) {
    const scroll = window.scrollY; renderForm(false); window.scrollTo(0, scroll);
    const replacement = [...main.querySelectorAll('[name]')].find(item => item.name === key && item.value === el.value); replacement?.focus({ preventScroll: true });
  }
  updateTripSheet();
});
main.addEventListener('submit', event => {
  event.preventDefault(); normalise();
  const error = validate();
  if (error) { const box = document.querySelector('#form-error'); box.className = 'error'; box.textContent = error; box.scrollIntoView({ block: 'center' }); return; }
  if (currentDecision === 'review') { state.confirmationVersion++; state.confirmedAt = new Date().toISOString(); save(); location.hash = 'result'; }
  else {
    const ids = [...decisionIds(state), 'review'];
    const next = editingReview ? 'review' : ids[ids.indexOf(currentDecision) + 1];
    editingReview = false; save(); goDecision(next);
  }
});
function download(content, name, type) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
main.addEventListener('click', async event => {
  const el = event.target.closest('button'); if (!el) return;
  if (el.dataset.count !== undefined) {
    state.confirmedAt = '';
    state[el.dataset.countField] = el.dataset.count;
    normalise(); save(); renderForm(false);
    return;
  }
  if (el.dataset.action === 'all-costs') { state.confirmedAt = ''; state.budgetIncludes = ['Main transport','Accommodation','Food','Local transport','Activities']; save(); renderForm(false); return; }
  if (el.dataset.stage !== undefined) { editingReview = currentDecision === 'review'; const stage = Number(el.dataset.stage); goDecision(stage === 5 ? 'review' : decisions.find(d => d.stage === stage && d.visible(state))?.id || 'needs'); return; }
  if (el.dataset.decision) { editingReview = currentDecision === 'review'; if (state.mode === 'inspiration' && ['origin','timing','duration','group','budget'].includes(el.dataset.decision)) state.contextChoice = 'add'; goDecision(el.dataset.decision); return; }
  if (el.dataset.mode) { state.confirmedAt = ''; state.mode = el.dataset.mode; editingReview = false; step = 0; save(); goDecision('interests'); }
  if (el.dataset.edit !== undefined) { editingReview = el.dataset.edit !== '5'; location.hash = `form/${el.dataset.edit}`; }
  if (el.dataset.action === 'back') { editingReview = false; const ids = [...decisionIds(state),'review']; const index = ids.indexOf(currentDecision); if (index <= 0) location.hash = 'entry'; else goDecision(ids[index - 1]); }
  if (el.dataset.action === 'copy') {
    try { await navigator.clipboard.writeText(buildPrompt(state)); notify('Prompt copied. Ready to paste into your AI model.'); }
    catch { const prompt = document.querySelector('#prompt'); prompt.focus(); prompt.select(); notify('Clipboard access is unavailable. The prompt is selected; use your browser\'s Copy command.'); }
  }
  if (el.dataset.action === 'download') download(buildPrompt(state), 'off-the-list-prompt.txt', 'text/plain');
  if (el.dataset.action === 'export') download(JSON.stringify({ captureVersion: 'poc-2-canvas', rulesVersion: 'refined-ordinal-1', promptVersion: 'poc-1', exportedAt: new Date().toISOString(), state }, null, 2), 'off-the-list-session.json', 'application/json');
  if (el.dataset.action === 'make-trip') { state.confirmedAt = ''; state.mode = 'trip'; editingReview = false; save(); goDecision('origin'); }
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
