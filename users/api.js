import { editableData, normalizeUser } from './model.js?v=20261016-buttons2';
export { roleLabels } from './model.js?v=20261016-buttons2';
const baseUrl = 'https://dummyjson.com';
export const timeoutMs = 15000;

function report(method, path, status, isError = false) {
  if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('users:request', { detail: { method, path: path.split('?')[0], status, isError } }));
}
async function request(path, method = 'GET', data) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let receivedResponse = false;
  try {
    const response = await fetch(baseUrl + path, {
      method, signal: controller.signal,
      ...(data === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editableData(data)) })
    });
    receivedResponse = true;
    report(method, path, response.status, !response.ok);
    if (!response.ok) throw new Error(`${method}: ошибка HTTP ${response.status}. Изменения не применены. Попробуйте ещё раз.`);
    const result = await response.json();
    if (!result || typeof result !== 'object') throw new Error('Сервер вернул некорректные данные.');
    return result;
  } catch (error) {
    if (controller.signal.aborted) {
      report(method, path, 'таймаут', true);
      throw new Error('Сервер не ответил за 15 секунд. Попробуйте ещё раз.');
    }
    if (!receivedResponse) {
      report(method, path, 'нет соединения', true);
      throw new Error('Не удалось связаться с DummyJSON. Проверьте интернет и повторите попытку.');
    }
    if (error instanceof SyntaxError) throw new Error('Сервер вернул неверный JSON. Повторите попытку.');
    throw error;
  } finally { clearTimeout(timeout); }
}
export async function getUsers() {
  const result = await request('/users?limit=0&select=firstName,lastName,username,image,email,phone,company,role');
  if (!Array.isArray(result.users) || result.users.some(user => !user || !Number.isInteger(Number(user.id)) || Number(user.id) <= 0)) throw new Error('Сервер вернул неверный список людей.');
  return [...new Map(result.users.map(user => [Number(user.id), normalizeUser(user)])).values()];
}
export const createUser = data => request('/users/add', 'POST', data);
function serverId(id) {
  if (!Number.isInteger(id) || id <= 0) throw new Error('Для запроса нужен положительный ID пользователя.');
  return id;
}
export const updateUser = (id, data) => request(`/users/${serverId(id)}`, 'PUT', data);
export const deleteUser = id => request(`/users/${serverId(id)}`, 'DELETE');
