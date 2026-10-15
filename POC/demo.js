import { demoSections, validateDemoAnswers } from './demo-prompts.js';
import { selectSampleJourney } from './demo-journeys.js';
import { renderJourney } from './demo-journey-view.js';
import { scenes } from './model.js';
import { icon } from './demo-icons.js';

const main = document.querySelector('#demo');
const nav = document.querySelector('#sections');
const answers = {};
let active = 0;
let result = null;
let preparationTimer = null;
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const sectionIcons = ['sparkles', 'compass', 'plane', 'wallet', 'heart'];
const questionIcons = { presentationName: 'user-round', interests: 'sparkles', autonomy: 'route', offPathComfort: 'compass', motivations: 'heart', pace: 'sun', durationMin: 'calendar-days', budgetMin: 'wallet', needsText: 'heart', physicalIntensity: 'footprints' };
const choiceIcons = {
  autonomy: ['list-checks', 'route', 'compass'],
  offPathComfort: ['map', 'users-round', 'compass', 'route', 'mountain'],
  motivations: ['coffee', 'users-round', 'compass', 'book-open', 'sun', 'mountain', 'user-round', 'flag'],
  pace: ['coffee', 'sun', 'compass', 'shuffle'],
  physicalIntensity: ['coffee', 'footprints', 'mountain', 'shuffle'],
};

function render(focus = false) {
  main.classList.toggle('with-scenes', !result && active === 0);
  main.classList.toggle('with-journey', Boolean(result));
  nav.innerHTML = demoSections.map((section, index) => `<button type="button" data-section="${index}" ${!result && active === index ? 'aria-current="step"' : ''} class="${validateDemoAnswers(answers, section) ? '' : 'complete'}">${icon(validateDemoAnswers(answers, section) ? sectionIcons[index] : 'check')}<span>${section.label}</span></button>`).join('');
  if (result) {
    main.innerHTML = renderJourney(result);
  } else {
    const section = demoSections[active];
    main.innerHTML = `<form id="demo-form" novalidate>${section.questions.map((question, index) => {
      const value = answers[question.key];
      let control;
      if (question.key === 'interests') {
        control = `<p class="selection-count" role="status">${value?.length ?? 0} of 3 interests selected</p><div class="scene-grid">${scenes.map(scene => `<label class="scene"><img src="${escape(scene.image)}" alt="" loading="lazy"><div class="scene-body"><span class="scene-title">${escape(scene.title)}<input type="checkbox" name="interests" value="${escape(scene.id)}"${value?.includes(scene.id) ? ' checked' : ''} aria-label="${escape(`${scene.title}. ${scene.description}`)}"></span><p>${escape(scene.description)}</p></div></label>`).join('')}</div>`;
      } else if (question.options) {
        control = `<div class="choices">${question.options.map(([option, label], optionIndex) => `<label class="choice"><input type="${question.type === 'multiple' ? 'checkbox' : 'radio'}" name="${question.key}" value="${escape(option)}" ${Array.isArray(value) ? value.includes(option) ? 'checked' : '' : value === option ? 'checked' : ''}>${choiceIcons[question.key] ? icon(choiceIcons[question.key][optionIndex]) : ''}<span>${escape(label)}</span></label>`).join('')}</div>`;
      } else if (question.type === 'textarea') {
        control = `<textarea class="answer" name="${question.key}" aria-label="${escape(question.title)}" placeholder="${escape(question.placeholder)}" maxlength="2000" rows="3">${escape(value ?? '')}</textarea>`;
      } else if (question.type === 'budget') {
        control = `<div class="budget-control"><label for="budget-slider">Budget amount in EUR</label><output id="budget-display" for="budget-slider" aria-live="polite">${value ? `EUR ${Number(value).toLocaleString('en-US')}` : 'Choose your amount'}</output><input id="budget-slider" type="range" name="${question.key}" min="100" max="20000" step="50" value="${escape(value ?? '100')}" aria-label="Adjust budget in EUR"><span class="unit">${question.unit}</span></div>`;
      } else {
        control = `<input class="answer" type="text" name="${question.key}" aria-label="${escape(question.title)}" value="${escape(value ?? '')}" maxlength="100" autocomplete="nickname">`;
      }
      return `<fieldset data-question="${question.key}"><legend><span class="question-number">${String(active * 2 + index + 1).padStart(2, '0')}${question.max ? ` / SELECT UP TO ${question.max}` : ''}</span>${icon(questionIcons[question.key])}${question.title}</legend>${control}</fieldset>`;
    }).join('')}<p class="error" role="alert" hidden></p><div class="navigation">${active > 0 ? `<button class="back" type="button" data-action="back">${icon('arrow-left')}Back</button>` : ''}<span class="counter">${active + 1} / ${demoSections.length}</span><button class="button" type="submit">${active === demoSections.length - 1 ? `${icon('sparkles')}Discover my journey` : `Continue${icon('arrow-right')}`}</button></div></form>`;
  }
  if (focus) main.focus();
  nav.querySelector('[aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function stopPreparation() {
  clearInterval(preparationTimer);
  preparationTimer = null;
  main.classList.remove('preparing');
  main.removeAttribute('aria-busy');
  nav.querySelectorAll('button').forEach(button => { button.disabled = false; });
}

function prepareTrip(pendingResult) {
  const stages = [
    { title: 'It starts with you.', message: 'Gathering the interests and little details that make this trip yours.', pillar: 'Culture', symbol: 'book-open', scene: 'stories', label: 'Your preferences' },
    { title: 'Room for discovery.', message: 'Bringing your curiosity and your way of exploring into the picture.', pillar: 'Explore', symbol: 'compass', scene: 'nature', label: 'Your travel style' },
    { title: 'At your own rhythm.', message: 'Weaving together your time, budget and the things that matter to you.', pillar: 'Adventure', symbol: 'mountain', scene: 'water', label: 'Your trip essentials' },
    { title: 'A new chapter awaits.', message: 'Putting the finishing touches on a journey worth imagining.', pillar: 'Transform', symbol: 'sparkles', scene: 'creative', label: 'Your journey preview' },
  ];
  const started = performance.now();
  let currentStage = -1;
  main.classList.remove('with-scenes', 'with-journey');
  main.classList.add('preparing');
  main.setAttribute('aria-busy', 'true');
  nav.querySelectorAll('button').forEach(button => { button.disabled = true; });
  main.innerHTML = `<section class="preparation" aria-labelledby="preparation-title"><div class="preparation-art" aria-hidden="true"><div class="preparation-orbit"></div><div class="preparation-postcard">${stages.map((stage, index) => `<img class="preparation-photo" data-photo="${index}" src="${escape(scenes.find(scene => scene.id === stage.scene).image)}" alt="">`).join('')}<span class="postcard-caption">A different way to go.</span></div><div class="preparation-shape"><span class="shape-symbol"></span></div><span class="art-coordinate">OFF THE LIST / MADE AROUND YOU</span><span class="art-stamp">${icon('plane')}The next chapter</span></div><div class="preparation-copy"><p class="preparation-eyebrow">A LITTLE CURIOSITY. A NEW PERSPECTIVE.</p><div class="preparation-message" role="status" aria-live="polite" aria-atomic="true"><p class="preparation-pillar"></p><h1 id="preparation-title"></h1><p class="preparation-description"></p></div><div class="preparation-tags"><span>${icon('calendar-days')}${escape(answers.durationMin)} days</span><span>${icon('wallet')}EUR ${Number(answers.budgetMin).toLocaleString('en-US')} / person</span></div><ol class="preparation-steps" aria-label="Travel request preparation">${stages.map((stage, index) => `<li data-step="${index}"><span class="step-dot">${icon('check')}</span><span>${stage.label}</span></li>`).join('')}</ol><div class="preparation-track" aria-hidden="true"><span></span></div><div class="preparation-bottom"><span class="preparation-count" aria-hidden="true"></span><span>Thoughtfully put together.</span></div><p class="preparation-note">Preparing a sample journey presentation. This preview is not live research or a booking.</p><button class="back" type="button" data-action="cancel-preparation">${icon('arrow-left')}Back to answers</button></div></section>`;
  const update = () => {
    const elapsed = performance.now() - started;
    if (elapsed >= 10000) {
      stopPreparation();
      result = pendingResult;
      render(true);
      return;
    }
    const index = Math.min(3, Math.floor(elapsed / 2500));
    main.querySelector('.preparation-track span').style.width = `${Math.min(100, elapsed / 100)}%`;
    if (index === currentStage) return;
    currentStage = index;
    const stage = stages[index];
    const screen = main.querySelector('.preparation');
    screen.dataset.stage = String(index);
    main.querySelector('#preparation-title').textContent = stage.title;
    main.querySelector('.preparation-description').textContent = stage.message;
    main.querySelector('.preparation-pillar').textContent = stage.pillar;
    main.querySelector('.shape-symbol').innerHTML = icon(stage.symbol);
    main.querySelector('.preparation-count').textContent = `0${index + 1} / 04`;
    main.querySelectorAll('[data-photo]').forEach(photo => photo.classList.toggle('is-active', Number(photo.dataset.photo) === index));
    main.querySelectorAll('[data-step]').forEach(step => {
      const position = Number(step.dataset.step);
      step.classList.toggle('is-complete', position < index);
      if (position === index) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      main.querySelector('.preparation-message').animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 500, easing: 'ease-out' });
    }
  };
  update();
  preparationTimer = setInterval(update, 100);
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function showError(key, message) {
  const error = main.querySelector('.error');
  error.textContent = message;
  error.hidden = false;
  const fieldset = main.querySelector(`[data-question="${key}"]`);
  fieldset?.classList.add('invalid');
  fieldset?.querySelector('input, textarea')?.focus();
}

nav.addEventListener('click', event => {
  if (preparationTimer !== null) return;
  const button = event.target.closest('[data-section]');
  if (!button) return;
  active = Number(button.dataset.section);
  result = null;
  render(true);
});

main.addEventListener('input', event => {
  const input = event.target;
  if (!input.name) return;
  const question = demoSections[active].questions.find(item => item.key === input.name);
  if (!question) return;
  if (question.type === 'multiple') {
    const selected = [...main.querySelectorAll(`input[name="${input.name}"]:checked`)].map(item => item.value);
    if (selected.length > question.max) {
      input.checked = false;
      showError(input.name, `Choose up to ${question.max} interests.`);
      return;
    }
    answers[input.name] = selected;
    main.querySelector('.selection-count').textContent = `${selected.length} of 3 interests selected`;
  } else answers[input.name] = input.value;
  if (question.type === 'budget') main.querySelector('#budget-display').textContent = `EUR ${Number(input.value).toLocaleString('en-US')}`;
  result = null;
  main.querySelector('.error').hidden = true;
  main.querySelector(`[data-question="${input.name}"]`)?.classList.remove('invalid');
});

main.addEventListener('submit', event => {
  event.preventDefault();
  if (preparationTimer !== null) return;
  const invalid = validateDemoAnswers(answers, demoSections[active]);
  if (invalid) {
    showError(invalid, invalid === 'budgetMin' ? 'Adjust the slider to choose your budget in EUR.' : 'Please answer this question to continue.');
    return;
  }
  if (active < demoSections.length - 1) {
    active++;
    render(true);
    return;
  }
  const missing = validateDemoAnswers(answers);
  if (missing) {
    active = demoSections.findIndex(section => section.questions.some(question => question.key === missing));
    render(true);
    showError(missing, 'Please answer this question before discovering your journey.');
    return;
  }
  try {
    prepareTrip(selectSampleJourney());
  } catch {
    showError('needsText', 'The journey could not be prepared. Please try again.');
  }
});

main.addEventListener('click', async event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'cancel-preparation') { stopPreparation(); render(true); }
  if (action === 'back') { active--; render(true); }
  if (action === 'edit') { result = null; active = 0; render(true); }
  if (action === 'another-journey') { result = null; prepareTrip(selectSampleJourney()); }
  if (action === 'download-journey') {
    const text = main.querySelector('.journey-result').innerText;
    const sources = result.sources.map(source => `${source.title}: ${source.url}`).join('\n');
    const url = URL.createObjectURL(new Blob([`${text}\n\nSOURCE LINKS\n${sources}`], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `off-the-list-${result.id}-journey.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
});

window.addEventListener('pagehide', stopPreparation);
window.addEventListener('pageshow', event => {
  if (event.persisted) render();
});
render();
