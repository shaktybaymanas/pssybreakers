import { element, userCard, showProfile } from './details.js?v=20261016-buttons2';
import { fullName, selectUsers } from './model.js?v=20261016-buttons2';
export function renderList(app) {
  const list = document.getElementById('user-list');
  list.setAttribute('aria-busy', String(app.busy));
  const selected = selectUsers(app.users, app.query, app.role, app.order);
  const fragment = document.createDocumentFragment();
  if (!app.ready && app.busy) {
    for (let i = 0; i < 6; i++) { const card = element('div', 'loading-card'); card.setAttribute('aria-hidden', 'true'); fragment.append(card); }
  } else for (const user of selected) {
    const tile = element('article', 'user-tile');
    const button = element('button'); button.type = 'button'; button.className = 'user-card';
    button.append(...userCard(user).childNodes);
    button.dataset.id = user.id; button.dataset.action = 'profile'; button.disabled = app.busy;
    button.setAttribute('aria-label', 'Открыть профиль: ' + fullName(user)); button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-controls', 'profile-dialog');
    button.addEventListener('click', () => showProfile(app, user.id, button));
    const actions = element('div', 'tile-actions');
    for (const [action, text, handler] of [['edit', 'Изменить', app.onEdit], ['delete', 'Удалить', app.onDelete]]) {
      const control = element('button', 'text-button ' + action, text); control.type = 'button'; control.dataset.id = user.id; control.dataset.action = action;
      control.setAttribute('aria-label', text + ': ' + fullName(user)); control.disabled = app.busy;
      control.addEventListener('click', () => handler(user.id)); actions.append(control);
    }
    const arrow = element('span', 'arrow', '↗'); arrow.setAttribute('aria-hidden', 'true'); actions.append(arrow);
    tile.append(button, actions); fragment.append(tile);
  }
  list.replaceChildren(fragment);
  document.getElementById('user-count').textContent = app.ready ? `Показано ${selected.length} из ${app.users.length}` : app.busy ? 'Загружаем каталог…' : 'Каталог не загружен';
  document.getElementById('empty-state').hidden = !app.ready || selected.length > 0;
  document.getElementById('empty-title').textContent = app.users.length ? 'Никого не нашли' : 'Каталог пока пуст';
  document.getElementById('empty-text').textContent = app.users.length ? 'Попробуйте другое имя или выберите все роли.' : 'Добавьте первого человека с помощью кнопки выше.';
  document.getElementById('reset-filters').hidden = !app.query && app.role === 'all';
}
