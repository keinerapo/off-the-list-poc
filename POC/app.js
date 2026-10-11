import { scenes, categories, categoryCandidates, buildProfile, buildPrompt } from './model.js';
import { decisions, decisionIds, renderDecision, renderPause } from './canvas.js';
import { captureDefaults, restoreCapture, validateDecision, validateCapture, captureSnapshot, CAPTURE_VERSION, POLICY_VERSION } from './capture.js';

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
Object.assign(state, captureDefaults());
let savedStep = 0;
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (saved && saved.expiresAt > Date.now()) { state = { ...state, ...restoreCapture(saved.state) }; savedStep = saved.step || 0; }
  else localStorage.removeItem(KEY);
} catch { storageAvailable = false; }
const main = document.querySelector('#main');
let step = 0;
let editingReview = false;
let pauseReturn = '';
let currentDecision = 'presentation';
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
  return `${intro('QUESTIONS COMPLETE / YOUR TRIP', 'Does this sound like you?', 'You have finished the questions. Only a review remains: check that these answers represent you. Open details do not need to be resolved here.')}${categoryPanel()}<section class="review-section" aria-labelledby="defined-title"><h2 id="defined-title">What you have described</h2><div class="review-grid">${summaryCard('Your travel preferences', profile.preferences, 0)}${summaryCard('For this trip', profile.trip, 2)}${summaryCard('Conditions to respect', profile.conditions, 3)}</div></section><section class="review-section review-open" aria-labelledby="open-title"><h2 id="open-title">What stays open</h2><p>These points go with your request. They are not more questions to complete now, and later checks are not yet verified.</p><details><summary>See open points (${profile.unknowns.length})</summary>${summaryCard('Open context for the proposal', profile.unknowns)}</details></section><p class="notice" style="margin-top:24px">Unknown and private answers travel with your request. The proposal can offer conditional ideas without claiming that missing facts or safety checks are resolved. No individual documents are collected. Review your personal notes before sharing the prompt with an AI provider. Deleting this browser session does not delete downloaded or shared copies.</p><label class="choice"><input type="checkbox" id="confirm-profile"><span>These answers reflect what I know. Include the open points when creating my travel proposal request.</span></label><button type="button" class="text-button" data-action="export">Download answers .json</button>`;
}
function renderForm(focus = true) {
  if (currentDecision === 'review') {
    const firstMissing = validateCapture(state).issues[0];
    if (firstMissing) { editingReview = true; goDecision(firstMissing.decision); notify(firstMissing.message); return; }
  }
  const decision = decisions.find(d => d.id === currentDecision);
  step = currentDecision === 'review' ? 5 : decision.stage;
  const content = currentDecision === 'review' ? `${review()}<details><summary>Edit a specific answer</summary><div class="sheet-items">${decisionIds(state).map(id => `<button type="button" data-decision="${id}">${esc(decisions.find(d => d.id === id).title)}</button>`).join('')}</div></details>` : `${editingReview || pauseReturn ? '' : renderPause(currentDecision, state, storageAvailable)}${intro(step < 2 ? 'YOUR USUAL PREFERENCES' : 'FOR THIS TRIP', decision.title, decision.hint)}${renderDecision(currentDecision, state)}`;
  document.body.classList.add('capturing');
  const html = `<section class="shell decision-shell ${currentDecision === 'interests' || currentDecision === 'review' ? '' : 'narrow'}"><ol class="stages" aria-label="Questionnaire stages">${stages.map((s,i) => `<li ${i === step ? 'aria-current="step"' : ''}><button type="button" data-stage="${i}">${s}</button></li>`).join('')}</ol><div id="trip-sheet">${tripSheet()}</div><form id="capture" class="decision-canvas">${content}<div id="form-error" role="alert"></div><div class="form-navigation"><button type="button" class="text-button" data-action="back">&larr; ${currentDecision === 'interests' ? 'Change starting point' : 'Back'}</button><button class="button" type="submit">${step === 5 ? 'Create my prompt' : editingReview ? 'Save & return to review' : pauseReturn ? 'Save & return to your progress' : 'Continue'} <span aria-hidden="true">&rarr;</span></button></div><p class="step-note">${storageAvailable ? 'Saved in this browser. Pause and return within 7 days.' : 'Not saved: keep this page open.'} No answers sent to AI.</p></form></section>`;
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
    return `${node.nodeName}:${node.id || node.dataset.recordPanel || node.dataset.needPanel || node.dataset.countPanel || node.dataset.budgetBand || node.dataset.count || (node.matches('.trip-sheet') ? 'trip-sheet' : node.matches('fieldset') ? node.querySelector('legend')?.textContent : node.matches('details') ? node.querySelector('summary')?.textContent : '') || ''}`;
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
  if (state.budgetMode !== 'unknown' && state.budgetMin) items.push(['budget', `${state.budgetCurrency || 'Currency pending'} ${state.budgetMin}${state.budgetMode === 'range' ? `-${state.budgetMax || '?'}` : ''}${state.budgetScope ? state.budgetScope === 'person' ? ' / person' : ' / group' : ' / scope pending'}`]);
  if (state.needs.length || state.essentialNeeds.length) items.push(['needs', `${state.needs.length + state.essentialNeeds.length} needs`]);
  return `<details class="trip-sheet" ${window.innerWidth > 600 ? 'open' : ''}><summary>Your starting point <span>${items.length ? `${items.length} ${items.length === 1 ? 'piece' : 'pieces'} so far` : 'Still taking shape'}</span></summary><div class="sheet-items">${items.map(([id,label]) => `<button type="button" data-decision="${id}">${esc(label)} <span aria-hidden="true">&nearr;</span></button>`).join('') || '<p>Every answer adds a little context. Unknowns are welcome.</p>'}</div></details>`;
}
function goDecision(id) {
  location.hash = id === 'review' ? 'form/5' : `decision/${id}`;
}
function validate() {
  if (currentDecision === 'review') {
    const readiness = validateCapture(state);
    if (!readiness.ready) return readiness.issues[0].message;
    if (!document.getElementById('confirm-profile')?.checked) return 'Confirm that your answers reflect what you know before creating your proposal request.';
    return '';
  }
  return validateDecision(state, currentDecision);
}
function normalise() {
  if (state.durationMode === 'unknown') { state.durationMin = ''; state.durationMax = ''; }
  if (state.durationMode === 'exact') state.durationMax = '';
  if (state.periodMode !== 'dates') { state.dateStart = ''; state.dateEnd = ''; }
  if (state.periodMode !== 'months') { state.monthStart = ''; state.monthEnd = ''; }
  if (state.periodMode === 'unknown') state.periodFlexibility = '';
  if (state.travelLimitMode !== 'limit') state.travelLimit = '';
  if (state.budgetMode === 'unknown') { state.budgetMin = ''; state.budgetMax = ''; state.budgetScope = ''; state.budgetIncludes = []; state.budgetFlexibility = ''; }
  if (state.budgetMode === 'amount') state.budgetMax = '';
  if (!state.interests.includes('food')) state.food = '';
  if (!state.interests.includes(state.interestPriority) && !['equal','unknown'].includes(state.interestPriority) && !(state.interestPriority === 'other' && state.otherInterest.trim())) state.interestPriority = '';
  if (state.interests.length + (state.otherInterest.trim() ? 1 : 0) <= 1) state.interestPriority = '';
  if (!state.motivations.includes(state.motivationPriority) && !['equal','unknown'].includes(state.motivationPriority)) state.motivationPriority = '';
  for (const detail of Object.values(state.needDetails)) if (detail.essential || detail.type !== 'flexible') { detail.margin = ''; if (detail.essential && detail.type === 'flexible') detail.type = 'verify'; }
  const result = categoryCandidates(state);
  if (![result.automatic, ...result.choices.map(c => c.name), '', 'none'].includes(state.categoryChoice)) state.categoryChoice = '';
}
function result(preliminary = false) {
  if (!preliminary && (!state.confirmedAt || !state.confirmedSnapshot || !validateCapture(state).ready)) { step = 5; location.hash = 'form/5'; return; }
  const category = state.categoryChoice === 'none' ? null : categories.find(c => c.name === (state.categoryChoice || categoryCandidates(state).automatic));
  main.innerHTML = `<section class="shell narrow" data-output="${preliminary ? 'preliminary' : 'final'}">${intro('YOUR TRAVEL PROPOSAL REQUEST', 'A trip shaped around what you know.', 'Copy this request into your chosen AI service to explore a proposal. Your preferences, important needs and open points go with it.')}<p class="notice">You can receive a useful proposal with conditional ideas even when some answers are unknown. Uncertainty is not a guarantee of compatibility: essential safety, provider, entry and cost checks remain explicit. This prototype does not research or book travel.</p><div class="actions export-actions"><button class="button" data-action="copy">Copy prompt</button><button class="button secondary" data-action="download">Download prompt .txt</button><button class="text-button" data-edit="5">Review / edit answers</button></div><label class="field" for="prompt">Your complete travel proposal request</label><textarea class="prompt" id="prompt" readonly spellcheck="false">${esc(outputPrompt(preliminary))}</textarea><p class="hint">${category ? esc(category.name) + ' is an optional description, not a destination filter. ' : ''}Adventure, Explore, Transform and Culture remain part of the proposal. Open points are disclosed, not silently resolved.</p><button class="button secondary" data-action="export">Download session .json</button><div class="actions"><button class="button secondary" data-action="make-trip">Adjust this trip</button><a class="text-button" href="#entry">Back to starting point</a></div></section>`;
}
function outputPrompt(preliminary = false) {
  const snapshot = preliminary ? captureSnapshot(state) : state.confirmedSnapshot;
  if (!preliminary && (!snapshot || !state.confirmedAt || !validateCapture(state).ready || JSON.stringify(captureSnapshot(state)) !== JSON.stringify(captureSnapshot(snapshot)))) throw new Error('Answers changed or remain incomplete. Review and confirm them again.');
  return buildPrompt({ ...snapshot, confirmation: preliminary ? null : state.confirmation });
}
function invalidate() {
  state.confirmedAt = ''; state.confirmation = null; state.confirmedSnapshot = null;
}
function setRecord(el) {
  const collections = { traveller: state.travellers, 'best-trip': state.bestTrips, 'essential-need': state.essentialNeeds, exclusion: state.exclusions };
  let record = el.dataset.record === 'conversion' ? state.eurConversion : collections[el.dataset.record]?.find(item => item.id === el.dataset.recordId);
  if (!record) return;
  const path = el.dataset.recordField.split('.');
  const field = path.pop();
  for (const part of path) record = record[part] ||= {};
  invalidate(el.dataset.record === 'traveller' && ['ageYears', 'ageMonths'].includes(field));
  if (el.type === 'checkbox') record[field] = el.checked ? [...new Set([...(record[field] || []), el.value])] : (record[field] || []).filter(value => value !== el.value);
  else record[field] = el.value;
  save();
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
  else if (hash === 'preliminary') result(true);
  else { history.replaceState(null, '', '#entry'); entry(); }
  window.scrollTo(0, 0); main.focus({ preventScroll: true });
}
main.addEventListener('input', event => {
  const el = event.target;
  if (el.dataset.record) { if (!['radio','checkbox'].includes(el.type)) setRecord(el); return; }
  if (el.name || el.dataset.need || el.dataset.dateTime || el.dataset.budgetSlider) invalidate(['adults','children','dateStart','dateEnd','monthStart','monthEnd','originSearch'].includes(el.name) || Boolean(el.dataset.dateTime), ['adults','children'].includes(el.name));
  if (el.dataset.budgetSlider) {
    state.confirmedAt = '';
    const key = el.dataset.budgetSlider;
    state[key] = el.value;
    main.querySelector(`[data-budget-band="${key}"] output`).textContent = `${state.budgetCurrency || 'Currency pending'} ${Number(el.value).toLocaleString('en-US')}`;
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
      state.interestStatus = state.interests.length || el.value.trim() ? 'selected' : '';
      normalise();
      document.querySelector('.selection-count').textContent = `${state.interests.length + (el.value.trim() ? 1 : 0)} of 3 interests selected`;
      document.querySelectorAll('[name=interestStatus]').forEach(r => r.checked = r.value === state.interestStatus);
    }
    save();
    if (['budgetMin','budgetMax'].includes(el.name)) {
      const band = main.querySelector(`[data-budget-band="${el.name}"]`);
      band.querySelector('output').textContent = el.value ? `${state.budgetCurrency || 'Currency pending'} ${Number(el.value).toLocaleString('en-US')}` : 'Choose your amount';
      band.querySelector('[type=range]').value = el.value || 100;
    }
    if (['adults','children','durationMin','durationMax'].includes(el.name)) {
      const group = main.querySelector(`[data-count-panel="${el.name}"]`);
      group?.querySelectorAll('[data-count]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.count === el.value)));
      if (['adults','children'].includes(el.name)) normalise();
      save();
    }
    updateTripSheet();
  }
});
main.addEventListener('change', event => {
  const el = event.target;
  if (el.dataset.screening) {
    invalidate(); state.tripScreening[el.dataset.screening] = el.value; save(); renderForm(false); return;
  }
  if (el.dataset.record) {
    if (['radio','checkbox'].includes(el.type)) { setRecord(el); renderForm(false); }
    return;
  }
  if (el.dataset.need) {
    state.confirmedAt = '';
    const detail = state.needDetails[el.dataset.need];
    if (el.dataset.detail === 'participants') detail.participants = el.checked ? [...new Set([...(detail.participants || []), el.value])] : (detail.participants || []).filter(value => value !== el.value);
    else detail[el.dataset.detail] = el.type === 'checkbox' ? el.checked : el.value;
    if (detail.essential && detail.type === 'flexible') { detail.type = 'verify'; notify('Essential needs cannot be treated as flexible preferences. Verification is required.'); }
    invalidate(); normalise(); save();
    if (['type', 'essential', 'transferTarget'].includes(el.dataset.detail)) renderForm(false);
    return;
  }
  const key = el.name;
  if (!key) return;
  if (!['radio','checkbox'].includes(el.type)) {
    if (['adults','children'].includes(key)) renderForm(false);
    return;
  }
  invalidate(['groupKnown','periodMode'].includes(key));
  if (el.type === 'checkbox') {
    let selected = [...state[key]];
    if (el.checked) selected.push(el.value); else selected = selected.filter(v => v !== el.value);
    if (el.checked && el.dataset.exclusive) selected = [el.value];
    else if (el.checked) selected = selected.filter(value => !['unknown','none'].includes(value) || value === el.value);
    if (key === 'interests' && selected.length + (state.otherInterest.trim() ? 1 : 0) > 3) { el.checked = false; notify('Choose up to three interests. Deselect one to add another.'); return; }
    if (key === 'motivations') {
      const unsure = "I'm not sure yet.";
      if (el.checked && el.value === unsure) selected = [unsure];
      else selected = selected.filter(v => v !== unsure);
      if (selected.length > 2) { el.checked = false; notify('Choose up to two motivations.'); return; }
    }
    state[key] = selected;
    if (key === 'interests') state.interestStatus = selected.length || state.otherInterest.trim() ? 'selected' : '';
    if (key === 'needs') {
      state.needsStatus = selected.length ? 'specified' : 'unknown';
      for (const id of selected) state.needDetails[id] ||= { text: '', type: 'flexible', scope: 'me', margin: '', essential: false };
      for (const id of Object.keys(state.needDetails)) if (!selected.includes(id)) {
        const detail = state.needDetails[id];
        if ((detail.essential || detail.type !== 'flexible') && !window.confirm('Remove this saved requirement? Do this only if it no longer applies to the trip.')) state.needs.push(id);
        else delete state.needDetails[id];
      }
    }
  } else if (key === 'groupKnown') {
    state.groupKnown = el.value === 'yes';
  }
  else state[key] = el.value;
  if (key === 'interestStatus') { state.interests = []; state.otherInterest = ''; state.interestPriority = ''; }
  if (key === 'needsStatus' && state.needs.length) state.needsStatus = 'specified';
  if (key === 'historyPolicyAcknowledged' && el.value === 'yes') state.novelty = 'Only new destinations.';
  if (key === 'historyStatus' && el.value === 'none' && state.history) {
    if (!window.confirm('Remove the previously entered visited-place list? The no-repeat policy still applies.')) { state.historyStatus = 'visited'; save(); renderForm(false); return; }
    state.history = ''; state.historyCompleteness = ''; state.historyScope = '';
  }
  if (key === 'bestTripsStatus' && el.value === 'yes' && !state.bestTrips.length) state.bestTrips.push({ id: crypto.randomUUID(), place: '', moment: '', reason: '' });
  if (key === 'challengePreferences' && el.checked) state.challengePreferences = el.value === 'none' ? ['none'] : state.challengePreferences.filter(value => value !== 'none');
  if (key === 'budgetIncludes') { state.budgetCoverageConfirmed = ''; state.budgetExcluded = []; }
  if (['budgetCurrency','budgetScope','flightsBudget'].includes(key)) { state.budgetCoverageConfirmed = ''; if (key === 'budgetCurrency') state.eurConversion = { rate: '', source: '', date: '' }; }
  if (key === 'budgetCoverageConfirmed') state.budgetExcluded = ['Main transport','Accommodation','Food','Local transport','Activities'].filter(cost => !state.budgetIncludes.includes(cost));
  normalise(); save();
  if (key === 'contextChoice' && el.value === 'open') {
    // Hiding practical questions changes navigation only, never stored requirements.
    save();
  }
  if (key === 'periodMode' && el.value === 'dates') { state.durationMode = 'unknown'; state.durationMin = ''; state.durationMax = ''; save(); }
  if (el.type === 'radio' || el.type === 'checkbox') {
    const scroll = window.scrollY; renderForm(false); window.scrollTo(0, scroll);
    const replacement = [...main.querySelectorAll('[name]')].find(item => item.name === key && item.value === el.value); replacement?.focus({ preventScroll: true });
  }
  updateTripSheet();
});
main.addEventListener('submit', event => {
  event.preventDefault(); normalise();
  const error = validate();
  if (error) { const box = document.querySelector('#form-error'); box.className = 'error'; box.textContent = error; box.tabIndex = -1; box.focus(); box.scrollIntoView({ block: 'center' }); main.querySelectorAll('#capture input,#capture textarea').forEach(control => control.setAttribute('aria-describedby','form-error')); return; }
  if (currentDecision === 'review') { state.confirmationVersion++; state.confirmedAt = new Date().toISOString(); state.confirmation = { version: state.confirmationVersion, date: state.confirmedAt, captureVersion: CAPTURE_VERSION, policyVersion: POLICY_VERSION, answersReviewed: true, uncertaintiesIncluded: true }; state.confirmedSnapshot = captureSnapshot(state); save(); location.hash = 'result'; }
  else {
    const ids = [...decisionIds(state), 'review'];
    const next = editingReview ? 'review' : pauseReturn || ids[ids.indexOf(currentDecision) + 1];
    editingReview = false; pauseReturn = ''; save(); goDecision(next);
  }
});
function download(content, name, type) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
main.addEventListener('click', async event => {
  const el = event.target.closest('button'); if (!el) return;
  if (el.dataset.stage !== undefined || el.dataset.edit !== undefined || el.dataset.mode || el.dataset.action === 'back' || el.dataset.action === 'make-trip') pauseReturn = '';
  if (el.dataset.decision) pauseReturn = el.closest('.journey-pause') ? currentDecision : '';
  if (el.dataset.addRecord) {
    invalidate();
    const id = crypto.randomUUID();
    if (el.dataset.addRecord === 'best-trip') state.bestTrips.push({ id, place: '', moment: '', reason: '' });
    if (el.dataset.addRecord === 'essential-need') state.essentialNeeds.push({ id, type: el.dataset.needType, affected: '', text: '', requirementKind: '', crossContact: '', severity: '', medicalAccess: '' });
    if (el.dataset.addRecord === 'exclusion') state.exclusions.push({ id, text: '', scope: '', participants: [], strength: '', clarification: '' });
    save(); renderForm(false);
    const panel = main.querySelector(`[data-record-panel="${id}"]`); panel?.querySelector('input,textarea')?.focus(); return;
  }
  if (el.dataset.removeRecord) {
    if (!window.confirm('Remove this record? Other requirements and travellers will be kept.')) return;
    invalidate();
    const key = { 'best-trip': 'bestTrips', 'essential-need': 'essentialNeeds', exclusion: 'exclusions' }[el.dataset.removeRecord];
    state[key] = state[key].filter(record => record.id !== el.dataset.recordId); save(); renderForm(false); return;
  }
  if (el.dataset.count !== undefined) {
    invalidate(['adults','children'].includes(el.dataset.countField), true);
    state[el.dataset.countField] = el.dataset.count;
    normalise(); save(); renderForm(false);
    return;
  }
  if (el.dataset.action === 'all-costs') { invalidate(); state.budgetCoverageConfirmed = ''; state.budgetExcluded = []; state.budgetIncludes = ['Main transport','Accommodation','Food','Local transport','Activities']; save(); renderForm(false); return; }
  if (el.dataset.stage !== undefined) { editingReview = currentDecision === 'review'; const stage = Number(el.dataset.stage); goDecision(stage === 5 ? 'review' : decisions.find(d => d.stage === stage && d.visible(state))?.id || 'needs'); return; }
  if (el.dataset.decision) { editingReview = currentDecision === 'review'; if (state.mode === 'inspiration' && ['origin','timing','duration','travel','group','budget','includes','documentation'].includes(el.dataset.decision)) state.contextChoice = 'add'; goDecision(el.dataset.decision); return; }
  if (el.dataset.mode) { invalidate(); state.mode = el.dataset.mode; editingReview = false; step = 0; save(); goDecision('presentation'); }
  if (el.dataset.edit !== undefined) { editingReview = el.dataset.edit !== '5'; location.hash = `form/${el.dataset.edit}`; }
  if (el.dataset.action === 'back') { editingReview = false; const ids = [...decisionIds(state),'review']; const index = ids.indexOf(currentDecision); if (index <= 0) location.hash = 'entry'; else goDecision(ids[index - 1]); }
  if (el.dataset.action === 'preliminary') { location.hash = 'preliminary'; return; }
  let prompt;
  if (['copy','download'].includes(el.dataset.action)) {
    try { prompt = outputPrompt(location.hash === '#preliminary'); }
    catch (error) { notify(error.message); location.hash = 'form/5'; return; }
  }
  if (el.dataset.action === 'copy') {
    try { await navigator.clipboard.writeText(prompt); notify('Prompt copied. Review it before sharing with your AI model.'); }
    catch { const prompt = document.querySelector('#prompt'); prompt.focus(); prompt.select(); notify('Clipboard access is unavailable. The prompt is selected; use your browser\'s Copy command.'); }
  }
  if (el.dataset.action === 'download') download(prompt, location.hash === '#preliminary' ? 'off-the-list-clarifications.txt' : 'off-the-list-prompt.txt', 'text/plain');
  if (el.dataset.action === 'export') {
    const readiness = validateCapture(state);
    if (location.hash === '#result') { try { outputPrompt(); } catch (error) { notify(error.message); location.hash = 'form/5'; return; } }
    download(JSON.stringify({ captureVersion: CAPTURE_VERSION, policyVersion: POLICY_VERSION, exportedAt: new Date().toISOString(), status: state.confirmedSnapshot && readiness.ready ? 'capture-ready' : 'draft', readiness, confirmation: state.confirmation, confirmedSnapshot: state.confirmedSnapshot, state: captureSnapshot(state) }, null, 2), 'off-the-list-session.json', 'application/json');
  }
  if (el.dataset.action === 'make-trip') { invalidate(); state.mode = 'trip'; state.contextChoice = 'add'; editingReview = false; save(); goDecision('origin'); }
});
document.querySelector('#delete-session').addEventListener('click', () => {
  if (!window.confirm('Delete all answers saved by this prototype in this browser? Downloaded files and data you shared elsewhere will not be deleted.')) return;
  try { localStorage.removeItem(KEY); } catch { /* In-memory reset still works without storage. */ }
  state = { ...fresh(), ...captureDefaults() }; savedStep = 0; step = 0; editingReview = false; pauseReturn = '';
  if (location.hash === '#entry') route(); else location.hash = 'entry';
  notify('Your answers have been deleted from this prototype.');
});
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault(); main.focus(); main.scrollIntoView();
});
window.addEventListener('hashchange', route);
route();
