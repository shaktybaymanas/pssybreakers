// Подтверждение внутри страницы не блокирует встроенный браузер системным confirm().
export function confirmAction({ title = 'Подтвердить удаление', message, confirmLabel = 'Удалить' }) {
  if (document.querySelector('.action-confirm[open]')) return Promise.resolve(false);
  const opener = document.activeElement;
  const dialog = document.createElement('dialog'); dialog.className = 'action-confirm';
  dialog.setAttribute('aria-labelledby', 'action-confirm-title');
  dialog.setAttribute('aria-describedby', 'action-confirm-message');
  const heading = document.createElement('h2'); heading.id = 'action-confirm-title'; heading.textContent = title;
  const description = document.createElement('p'); description.id = 'action-confirm-message'; description.textContent = message;
  const actions = document.createElement('div'); actions.className = 'action-confirm-buttons';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Отмена';
  const accept = document.createElement('button'); accept.type = 'button'; accept.textContent = confirmLabel; accept.className = 'action-confirm-accept';
  actions.append(cancel, accept); dialog.append(heading, description, actions); document.body.append(dialog);
  return new Promise(resolve => {
    let accepted = false;
    cancel.addEventListener('click', () => dialog.close());
    accept.addEventListener('click', () => { accepted = true; dialog.close(); });
    dialog.addEventListener('cancel', event => { event.preventDefault(); dialog.close(); });
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (opener?.isConnected && !opener.disabled) opener.focus({ preventScroll: true });
      resolve(accepted);
    }, { once: true });
    dialog.showModal(); cancel.focus();
  });
}
