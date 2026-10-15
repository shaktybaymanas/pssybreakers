import { createUser } from './api.js?v=20261016-buttons2';
import { buildForm, fillForm, readForm } from './form.js?v=20261016-buttons2';
export function initCreate(app) {
  const form = buildForm('create', 'Добавить человека');
  const dialog = document.getElementById('create-dialog');
  app.onCreate = function () {
    if (app.busy || !app.ready) return;
    fillForm(form);
    app.openDialog(dialog, form.elements.namedItem('firstName'));
  };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (app.busy || !app.ready) return;
    const data = readForm(form, app);
    if (!data) return;
    app.setBusy(true);
    try {
      await createUser(data);
      // POST выдаёт один и тот же серверный ID. Для новых записей нужны свои ID.
      const user = { ...data, id: app.nextLocalId-- };
      app.users.push(user); app.render();
      fillForm(form); dialog.close();
      app.showStatus('Человек добавлен.' + (app.isVisible(user) ? '' : ' Текущий поиск или фильтр скрывает новый профиль.'));
    } catch (error) { app.showStatus(error.message, true); }
    finally { app.setBusy(false); }
  });
}
