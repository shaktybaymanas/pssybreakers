import { getUsers } from '../users/api.js?v=20261016-buttons2';
import { fullName } from '../users/model.js?v=20261016-buttons2';
import { element, showProfile, userCard } from '../users/details.js?v=20261016-buttons2';
import { ReviewStore } from './review-store.js?v=20261016-buttons2';

const reviews = new ReviewStore();
let usersPromise;
let authorDialog;
let authorOpener;
export const reviewCount = recipeId => reviews.get(recipeId).length;

function loadUsers() {
  if (!usersPromise) usersPromise = getUsers().catch(error => { usersPromise = null; throw error; });
  return usersPromise;
}

function openAuthor(userId, users, source) {
  if (!authorDialog) {
    authorDialog = element('dialog', 'recipe-dialog recipe-author-dialog');
    authorDialog.id = 'profile-dialog'; authorDialog.setAttribute('aria-labelledby', 'profile-title');
    const close = element('button', 'recipe-dialog-close author-close', '×');
    close.type = 'button'; close.setAttribute('aria-label', 'Закрыть профиль автора');
    close.addEventListener('click', () => authorDialog.close());
    const container = element('div'); container.id = 'profile-container';
    const footer = element('div', 'author-footer');
    const back = element('button', 'recipe-secondary', '← Вернуться к рецепту'); back.type = 'button';
    back.addEventListener('click', () => authorDialog.close());
    const catalog = element('a', 'author-catalog', 'Открыть в каталоге людей ↗'); catalog.id = 'author-catalog-link';
    footer.append(back, catalog); authorDialog.append(close, container, footer); document.body.append(authorDialog);
    authorDialog.addEventListener('close', () => {
      if (authorOpener?.isConnected && document.getElementById('recipe-details').open) authorOpener.focus({ preventScroll: true });
    });
    document.getElementById('recipe-details').addEventListener('close', () => { if (authorDialog.open) authorDialog.close(); });
    window.addEventListener('hashchange', () => { if (authorDialog.open) authorDialog.close(); });
  }
  authorOpener = source;
  document.getElementById('author-catalog-link').href = `users.html?user=${userId}`;
  const profileApp = {
    users, ready: true, busy: false,
    openDialog(dialog, initialFocus) { dialog.showModal(); dialog.scrollTop = 0; initialFocus.focus({ preventScroll: true }); }
  };
  showProfile(profileApp, userId, source, { readOnly: true });
}

export async function mountRecipeReviews(container, recipe, onChange = () => {}) {
  const headingRow = element('div', 'reviews-heading');
  const heading = element('h3', '', 'Отзывы о блюде'); heading.id = `reviews-title-${recipe.id}`; heading.tabIndex = -1;
  const count = element('span', 'reviews-count');
  headingRow.append(heading, count);
  const note = element('p', 'reviews-note', 'Учебные отзывы. Тексты придуманы для задания, профили авторов взяты из DummyJSON. Нажмите на автора, чтобы открыть его профиль.');
  const status = element('p', 'reviews-status', 'Загружаем профили авторов…'); status.setAttribute('role', 'status');
  const retry = element('button', 'recipe-secondary', 'Повторить загрузку авторов'); retry.type = 'button'; retry.hidden = true;
  const list = element('div', 'reviews-list');
  const form = element('form', 'review-form'); form.noValidate = true;
  const fieldset = element('fieldset'); fieldset.disabled = true;
  const legend = element('legend', '', 'Добавить учебный отзыв');
  const controls = element('div', 'review-form-controls');
  const authorField = element('div', 'review-field');
  const authorLabel = element('label', '', 'Автор (учебный режим)');
  const author = element('select'); author.id = `review-author-${recipe.id}`; author.name = 'author'; author.required = true; authorLabel.htmlFor = author.id; authorField.append(authorLabel, author);
  const ratingField = element('div', 'review-field');
  const ratingLabel = element('label', '', 'Оценка');
  const rating = element('select'); rating.id = `review-rating-${recipe.id}`; ratingLabel.htmlFor = rating.id;
  for (let value = 5; value >= 1; value--) { const option = element('option', '', `${value} из 5`); option.value = value; rating.append(option); }
  ratingField.append(ratingLabel, rating); controls.append(authorField, ratingField);
  const textField = element('div', 'review-field');
  const textLabel = element('label', '', 'Ваш отзыв');
  const text = element('textarea'); text.id = `review-text-${recipe.id}`; textLabel.htmlFor = text.id; text.name = 'body'; text.required = true; text.maxLength = 1000; text.rows = 3; text.placeholder = 'Что понравилось и что можно улучшить?'; textField.append(textLabel, text);
  const hint = element('p', 'reviews-note', 'Отзыв сохранится только на этой странице до перезагрузки. Выбор автора не является входом в аккаунт.');
  const submit = element('button', 'action', 'Добавить отзыв'); submit.type = 'submit';
  fieldset.append(legend, controls, textField, hint, submit); form.append(fieldset);
  container.setAttribute('aria-labelledby', heading.id); container.replaceChildren(headingRow, note, status, retry, list, form);
  let users = [];

  function render() {
    const items = reviews.get(recipe.id); count.textContent = String(items.length);
    const fragment = document.createDocumentFragment();
    for (const review of items) {
      const item = element('article', 'recipe-review');
      const user = users.find(person => person.id === review.userId);
      if (user) {
        const button = element('button', 'recipe-review-author'); button.type = 'button';
        button.setAttribute('aria-label', `Открыть профиль автора: ${fullName(user)}`); button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-controls', 'profile-dialog');
        button.append(userCard(user)); button.addEventListener('click', () => openAuthor(user.id, users, button)); item.append(button);
      } else item.append(element('p', 'review-author-unavailable', `Автор #${review.userId} · профиль пока недоступен`));
      const meta = element('div', 'review-meta');
      const stars = element('span', 'review-stars', '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating)); stars.setAttribute('aria-label', `Оценка ${review.rating} из 5`);
      meta.append(stars, element('span', 'review-source', review.source === 'demo' ? 'Учебный пример' : 'Добавлен на этой странице'));
      item.append(meta, element('p', 'review-body', review.body)); fragment.append(item);
    }
    if (!items.length) fragment.append(element('p', 'reviews-note', 'Отзывов пока нет. Добавьте первый учебный отзыв.'));
    list.replaceChildren(fragment);
  }
  render();
  async function load() {
    retry.hidden = true; fieldset.disabled = true; status.textContent = 'Загружаем профили авторов…'; status.dataset.error = 'false';
    try {
      users = await loadUsers();
      if (!container.isConnected) return;
      const placeholder = element('option', '', 'Выберите автора'); placeholder.value = ''; author.replaceChildren(placeholder);
      for (const user of [...users].sort((a, b) => fullName(a).localeCompare(fullName(b)))) {
        const option = element('option', '', `${fullName(user)} (@${user.username})`); option.value = user.id; author.append(option);
      }
      render(); fieldset.disabled = false; status.textContent = '';
    } catch (error) {
      if (!container.isConnected) return;
      status.textContent = error.message; status.dataset.error = 'true'; retry.hidden = false;
    }
  }
  retry.addEventListener('click', load);
  text.addEventListener('input', () => text.setCustomValidity(''));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (fieldset.disabled) return;
    text.value = text.value.trim(); text.setCustomValidity('');
    if (!form.reportValidity()) return;
    try {
      reviews.add({ recipeId: recipe.id, userId: author.value, rating: rating.value, body: text.value }, users);
      render(); onChange(); text.value = ''; status.dataset.error = 'false';
      status.textContent = 'Отзыв добавлен на этой странице. После перезагрузки он исчезнет.';
      text.focus();
    } catch (error) { status.textContent = error.message; status.dataset.error = 'true'; }
  });
  await load();
  return heading;
}
