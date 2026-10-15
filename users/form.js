import { editableFields, validateUser, roleLabels } from './model.js?v=20261016-buttons2';
import { element } from './details.js?v=20261016-buttons2';
export function buildForm(prefix, submitText) {
  const form = element('form', 'user-form'); form.id = prefix + '-form'; form.noValidate = true;
  const fieldset = element('fieldset'); fieldset.setAttribute('aria-label', 'Данные человека');
  fieldset.append(element('p', 'form-note', '* Обязательные поля. Ник должен быть уникальным.'));
  const grid = element('div', 'form-grid');
  const definitions = [
    ['firstName', 'Имя *', 'text', 60, 'Emily'], ['lastName', 'Фамилия *', 'text', 60, 'Johnson'],
    ['username', 'Ник *', 'text', 30, 'emilys'], ['role', 'Роль *', 'select'],
    ['email', 'Почта', 'email', null, 'name@example.com'], ['phone', 'Телефон', 'tel', 40, '+7 …'],
    ['image', 'Ссылка на фото', 'url', null, 'https://example.com/photo.jpg'], ['description', 'О человеке', 'textarea', 1000, 'Должность, компания или несколько слов о себе']
  ];
  for (const [key, title, type, max, placeholder] of definitions) {
    const group = element('div', ['image', 'description'].includes(key) ? 'wide' : '');
    const label = element('label', '', title); label.htmlFor = prefix + '-' + key;
    const input = element(type === 'select' ? 'select' : type === 'textarea' ? 'textarea' : 'input');
    if (input.tagName === 'INPUT') input.type = type;
    input.id = prefix + '-' + key; input.name = key;
    if (max) input.maxLength = max;
    if (placeholder) input.placeholder = placeholder;
    if (['firstName', 'lastName', 'username', 'role'].includes(key)) input.required = true;
    if (key === 'username') { input.minLength = 3; input.pattern = '[A-Za-z0-9_.\\-]{3,30}'; input.autocomplete = 'off'; input.spellcheck = false; }
    if (key === 'role') for (const [value, text] of Object.entries(roleLabels)) { const option = element('option', '', text); option.value = value; input.append(option); }
    group.append(label, input);
    if (key === 'username' || key === 'image') {
      const help = element('p', 'field-help', key === 'username' ? '3–30 символов: латиница, цифры, _ . - без @.' : 'Необязательно. Только http:// или https://.'); help.id = prefix + '-' + key + '-help'; input.setAttribute('aria-describedby', help.id); group.append(help);
    }
    input.addEventListener('input', () => input.setCustomValidity(''));
    input.addEventListener('change', () => input.setCustomValidity(''));
    grid.append(group);
  }
  const status = element('p', 'form-status'); status.dataset.formStatus = ''; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const actions = element('div', 'form-actions');
  const cancel = element('button', 'button secondary', 'Отмена'); cancel.type = 'button'; cancel.dataset.close = '';
  const submit = element('button', 'button primary', submitText); submit.type = 'submit';
  actions.append(cancel, submit); fieldset.append(grid, status, actions); form.append(fieldset);
  document.getElementById(prefix + '-container').append(form);
  return form;
}
export function fillForm(form, user = {}) {
  form.reset();
  for (const key of editableFields) { const input = form.elements.namedItem(key); input.setCustomValidity(''); input.value = user[key] ?? (key === 'role' ? 'user' : ''); }
  form.querySelector('[data-form-status]').textContent = '';
}
export function readForm(form, app, id = null) {
  for (const key of editableFields) { const input = form.elements.namedItem(key); input.setCustomValidity(''); input.value = input.value.trim(); }
  if (!form.reportValidity()) return null;
  try { return validateUser(Object.fromEntries(new FormData(form)), app.users, id); }
  catch (error) {
    const input = form.elements.namedItem(error.field);
    if (input) { input.setCustomValidity(error.message); input.reportValidity(); input.focus(); }
    app.showStatus(error.message, true); return null;
  }
}
