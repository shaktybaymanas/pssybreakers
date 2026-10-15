import { deleteUser } from './api.js?v=20261016-buttons2';
import { fullName } from './model.js?v=20261016-buttons2';
import { confirmAction } from '../ui/confirm.js?v=20261016-buttons2';
export function initDelete(app) {
  let confirming = false;
  app.onDelete = async function (id) {
    if (app.busy || !app.ready || confirming) return;
    const user = app.users.find(item => item.id === id);
    if (!user) return;
    confirming = true;
    let accepted;
    try { accepted = await confirmAction({ message: `Удалить ${fullName(user)} (@${user.username})?` }); }
    finally { confirming = false; }
    if (!accepted || app.busy || !app.users.some(item => item.id === id)) return;
    app.setBusy(true);
    let deleted = false;
    try {
      if (id > 0) {
        const result = await deleteUser(id);
        if (result.isDeleted !== true) throw new Error('Сервер не подтвердил удаление. Человек остался в списке.');
      } else app.showLocalOperation();
      app.users = app.users.filter(item => item.id !== id); app.render();
      if (app.profileId === id) document.getElementById('profile-dialog').close();
      app.showStatus('Человек удалён.'); deleted = true;
    } catch (error) { app.showStatus(error.message, true); }
    finally {
      app.setBusy(false);
      if (deleted) requestAnimationFrame(() => app.focusList());
      else if (!document.querySelector('dialog[open]')) app.focusList(id, 'delete');
    }
  };
}
