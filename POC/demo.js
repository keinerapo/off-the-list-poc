import { demoSections, demoPrompts, validateDemoAnswers, completeDemoPrompt } from './demo-prompts.js';
import { scenes } from './model.js';

const main = document.querySelector('#demo');
const nav = document.querySelector('#sections');
const answers = {};
let active = 0;
let result = null;
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

function render(focus = false) {
  main.classList.toggle('with-scenes', !result && active === 0);
  nav.innerHTML = demoSections.map((section, index) => `<button type="button" data-section="${index}" ${!result && active === index ? 'aria-current="step"' : ''} class="${validateDemoAnswers(answers, section) ? '' : 'complete'}">${section.label}</button>`).join('');
  if (result) {
    main.innerHTML = `<h1>Your travel prompt</h1><p class="result-note">Your answers, completed with fictional scenario ${result.index + 1} of ${demoPrompts.length}. Unasked details are demo data, not facts about you.</p><textarea class="prompt" aria-label="Generated travel prompt" readonly spellcheck="false"></textarea><div class="result-actions"><button class="button" type="button" data-action="copy">Copy prompt</button><button class="button secondary" type="button" data-action="download">Download</button><button class="back" type="button" data-action="edit">Edit answers</button><span class="status" role="status"></span></div>`;
    main.querySelector('.prompt').value = result.prompt;
  } else {
    const section = demoSections[active];
    main.innerHTML = `<form id="demo-form" novalidate>${section.questions.map((question, index) => {
      const value = answers[question.key];
      let control;
      if (question.key === 'interests') {
        control = `<p class="selection-count" role="status">${value?.length ?? 0} of 3 interests selected</p><div class="scene-grid">${scenes.map(scene => `<label class="scene"><img src="${escape(scene.image)}" alt="" loading="lazy"><div class="scene-body"><span class="scene-title">${escape(scene.title)}<input type="checkbox" name="interests" value="${escape(scene.id)}"${value?.includes(scene.id) ? ' checked' : ''} aria-label="${escape(`${scene.title}. ${scene.description}`)}"></span><p>${escape(scene.description)}</p></div></label>`).join('')}</div>`;
      } else if (question.options) {
        control = `<div class="choices">${question.options.map(([option, label]) => `<label class="choice"><input type="${question.type === 'multiple' ? 'checkbox' : 'radio'}" name="${question.key}" value="${escape(option)}" ${Array.isArray(value) ? value.includes(option) ? 'checked' : '' : value === option ? 'checked' : ''}><span>${escape(label)}</span></label>`).join('')}</div>`;
      } else if (question.type === 'textarea') {
        control = `<textarea class="answer" name="${question.key}" aria-label="${escape(question.title)}" placeholder="${escape(question.placeholder)}" maxlength="2000" rows="3">${escape(value ?? '')}</textarea>`;
      } else if (question.type === 'budget') {
        control = `<div class="budget-control"><label for="budget-slider">Budget amount in EUR</label><output id="budget-display" for="budget-slider" aria-live="polite">${value ? `EUR ${Number(value).toLocaleString('en-US')}` : 'Choose your amount'}</output><input id="budget-slider" type="range" name="${question.key}" min="100" max="20000" step="50" value="${escape(value ?? '100')}" aria-label="Adjust budget in EUR"><span class="unit">${question.unit}</span></div>`;
      } else {
        control = `<input class="answer" type="text" name="${question.key}" aria-label="${escape(question.title)}" value="${escape(value ?? '')}" maxlength="100" autocomplete="nickname">`;
      }
      return `<fieldset data-question="${question.key}"><legend><span class="question-number">${String(active * 2 + index + 1).padStart(2, '0')}${question.max ? ` / SELECT UP TO ${question.max}` : ''}</span>${question.title}</legend>${control}</fieldset>`;
    }).join('')}<p class="error" role="alert" hidden></p><div class="navigation">${active > 0 ? '<button class="back" type="button" data-action="back">Back</button>' : ''}<span class="counter">${active + 1} / ${demoSections.length}</span><button class="button" type="submit">${active === demoSections.length - 1 ? 'Generate prompt' : 'Continue'}</button></div></form>`;
  }
  if (focus) main.focus();
  nav.querySelector('[aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
    showError(missing, 'Please answer this question before generating the prompt.');
    return;
  }
  const index = Math.floor(Math.random() * demoPrompts.length);
  try {
    result = { index, prompt: completeDemoPrompt(answers, index) };
    render(true);
  } catch {
    showError('needsText', 'The prompt could not be generated. Please review your answers and try again.');
  }
});

main.addEventListener('click', async event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'back') { active--; render(true); }
  if (action === 'edit') { result = null; active = 0; render(true); }
  if (action === 'copy') {
    const prompt = main.querySelector('.prompt');
    const status = main.querySelector('.status');
    try {
      await navigator.clipboard.writeText(prompt.value);
      status.textContent = 'Prompt copied.';
    } catch {
      prompt.focus();
      prompt.select();
      status.textContent = 'Prompt selected. Use your keyboard to copy it.';
    }
  }
  if (action === 'download') {
    const url = URL.createObjectURL(new Blob([result.prompt], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'off-the-list-demo-prompt.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
});

render();
