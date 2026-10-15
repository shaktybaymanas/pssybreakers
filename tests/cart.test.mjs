import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecipeBasket, getRecipeChoices } from '../recipes/cart-store.js';
const dish = { id: 1, name: 'Pizza', image: 'https://example.com/pizza.jpg' };
const recipes = Array.from({length:12}, (_,i) => ({...dish,id:i+1,name:'Dish '+(i+1)}));

test('profiles automatically receive 2–4 distinct dishes with quantities', () => {
  for (const id of [1,2,3,208,-1,-2]) {
    const items = createRecipeBasket(id,recipes);
    assert.ok(items.length >= 2 && items.length <= 4);
    assert.equal(new Set(items.map(item=>item.id)).size,items.length);
    assert.ok(items.every(item=>item.quantity >= 1 && item.quantity <= 2));
  }
  assert.notDeepEqual(createRecipeBasket(1,recipes),createRecipeBasket(2,recipes));
});
test('basket is stable after reopening, a new page and changes in API ordering', () => {
  const first = createRecipeBasket(1,recipes);
  assert.deepEqual(first,createRecipeBasket(1,[...recipes].reverse()));
  first[0].quantity = 80;
  assert.notEqual(createRecipeBasket(1,recipes)[0].quantity,80);
  assert.equal(recipes[0].quantity,undefined);
});
test('small, empty and malformed catalogs are safe, invalid owners rejected', () => {
  assert.deepEqual(createRecipeBasket(1,[]),[]);
  assert.equal(createRecipeBasket(1,[dish,dish,{id:-2},null]).length,1);
  for (const id of [0,1.5,'1']) assert.throws(()=>createRecipeBasket(id,recipes));
});
test('recipe catalog retries an HTTP error then caches its successful GET', async () => {
  const original = globalThis.fetch; let calls = 0;
  try {
    globalThis.fetch = async url => {
      calls++; assert.match(url, /recipes\?limit=0/);
      return calls === 1 ? Response.json({}, { status: 503 }) : Response.json({ recipes: [dish, { id: -1 }, { id: 2, name: '' }] });
    };
    await assert.rejects(getRecipeChoices(), /GET 503/);
    assert.deepEqual(await getRecipeChoices(), [dish]);
    await getRecipeChoices(); assert.equal(calls, 2);
  } finally { globalThis.fetch = original; }
});
