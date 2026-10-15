import { createRecipeBasket, getRecipeChoices } from './cart-store.js?v=20261016-buttons2';
import { httpUrl } from '../users/model.js?v=20261016-buttons2';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function recipeBasket(user, app) {
  const section = el('section', 'profile-basket');
  section.setAttribute('aria-labelledby', 'basket-title');
  const heading = el('div', 'basket-heading');
  const title = el('h2', '', 'Корзина блюд'); title.id = 'basket-title'; title.tabIndex = -1;
  const count = el('span', 'basket-count', '—'); count.setAttribute('aria-label', 'Всего порций');
  heading.append(title, count);
  const list = el('ul', 'basket-list');
  const total = el('p', 'basket-total'); total.hidden = true;
  const status = el('p', 'basket-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const retry = el('button', 'cart-button', 'Повторить загрузку'); retry.type = 'button'; retry.hidden = true;
  retry.addEventListener('click', loadBasket);
  let loading = false;
  section.append(el('p', 'eyebrow', 'Выбор · @' + user.username), heading,
    el('p', 'basket-intro', 'Выбранные блюда пользователя.'), list, total, status, retry,
    el('p', 'basket-note', 'Учебный пример: корзина заполнена автоматически.'));

  function draw(items) {
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    count.textContent = String(quantity);
    total.textContent = `Блюд: ${items.length} · Порций: ${quantity}`;
    total.hidden = !items.length;
    list.replaceChildren();
    if (!items.length) list.append(el('li', 'basket-empty', 'Нет доступных блюд.'));
    for (const item of items) {
      const row = el('li', 'basket-item'); row.dataset.recipeId = String(item.id);
      const photo = el('span', 'basket-photo', '🍽'); photo.setAttribute('aria-hidden', 'true');
      if (httpUrl(item.image)) {
        const image = el('img'); image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer';
        image.addEventListener('error', () => image.remove(), { once: true }); image.src = item.image; photo.append(image);
      }
      const info = el('div', 'basket-item-info');
      info.append(el('h3', '', item.name), el('p', 'basket-quantity', `Количество: ${item.quantity} порц.`));
      row.append(photo, info); list.append(row);
    }
  }

  async function loadBasket() {
    if (loading || app.busy || !app.ready) return;
    loading = true; retry.hidden = true; section.setAttribute('aria-busy', 'true');
    status.textContent = 'Загружаем корзину…'; status.dataset.error = 'false';
    try {
      const recipes = await getRecipeChoices();
      draw(createRecipeBasket(user.id, recipes));
      status.textContent = '';
    } catch (error) {
      status.textContent = error.message; status.dataset.error = 'true'; retry.hidden = false;
    } finally { loading = false; section.setAttribute('aria-busy', 'false'); }
  }
  loadBasket();
  return section;
}
