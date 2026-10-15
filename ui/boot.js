// Обычный скрипт показывает ошибку, даже если один из ES-модулей не загрузился.
(() => {
  const script = document.currentScript;
  if (location.protocol === 'file:') {
    const status = document.getElementById(script.dataset.status);
    if (status) {
      status.dataset.error = 'true';
      status.textContent = 'Для заданий 5 и 6 запустите START-SITE.cmd из папки сайта. Он откроет сайт через локальный сервер.';
      const link = document.createElement('a');
      link.className = 'button secondary recipe-secondary';
      link.textContent = 'Открыть сайт, если сервер уже запущен';
      link.href = 'http://127.0.0.1:8000/' + (script.dataset.entry.startsWith('users/') ? 'users.html' : 'index.html#task5');
      status.after(link);
    }
    document.getElementById('user-count')?.replaceChildren('Откройте сайт через START-SITE.cmd');
    document.getElementById('user-list')?.setAttribute('aria-busy', 'false');
    document.querySelectorAll('#recipe-load, #recipe-add').forEach(button => { button.disabled = true; });
    return;
  }
  const entry = new URL(script.dataset.entry, document.baseURI);
  const version = new URL(script.src).searchParams.get('v');
  if (version) entry.searchParams.set('v', version);
  import(entry.href).catch(error => {
    console.error('Не удалось запустить страницу:', error);
    const status = document.getElementById(script.dataset.status);
    if (!status) return;
    status.dataset.error = 'true';
    status.textContent = 'Не удалось загрузить код страницы. Перезагрузите сайт.';
    const retry = document.createElement('button');
    retry.type = 'button'; retry.className = 'button secondary recipe-secondary'; retry.textContent = 'Перезагрузить страницу';
    retry.addEventListener('click', () => location.reload());
    status.after(retry);
    document.getElementById('user-count')?.replaceChildren('Каталог не запущен');
    document.getElementById('user-list')?.setAttribute('aria-busy', 'false');
  });
})();
