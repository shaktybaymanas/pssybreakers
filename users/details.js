import { fullName, httpUrl, roleLabels } from './model.js?v=20261016-buttons2';
export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
export function avatar(user) {
  const box = element('span', 'avatar');
  box.setAttribute('aria-hidden', 'true');
  box.append(element('span', '', `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase() || '?'));
  if (httpUrl(user.image)) {
    const image = element('img');
    image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => image.remove(), { once: true });
    image.src = user.image;
    box.append(image);
  }
  return box;
}
// Одна и та же разметка используется и в списке, и справа в профиле.
export function userCard(user) {
  const card = element('div', 'user-card');
  const info = element('span', 'user-info');
  info.append(element('span', 'user-name', fullName(user)), element('span', 'user-handle', '@' + user.username));
  const meta = element('span', 'user-meta');
  const role = element('span', 'role-badge', roleLabels[user.role]);
  role.dataset.role = user.role;
  meta.append(role, element('span', '', 'ID ' + user.id));
  info.append(meta); card.append(avatar(user), info);
  return card;
}
export function showProfile(app, id, source, { readOnly = false } = {}) {
  if (app.busy || !app.ready) return;
  const user = app.users.find(item => item.id === id);
  if (!user) return;
  const layout = element('div', 'profile-layout');
  const title = element('h2', '', fullName(user)); title.id = 'profile-title'; title.tabIndex = -1;
  const data = element('section', 'profile-data'); data.setAttribute('aria-label', 'Данные человека');
  data.append(element('p', 'eyebrow', 'Профиль человека'), title, userCard(user));
  const fields = element('dl', 'profile-fields');
  for (const [label, value] of [['ID', user.id], ['Имя', fullName(user)], ['Ник', '@' + user.username], ['Роль', roleLabels[user.role]], ['Почта', user.email || 'Не указана'], ['Телефон', user.phone || 'Не указан']]) {
    const row = element('div', 'profile-field'); row.append(element('dt', '', label), element('dd', '', String(value))); fields.append(row);
  }
  const actions = element('div', 'profile-actions');
  const edit = element('button', 'button primary', 'Редактировать'); edit.type = 'button'; edit.addEventListener('click', () => app.onEdit(id));
  const del = element('button', 'button danger', 'Удалить'); del.type = 'button'; del.addEventListener('click', () => app.onDelete(id));
  const status = element('p', 'form-status'); status.dataset.formStatus = ''; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  if (!readOnly) actions.append(edit, del);
  const basket = element('section', 'profile-basket');
  const basketTitle = element('h2', '', 'Корзина блюд'); basketTitle.id = 'basket-title'; basketTitle.tabIndex = -1;
  basket.append(basketTitle, element('p', 'basket-status', 'Загружаем корзину…'));
  data.append(fields, status, actions); layout.append(basket, data);
  document.getElementById('profile-container').replaceChildren(layout);
  app.profileId = id;
  app.openDialog(document.getElementById('profile-dialog'), layout.querySelector('#basket-title'), source);
  // Ошибка корзины не должна отключать каталог и его основные кнопки.
  import('../recipes/cart.js?v=20261016-buttons2').then(({ recipeBasket }) => {
    if (!basket.isConnected) return;
    const hadFocus = document.activeElement === basketTitle;
    const content = recipeBasket(user, app); basket.replaceWith(content);
    if (hadFocus) content.querySelector('#basket-title').focus({ preventScroll: true });
  }).catch(() => {
    basket.querySelector('.basket-status').textContent = 'Не удалось загрузить корзину. Перезагрузите страницу.';
  });
}
