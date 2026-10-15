// Автоматический учебный набор. Одинаковый ID даёт одну корзину на обеих страницах.
export function createRecipeBasket(userId, recipes) {
  if (!Number.isSafeInteger(userId) || userId === 0) throw new Error('Не найден владелец корзины.');
  const unique = new Map();
  for (const recipe of recipes) {
    if (Number.isSafeInteger(recipe?.id) && recipe.id > 0 && typeof recipe.name === 'string' && recipe.name.trim()) unique.set(recipe.id, recipe);
  }
  const catalog = [...unique.values()].sort((a, b) => a.id - b.id);
  if (!catalog.length) return [];
  const seed = Math.abs(userId);
  const size = Math.min(2 + seed % 3, catalog.length);
  const start = ((seed - 1) % catalog.length * 7) % catalog.length;
  return Array.from({ length: size }, (_, index) => {
    const recipe = catalog[(start + index) % catalog.length];
    return { id: recipe.id, name: recipe.name.trim(), image: typeof recipe.image === 'string' ? recipe.image : '', quantity: 1 + (seed + index) % 2 };
  });
}

let catalogRequest;
export function getRecipeChoices() {
  if (!catalogRequest) {
    catalogRequest = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch('https://dummyjson.com/recipes?limit=0&select=name,image', { signal: controller.signal });
        if (!response.ok) throw new Error(`Не удалось загрузить блюда · GET ${response.status}.`);
        const data = await response.json();
        if (!Array.isArray(data.recipes)) throw new Error('Сервис вернул неверный список блюд.');
        return data.recipes.filter(recipe => Number.isSafeInteger(recipe.id) && recipe.id > 0 && typeof recipe.name === 'string' && recipe.name.trim());
      } catch (error) {
        catalogRequest = null;
        if (error.name === 'AbortError') throw new Error('Блюда не загрузились за 15 секунд. Попробуйте ещё раз.');
        if (error instanceof TypeError) throw new Error('Нет связи с сервисом блюд. Проверьте интернет.');
        throw error;
      } finally { clearTimeout(timer); }
    })();
  }
  return catalogRequest;
}

