import { updateUser } from './api.js?v=20261016-buttons2';
import { buildForm, fillForm, readForm } from './form.js?v=20261016-buttons2';
export function initEdit(app) {
  const form = buildForm('edit', 'Сохранить изменения');
  const dialog = document.getElementById('edit-dialog');
  let editingId = null;
  app.onEdit = function (id) {
    if (app.busy || !app.ready) return;
    const user = app.users.find(item => item.id === id);
    if (!user) { app.showStatus('Этот человек уже удалён.', true); return; }
    editingId = id; fillForm(form, user);
    app.openDialog(dialog, form.elements.namedItem('firstName'));
  };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (app.busy || !app.ready) return;
    const user = app.users.find(item => item.id === editingId);
    if (!user) { dialog.close(); app.showStatus('Этот человек уже удалён. Изменения не сохранены.', true); return; }
    const data = readForm(form, app, editingId);
    if (!data) return;
    app.setBusy(true);
    try {
      if (editingId > 0) await updateUser(editingId, data);
      else app.showLocalOperation();
      Object.assign(user, data); // data не содержит id: исходный ID сохраняется.
      app.render(); dialog.close();
      app.showStatus('Изменения сохранены.' + (app.isVisible(user) ? '' : ' Профиль скрыт текущим поиском или фильтром.'));
    } catch (error) { app.showStatus(error.message, true); }
    finally { app.setBusy(false); }
  });
}
