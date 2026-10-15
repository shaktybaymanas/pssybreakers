// Чистые функции: обработка данных без DOM и сетевых запросов.
export const roleLabels = Object.freeze({ user: 'Пользователь', moderator: 'Модератор', admin: 'Админ' });
export const editableFields = ['firstName', 'lastName', 'username', 'role', 'image', 'email', 'phone', 'description'];
export const fullName = user => `${user.firstName} ${user.lastName}`.trim();
export function httpUrl(value) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}
export function editableData(value) {
  return Object.fromEntries(editableFields.map(key => [key, String(value[key] ?? '').trim()]));
}
export function normalizeUser(raw) {
  return {
    id: Number(raw.id), firstName: String(raw.firstName ?? ''), lastName: String(raw.lastName ?? ''),
    username: String(raw.username ?? ''), role: Object.hasOwn(roleLabels, raw.role) ? raw.role : 'user',
    image: httpUrl(raw.image) ? raw.image : '', email: String(raw.email ?? ''), phone: String(raw.phone ?? ''),
    description: [raw.company?.title, raw.company?.name, raw.company?.department].filter(Boolean).join(' · ')
  };
}
export function validateUser(value, users, excludedId = null) {
  const data = editableData(value);
  const fail = (field, message) => { throw Object.assign(new Error(message), { field }); };
  for (const field of ['firstName', 'lastName']) {
    if (!data[field] || data[field].length > 60) fail(field, 'Имя и фамилия должны содержать от 1 до 60 символов.');
  }
  if (!/^[A-Za-z0-9_.-]{3,30}$/.test(data.username)) fail('username', 'Ник: 3–30 латинских букв, цифр или символов _ . - без @.');
  if (users.some(user => user.id !== excludedId && user.username.toLowerCase() === data.username.toLowerCase())) fail('username', 'Этот ник уже занят. Выберите другой.');
  if (!Object.hasOwn(roleLabels, data.role)) fail('role', 'Выберите одну из трёх доступных ролей.');
  if (data.description.length > 1000) fail('description', 'Описание должно быть не длиннее 1000 символов.');
  if (data.phone.length > 40) fail('phone', 'Телефон должен быть не длиннее 40 символов.');
  if (data.email && !/^[^\s@]+@[^\s@]+$/.test(data.email)) fail('email', 'Введите корректную почту.');
  if (data.image && !httpUrl(data.image)) fail('image', 'Ссылка на фото должна начинаться с http:// или https://.');
  return data;
}
export function matchesUser(user, query = '', role = 'all') {
  const search = query.trim().replace(/^@/, '').toLocaleLowerCase();
  return (role === 'all' || user.role === role) && `${fullName(user)} ${user.username}`.toLocaleLowerCase().includes(search);
}
export function selectUsers(users, query, role, order = 'asc') {
  const direction = order === 'desc' ? -1 : 1;
  return users.filter(user => matchesUser(user, query, role)).sort((a, b) => direction * fullName(a).localeCompare(fullName(b), ['ru', 'en'], { sensitivity: 'base' }) || a.id - b.id);
}
