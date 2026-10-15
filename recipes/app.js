import { mountRecipeReviews, reviewCount } from './reviews.js?v=20261016-buttons2';
import { confirmAction } from '../ui/confirm.js?v=20261016-buttons2';
// Задание 5: CRUD-запросы к тестовому API DummyJSON.
(() => {
  const endpoint = 'https://dummyjson.com/recipes';
  const list = document.getElementById('recipe-list');
  const status = document.getElementById('recipe-status');
  const form = document.getElementById('recipe-form');
  const nameInput = document.getElementById('recipe-name');
  const timeInput = document.getElementById('recipe-time');
  const ingredientsInput = document.getElementById('recipe-ingredients');
  const instructionsInput = document.getElementById('recipe-instructions');
  const editor = document.getElementById('recipe-editor-panel');
  const details = document.getElementById('recipe-details');
  const detailsTitle = document.getElementById('recipe-details-title');
  const detailsContent = document.getElementById('recipe-details-content');
  const formStatus = document.getElementById('recipe-form-status');
  const addButton = document.getElementById('recipe-add');
  const submitButton = document.getElementById('recipe-submit');
  const imageFile = document.getElementById('recipe-image-file');
  const imageUrl = document.getElementById('recipe-image-url');
  const imagePreview = document.getElementById('recipe-image-preview');
  const previewBox = document.getElementById('recipe-photo-preview');
  const photoMessage = document.getElementById('recipe-photo-message');
  const photoCaption = document.getElementById('recipe-photo-caption');
  const removePhoto = document.getElementById('recipe-image-remove');
  let recipes = [];
  let editingId = null;
  let nextLocalId = 100000;
  let photo = '';
  let photoVersion = 0; // Старый результат загрузки не должен заменить новое фото.
  let photoPending = false;
  let photoError = false;
  let saving = false;
  let confirming = false;
  let urlTimer;
  let editorOpener;
  let detailsOpener;

  function photoStatus(message, error = false) {
    photoMessage.textContent = message;
    photoMessage.dataset.error = String(error);
    photoError = error;
    submitButton.disabled = saving || photoPending || photoError;
  }
  function clearPhoto() {
    clearTimeout(urlTimer);
    photoVersion++;
    photo = '';
    photoPending = false;
    imageFile.value = '';
    imageUrl.value = '';
    previewBox.hidden = true;
    removePhoto.hidden = true;
    imagePreview.removeAttribute('src');
    photoCaption.textContent = '';
    photoStatus('Фото пока не выбрано.');
  }
  function beginPhoto() {
    clearTimeout(urlTimer);
    photo = '';
    photoPending = true;
    previewBox.hidden = true;
    removePhoto.hidden = false;
    photoStatus('Загружаем предпросмотр…');
    return ++photoVersion;
  }
  function failPhoto(version, message) {
    if (version !== photoVersion) return;
    photoPending = false;
    photoStatus(message, true);
  }
  function showPhoto(source, caption, version) {
    const probe = new Image();
    const timer = setTimeout(() => {
      probe.onload = probe.onerror = null;
      probe.src = '';
      failPhoto(version, 'Фото не загрузилось. Попробуйте другую ссылку или выберите файл.');
    }, 15000);
    probe.onload = () => {
      clearTimeout(timer);
      if (version !== photoVersion) return;
      photo = source;
      photoPending = false;
      imagePreview.src = source;
      photoCaption.textContent = caption;
      previewBox.hidden = false;
      photoStatus('Фото готово. Оно появится на карточке после сохранения.');
    };
    probe.onerror = () => {
      clearTimeout(timer);
      failPhoto(version, 'Не удалось открыть изображение. Нужна прямая ссылка на фото или другой файл.');
    };
    probe.src = source;
  }
  imageFile.addEventListener('change', () => {
    const file = imageFile.files[0];
    if (!file) return;
    imageUrl.value = '';
    const version = beginPhoto();
    if (!file.type.startsWith('image/')) {
      failPhoto(version, 'Выберите файл изображения.'); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      failPhoto(version, 'Файл больше 10 МБ. Выберите фото меньшего размера.'); return;
    }
    // Data URL позволяет показать выбранный файл без отдельного сервера загрузки.
    const reader = new FileReader();
    reader.onload = () => {
      if (version === photoVersion) showPhoto(reader.result, file.name, version);
    };
    reader.onerror = () => failPhoto(version, 'Не удалось прочитать файл. Выберите его ещё раз.');
    reader.readAsDataURL(file);
  });
  imageUrl.addEventListener('input', () => {
    imageFile.value = '';
    const source = imageUrl.value.trim();
    if (!source) { clearPhoto(); return; }
    const version = beginPhoto();
    try {
      const url = new URL(source);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
    } catch {
      failPhoto(version, 'Вставьте прямую ссылку, начинающуюся с https:// или http://.'); return;
    }
    urlTimer = setTimeout(() => showPhoto(source, 'Фото по ссылке', version), 350);
  });
  removePhoto.addEventListener('click', clearPhoto);

  function setSaving(value) {
    saving = value;
    document.getElementById('recipe-fields').disabled = value;
    addButton.disabled = value;
    document.getElementById('recipe-load').disabled = value;
    document.getElementById('recipe-editor-close').disabled = value;
    document.getElementById('recipe-cancel').disabled = value;
    list.querySelectorAll('button').forEach(button => { button.disabled = value; });
    submitButton.disabled = value || photoPending || photoError;
  }
  // showModal() затемняет фон и удерживает фокус внутри окна.
  function syncModalScroll() {
    document.body.classList.toggle('recipe-modal-open', editor.open || details.open);
  }
  function restoreEditorFocus() {
    const target = editorOpener && editorOpener.isConnected ? editorOpener : addButton;
    target.focus({preventScroll:true});
  }
  function openEditor(opener = addButton) {
    editorOpener = opener;
    if (!editor.open) editor.showModal();
    editor.scrollTop = 0;
    addButton.setAttribute('aria-expanded', 'true');
    syncModalScroll();
    nameInput.focus({preventScroll:true});
  }
  function closeEditor() {
    if (saving) return;
    if (editor.open) editor.close();
    resetForm();
    addButton.setAttribute('aria-expanded', 'false');
    syncModalScroll();
    if (!saving) restoreEditorFocus();
  }
  function closeDetails() {
    if (details.open) details.close();
    syncModalScroll();
    const target = detailsOpener && detailsOpener.isConnected ? detailsOpener : addButton;
    target.focus({preventScroll:true});
  }
  function openDetails(id, opener, focusReviews = false) {
    if (saving) return;
    const recipe = recipes.find(item => item.id === id);
    if (!recipe) return;
    detailsOpener = opener;
    detailsTitle.textContent = recipe.name || 'Без названия';
    detailsContent.replaceChildren();
    const prep = Number(recipe.prepTimeMinutes) || 0;
    const cook = Number(recipe.cookTimeMinutes) || 0;
    const meta = ['ID: ' + recipe.id, 'Время: ' + (prep + cook) + ' мин.'];
    if (recipe.cuisine) meta.push('Кухня: ' + recipe.cuisine);
    if (recipe.servings) meta.push('Порций: ' + recipe.servings);
    detailsContent.append(element('p', meta.join(' · '), 'recipe-details-meta'));
    if (recipe.image) {
      const img = element('img', undefined, 'recipe-details-image');
      img.alt = recipe.name || 'Фото блюда';
      img.addEventListener('error', () => {
        img.replaceWith(element('p', 'Фото недоступно', 'recipe-image-fallback'));
      }, {once:true});
      img.src = recipe.image;
      detailsContent.append(img);
    }
    const grid = element('div', undefined, 'recipe-details-grid');
    const ingredients = element('section');
    ingredients.append(element('h3', 'Ингредиенты'));
    const ingredientsList = element('ul');
    for (const item of recipe.ingredients || []) ingredientsList.append(element('li', item));
    ingredients.append(ingredientsList.children.length ? ingredientsList : element('p', 'Ингредиенты не указаны.'));
    const instructions = element('section');
    instructions.append(element('h3', 'Как приготовить'));
    const steps = element('ol');
    for (const step of recipe.instructions || []) steps.append(element('li', step));
    instructions.append(steps.children.length ? steps : element('p', 'Шаги приготовления не указаны.'));
    grid.append(ingredients, instructions);
    detailsContent.append(grid);
    const reviewsContainer = element('section', undefined, 'recipe-reviews');
    detailsContent.append(reviewsContainer);
    if (!details.open) details.showModal();
    details.scrollTop = 0;
    syncModalScroll();
    detailsTitle.focus({preventScroll:true});
    mountRecipeReviews(reviewsContainer, recipe, () => {
      const summary = list.querySelector(`[data-reviews-for="${recipe.id}"]`);
      if (summary) summary.textContent = `Отзывы (${reviewCount(recipe.id)}) →`;
    }).then(heading => {
      if (focusReviews && details.open && reviewsContainer.isConnected) {
        reviewsContainer.scrollIntoView({block:'start'}); heading.focus({preventScroll:true});
      }
    });
  }

  function setStatus(message) {
    status.textContent = message;
    if (editor.open) formStatus.textContent = message;
  }
  async function request(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status + ' ' + response.statusText);
      const data = await response.json();
      setStatus('HTTP ' + response.status + ' ' + response.statusText);
      return data;
    } catch (error) {
      if (controller.signal.aborted) throw new Error('Сервер не ответил за 15 секунд. Повторите попытку.');
      if (error instanceof TypeError) throw new Error('Нет связи с DummyJSON. Проверьте интернет и повторите попытку.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function render() {
    list.replaceChildren();
    if (!recipes.length) { list.append(element('p', 'Рецептов пока нет. Нажмите «Загрузить рецепты».', 'result')); return; }
    for (const recipe of recipes) {
      const card = element('article', undefined, 'recipe-item');
      if (recipe.image) {
        const img = document.createElement('img');
        img.src = recipe.image;
        img.alt = recipe.name || 'Фото блюда';
        img.loading = 'lazy';
        img.addEventListener('error', () => {
          img.replaceWith(element('div', 'Фото недоступно', 'recipe-image-fallback'));
        }, {once:true});
        card.append(img);
      }
      const info = element('div', undefined, 'recipe-info');
      const heading = element('h3');
      const open = element('button', recipe.name || 'Без названия', 'recipe-open');
      open.type = 'button';
      open.setAttribute('aria-haspopup', 'dialog');
      open.setAttribute('aria-controls', 'recipe-details');
      open.setAttribute('aria-label', 'Открыть рецепт: ' + (recipe.name || 'Без названия'));
      open.addEventListener('click', () => openDetails(recipe.id, open));
      heading.append(open);
      info.append(heading);
      const totalTime = (Number(recipe.prepTimeMinutes) || 0) + (Number(recipe.cookTimeMinutes) || 0);
      info.append(element('p', 'ID: ' + recipe.id + ' · ' + totalTime + ' мин.'));
      info.append(element('p', 'Ингредиенты: ' + (recipe.ingredients || []).join(', ')));
      info.append(element('p', 'Нажмите, чтобы посмотреть приготовление →', 'recipe-open-hint'));
      const reviewLink = element('button', `Отзывы (${reviewCount(recipe.id)}) →`, 'recipe-reviews-link');
      reviewLink.type = 'button'; reviewLink.dataset.reviewsFor = recipe.id;
      reviewLink.setAttribute('aria-label', 'Отзывы к рецепту: ' + (recipe.name || 'Без названия'));
      reviewLink.setAttribute('aria-haspopup', 'dialog');
      reviewLink.addEventListener('click', () => openDetails(recipe.id, reviewLink, true));
      info.append(reviewLink);
      // Кнопки изменения и удаления выполняют только своё действие.
      card.addEventListener('click', event => {
        if (!event.target.closest('button')) openDetails(recipe.id, open);
      });
      const actions = element('div', undefined, 'recipe-buttons');
      const edit = element('button', 'PUT · Изменить'); edit.type = 'button';
      edit.addEventListener('click', () => startEdit(recipe.id, edit));
      const del = element('button', 'DELETE · Удалить'); del.type = 'button';
      del.addEventListener('click', () => deleteRecipe(recipe.id));
      actions.append(edit, del); info.append(actions); card.append(info); list.append(card);
    }
  }
  async function loadRecipes() {
    if (saving || confirming) return;
    setSaving(true);
    setStatus('GET · Загрузка...');
    try {
      const data = await request(endpoint + '?limit=12');
      if (!Array.isArray(data.recipes)) throw new Error('Сервер вернул неверный список рецептов.');
      recipes = data.recipes;
      render();
    } catch (error) { setStatus('GET · Ошибка: ' + error.message); }
    finally { setSaving(false); }
  }
  function resetForm() {
    editingId = null; form.reset();
    clearPhoto();
    formStatus.textContent = '';
    document.getElementById('recipe-form-title').textContent = 'Добавить свой рецепт · POST';
    document.getElementById('recipe-submit').textContent = 'POST · Добавить';
  }
  function startEdit(id, opener) {
    if (saving) return;
    const recipe = recipes.find(item => item.id === id);
    if (!recipe) return;
    resetForm();
    editingId = id;
    nameInput.value = recipe.name || '';
    timeInput.value = recipe.prepTimeMinutes || 60;
    ingredientsInput.value = (recipe.ingredients || []).join(', ');
    instructionsInput.value = (recipe.instructions || []).join('\n');
    document.getElementById('recipe-form-title').textContent = 'Изменить рецепт #' + id + ' · PUT';
    document.getElementById('recipe-submit').textContent = 'PUT · Сохранить';
    if (recipe.image) {
      if (!recipe.image.startsWith('data:')) imageUrl.value = recipe.image;
      showPhoto(recipe.image, 'Текущее фото рецепта', beginPhoto());
    }
    openEditor(opener);
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || photoPending || photoError) return;
    if (!form.reportValidity()) return;
    const payload = {
      name: nameInput.value.trim(),
      prepTimeMinutes: Number(timeInput.value),
      ingredients: ingredientsInput.value.split(',').map(s => s.trim()).filter(Boolean),
      instructions: instructionsInput.value.split('\n').map(s => s.trim()).filter(Boolean),
      image: photo
    };
    if (!payload.name || !payload.ingredients.length || !payload.instructions.length) {
      setStatus('Заполните все поля.'); return;
    }
    const id = editingId;
    const method = id === null ? 'POST' : 'PUT';
    setSaving(true);
    setStatus(method + ' · Отправка...');
    try {
      if (id !== null && id >= 100000) {
        // Новые локальные рецепты не существуют на Fake API.
        recipes = recipes.map(r => r.id === id ? {...r, ...payload} : r);
        setStatus('Локальное изменение: рецепт #' + id + ' (без HTTP-запроса)');
      } else {
        const url = id === null ? endpoint + '/add' : endpoint + '/' + id;
        // Фото с устройства остаётся в карточке: Fake API не хранит загруженные файлы.
        const apiPayload = {...payload};
        if (apiPayload.image.startsWith('data:')) delete apiPayload.image;
        await request(url, {
          method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(apiPayload)
        });
        if (id === null) {
          recipes.unshift({...payload, id: nextLocalId++});
          setStatus('HTTP 201 Created · Добавлено на страницу (Fake API не сохраняет данные)');
        } else {
          recipes = recipes.map(r => r.id === id ? {...r, ...payload} : r);
          setStatus('HTTP 200 OK · Изменено на странице (Fake API не сохраняет данные)');
        }
      }
      render(); setSaving(false); closeEditor();
    } catch (error) { setStatus(method + ' · Ошибка: ' + error.message); }
    finally { setSaving(false); if (!editor.open) restoreEditorFocus(); }
  });
  async function deleteRecipe(id) {
    if (saving || confirming) return;
    const recipe = recipes.find(item => item.id === id);
    if (!recipe) return;
    confirming = true;
    let accepted;
    try { accepted = await confirmAction({ message: `Удалить «${recipe.name}»?` }); }
    finally { confirming = false; }
    if (!accepted || saving) return;
    setSaving(true);
    setStatus('DELETE · Отправка...');
    try {
      if (id < 100000) {
        const result = await request(endpoint + '/' + id, {method:'DELETE'});
        if (result.isDeleted !== true) throw new Error('Сервер не подтвердил удаление.');
        setStatus('HTTP 200 OK · Удалено со страницы (Fake API не сохраняет данные)');
      } else setStatus('Локальное удаление: рецепт #' + id + ' (без HTTP-запроса)');
      recipes = recipes.filter(r => r.id !== id);
      render();
    } catch (error) { setStatus('DELETE · Ошибка: ' + error.message); }
    finally { setSaving(false); if (editingId === id && !recipes.some(item => item.id === id)) closeEditor(); addButton.focus(); }
  }
  document.getElementById('recipe-load').addEventListener('click', loadRecipes);
  addButton.addEventListener('click', () => {
    if (saving || confirming) return;
    if (editor.open && editingId === null) { nameInput.focus(); return; }
    resetForm(); openEditor();
  });
  document.getElementById('recipe-cancel').addEventListener('click', closeEditor);
  document.getElementById('recipe-editor-close').addEventListener('click', closeEditor);
  document.getElementById('recipe-details-close').addEventListener('click', closeDetails);
  document.getElementById('recipe-details-done').addEventListener('click', closeDetails);
  editor.addEventListener('cancel', event => {
    event.preventDefault();
    if (!saving) closeEditor();
  });
  details.addEventListener('cancel', event => {
    event.preventDefault();
    closeDetails();
  });
  function closeOnBackdrop(dialog, close) {
    let startedOutside = false;
    const isOutside = event => {
      const rect = dialog.getBoundingClientRect();
      return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
    };
    dialog.addEventListener('pointerdown', event => { startedOutside = isOutside(event); });
    dialog.addEventListener('click', event => {
      if (startedOutside && isOutside(event) && !saving) close();
      startedOutside = false;
    });
    dialog.addEventListener('close', syncModalScroll);
  }
  closeOnBackdrop(editor, closeEditor);
  closeOnBackdrop(details, closeDetails);
  window.addEventListener('hashchange', () => {
    if (document.getElementById('panel-task5').hidden) {
      if (editor.open && !saving) closeEditor();
      if (details.open) closeDetails();
    }
  });
  render();
})();

