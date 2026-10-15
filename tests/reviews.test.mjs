import test from 'node:test';
import assert from 'node:assert/strict';
import { ReviewStore } from '../recipes/review-store.js';
const users = [{ id: 1 }, { id: 2 }];
test('demo reviews identify their recipe and author, not a post or recipe owner', () => {
  const store = new ReviewStore();
  for (let recipeId = 1; recipeId <= 12; recipeId++) {
    const items = store.get(recipeId); assert.equal(items.length, 2);
    for (const item of items) { assert.equal(item.recipeId, recipeId); assert.equal(item.source, 'demo'); assert.ok(item.userId > 0); assert.equal(item.postId, undefined); }
  }
});
test('new recipes start empty; reviews stay isolated between recipes', () => {
  const store = new ReviewStore(); assert.deepEqual(store.get(100000), []);
  const added = store.add({ recipeId: 100000, userId: 1, rating: 5, body: '  Удобный рецепт.  ' }, users);
  assert.equal(added.body, 'Удобный рецепт.'); assert.equal(store.get(100000).length, 1);
  assert.equal(store.get(1).length, 2); assert.equal(added.source, 'local');
});
test('invalid review does not modify storage', () => {
  const store = new ReviewStore(); const input = { recipeId: 1, userId: 1, rating: 5, body: 'Хорошо' };
  for (const patch of [{ userId: 404 }, { recipeId: -1 }, { rating: 0 }, { rating: 6 }, { rating: 1.5 }, { body: '   ' }, { body: 'a'.repeat(1001) }]) assert.throws(() => store.add({ ...input, ...patch }, users));
  assert.equal(store.get(1).length, 2);
});
test('local reviews have distinct IDs and do not claim a server POST', () => {
  const store = new ReviewStore();
  const first = store.add({ recipeId: 1, userId: 1, rating: 5, body: 'Первый' }, users);
  const second = store.add({ recipeId: 1, userId: 2, rating: 4, body: 'Второй' }, users);
  assert.notEqual(first.id, second.id); assert.equal(store.get(1)[0].id, second.id); assert.equal(first.source, 'local');
});
test('resetting restores samples and discards local reviews; returned records are copies', () => {
  const first = new ReviewStore(); first.add({ recipeId: 1, userId: 1, rating: 5, body: 'Новый' }, users);
  const reloaded = new ReviewStore(); assert.equal(reloaded.get(1).length, 2);
  const returned = reloaded.get(1); returned[0].body = 'changed'; assert.notEqual(reloaded.get(1)[0].body, 'changed');
});
