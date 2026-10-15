import { getUsers } from './api.js?v=20261016-buttons2';
import { matchesUser } from './model.js?v=20261016-buttons2';
import { renderList } from './list.js?v=20261016-buttons2';
import { initCreate } from './create.js?v=20261016-buttons2';
import { initEdit } from './edit.js?v=20261016-buttons2';
import { initDelete } from './delete.js?v=20261016-buttons2';
import { showProfile } from './details.js?v=20261016-buttons2';

const search = document.getElementById('user-search');
const role = document.getElementById('role-filter');
const sort = document.getElementById('name-sort');
const add = document.getElementById('add-user');
const retry = document.getElementById('retry-load');
const returns = new WeakMap();
const app = {
  users: [], nextLocalId: -1, ready: false, busy: false, profileId: null,
  query: '', role: 'all', order: 'asc',
  render() { renderList(app); },
  isVisible(user) { return matchesUser(user, app.query, app.role); },
  setBusy(value) {
    app.busy = value;
    add.disabled = value || !app.ready; retry.disabled = value;
    document.querySelectorAll('dialog fieldset, dialog button').forEach(control => {
      if (!control.closest('.profile-basket')) control.disabled = value;
    });
    document.querySelectorAll('.profile-basket').forEach(basket => { basket.inert = value; });
    app.render();
  },
  showStatus(text, isError = false) {
    const status = document.getElementById('page-status'); status.textContent = text; status.dataset.error = isError;
    document.querySelectorAll('dialog[open] [data-form-status]').forEach(message => { message.textContent = text; message.dataset.error = isError; });
  },
  showLocalOperation() {
    const badge = document.getElementById('api-status'); badge.textContent = 'Локально · новый профиль'; badge.dataset.error = 'false';
  },
  focusList(id, action = 'profile') {
    const target = id === undefined ? document.querySelector('#user-list button:not(:disabled)') : document.querySelector(`#user-list [data-id="${id}"][data-action="${action}"]:not(:disabled)`);
    (target || search).focus();
  },
  openDialog(dialog, initialFocus, source = document.activeElement) {
    const current = document.querySelector('dialog[open]');
    if (current) { source = returns.get(current) || source; current.close(); }
    returns.set(dialog, source); dialog.showModal(); dialog.scrollTop = 0; initialFocus?.focus({ preventScroll: true });
  }
};

// Все обработчики подключены до первого GET, без обратного импорта app.js.
initCreate(app); initEdit(app); initDelete(app);
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('cancel', event => { if (app.busy) event.preventDefault(); });
  dialog.addEventListener('click', event => { if (event.target.closest('[data-close]') && !app.busy) dialog.close(); });
  dialog.addEventListener('close', () => {
    if (dialog.id === 'profile-dialog') app.profileId = null;
    requestAnimationFrame(() => {
      if (document.querySelector('dialog[open]')) return;
      const source = returns.get(dialog);
      if (source?.isConnected && !source.disabled) source.focus();
      else if (source?.dataset?.id) app.focusList(Number(source.dataset.id), source.dataset.action);
      else search.focus();
    });
  });
}
add.addEventListener('click', () => app.onCreate());
search.addEventListener('input', () => { app.query = search.value; app.render(); });
role.addEventListener('change', () => { app.role = role.value; app.render(); });
sort.addEventListener('change', () => { app.order = sort.value; app.render(); });
document.getElementById('reset-filters').addEventListener('click', () => { search.value = ''; role.value = 'all'; app.query = ''; app.role = 'all'; app.render(); search.focus(); });
document.addEventListener('users:request', ({ detail }) => {
  const badge = document.getElementById('api-status'); badge.textContent = `${detail.method} ${detail.path} · ${detail.status}`; badge.dataset.error = detail.isError;
});
async function load() {
  if (app.busy || app.ready) return;
  retry.hidden = true; app.setBusy(true); app.showStatus('Загружаем людей…');
  try { app.users = await getUsers(); app.ready = true; app.showStatus('Каталог загружен. Нажмите на карточку, чтобы открыть профиль.'); }
  catch (error) { app.showStatus(error.message, true); retry.hidden = false; }
  finally { app.setBusy(false); }
  if (app.ready) {
    const linkedId = new URLSearchParams(location.search).get('user');
    if (linkedId !== null) {
      const id = Number(linkedId);
      if (app.users.some(user => user.id === id)) showProfile(app, id, search);
      else app.showStatus('Профиль по этой ссылке не найден.', true);
    }
  }
}
retry.addEventListener('click', load);
load();
