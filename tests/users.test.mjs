import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getUsers, createUser, updateUser, deleteUser, timeoutMs } from '../users/api.js';
import { normalizeUser, validateUser, selectUsers, matchesUser, editableFields } from '../users/model.js';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
const user = { firstName: 'Emily', lastName: 'Johnson', username: 'emilys', role: 'admin', image: '', email: '', phone: '', description: '' };
const data = changes => ({ ...user, ...changes });
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('normalization selects only public fields and composes company description', () => {
  const result = normalizeUser({ ...user, id: 1, password: 'secret', bank: {}, company: { title: 'Developer', name: 'Acme', department: 'IT' } });
  assert.deepEqual(Object.keys(result).sort(), ['id', ...editableFields].sort());
  assert.equal(result.description, 'Developer · Acme · IT');
  assert.equal(result.image, '');
  assert.equal(normalizeUser({ id: 2, role: 'root', image: 'javascript:alert(1)' }).role, 'user');
});
test('required names are trimmed and length limited', () => {
  assert.equal(validateUser(data({ firstName: ' Emily ' }), []).firstName, 'Emily');
  for (const firstName of ['', '   ', 'a'.repeat(61)]) assert.throws(() => validateUser(data({ firstName }), []));
  assert.throws(() => validateUser(data({ lastName: '\t' }), []));
});
test('username rules reject @, spaces, Cyrillic and invalid lengths', () => {
  for (const username of ['@emily', 'ab', 'имя', 'a b', 'a'.repeat(31)]) assert.throws(() => validateUser(data({ username }), []));
  assert.equal(validateUser(data({ username: 'my.name_1-2' }), []).username, 'my.name_1-2');
});
test('case-insensitive duplicate username; editing excludes own ID', () => {
  const users = [{ ...user, id: 1 }];
  assert.throws(() => validateUser(data({ username: 'EMILYS' }), users));
  assert.equal(validateUser(data({ username: 'EMILYS' }), users, 1).username, 'EMILYS');
});
test('validates role, optional URL, phone, email and description', () => {
  for (const change of [{ role: '__proto__' }, { role: 'owner' }, { image: 'javascript:alert(1)' }, { image: '/relative.jpg' }, { image: 'file:///tmp/a.png' }, { phone: '1'.repeat(41) }, { description: 'a'.repeat(1001) }, { email: 'invalid' }]) assert.throws(() => validateUser(data(change), []));
  assert.equal(validateUser(data({ image: 'https://example.com/a.png', email: 'a@example.com' }), []).email, 'a@example.com');
});
test('filter, search with @ and sort never mutate the source array', () => {
  const users = [{ ...data({ firstName: 'Zoe', role: 'user' }), id: 1 }, { ...data({ firstName: 'Anna', username: 'anna' }), id: 2 }];
  assert.deepEqual(selectUsers(users, '', 'all').map(u => u.id), [2, 1]);
  assert.deepEqual(selectUsers(users, '', 'all', 'desc').map(u => u.id), [1, 2]);
  assert.deepEqual(selectUsers(users, '@ANNA', 'admin').map(u => u.id), [2]);
  assert.equal(matchesUser(users[1], 'Anna', 'user'), false);
  assert.deepEqual(users.map(u => u.id), [1, 2]);
});
test('GET requests all selected fields and removes duplicate IDs', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(options.method, 'GET'); assert.equal(new URL(url).searchParams.get('limit'), '0');
    assert.equal(new URL(url).searchParams.get('select'), 'firstName,lastName,username,image,email,phone,company,role');
    return response({ users: [{ ...user, id: 1 }, { ...user, id: 1 }] });
  };
  assert.equal((await getUsers()).length, 1);
});
test('POST/PUT send only editable fields, DELETE sends no body', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push([url, options]); return response({ id: 209, isDeleted: true }); };
  await createUser({ ...user, id: 42, password: 'secret' });
  await updateUser(1, { ...user, bank: {} });
  await deleteUser(1);
  assert.deepEqual(calls.map(([, o]) => o.method), ['POST', 'PUT', 'DELETE']);
  assert.equal(calls[0][0], 'https://dummyjson.com/users/add');
  assert.deepEqual(Object.keys(JSON.parse(calls[1][1].body)), editableFields);
  assert.equal(JSON.parse(calls[0][1].body).password, undefined);
  assert.equal(calls[2][1].body, undefined);
});
test('API rejects local IDs before sending requests', () => {
  globalThis.fetch = () => assert.fail('fetch must not run');
  for (const id of [-1, 0, 1.5, '1']) { assert.throws(() => updateUser(id, user)); assert.throws(() => deleteUser(id)); }
});
for (const [name, run] of [['GET', getUsers], ['POST', () => createUser(user)], ['PUT', () => updateUser(1, user)], ['DELETE', () => deleteUser(1)]]) {
  test(`${name} rejects HTTP errors without treating them as success`, async () => {
    globalThis.fetch = async () => response({ message: 'Error' }, 500);
    await assert.rejects(run, /HTTP 500/);
  });
}
test('network failures have a readable message', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(getUsers, /Проверьте интернет/);
});
test('invalid JSON and malformed lists are rejected', async () => {
  globalThis.fetch = async () => new Response('{broken');
  await assert.rejects(getUsers, /неверный JSON/);
  for (const body of [{ users: null }, { users: [{ id: -1 }] }, { users: [null] }]) {
    globalThis.fetch = async () => response(body); await assert.rejects(getUsers, /неверный список/);
  }
});
test('15-second timeout aborts fetch and does not wait indefinitely', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
  const pending = getUsers();
  const rejection = assert.rejects(pending, /15 секунд/);
  t.mock.timers.tick(timeoutMs); await rejection;
});
