// recipes.js — the Sunrise Diner menu: what a ticket can ask for, what each
// part is worth, and how long a guest is willing to wait for it.

export const SYRUPS = {
  maple: { label: 'Maple Syrup', color: '#b45f06', price: 2 },
  berry: { label: 'Berry Syrup', color: '#8e2455', price: 3 },
  choco: { label: 'Choco Syrup', color: '#4a2410', price: 3 },
};

export const FRUITS = {
  strawberry: { label: 'Strawberries', color: '#d92b3a', price: 3 },
  blueberry: { label: 'Blueberries', color: '#3b4a9e', price: 3 },
  banana: { label: 'Banana Slices', color: '#f2d06b', price: 2 },
};

export const BUTTER = { label: 'Butter Pat', price: 1 };
export const PANCAKE_PRICE = 3;

// A recipe is one plate: a stack height, one syrup (or none), butter or not,
// one fruit (or none). The ticket prints it; the cook builds it on the plate.
export function priceOf(recipe) {
  let total = recipe.stack * PANCAKE_PRICE;
  if (recipe.syrup) total += SYRUPS[recipe.syrup].price;
  if (recipe.butter) total += BUTTER.price;
  if (recipe.fruit) total += FRUITS[recipe.fruit].price;
  return total;
}

export function describeRecipe(recipe) {
  const lines = [`Stack of ${recipe.stack}`];
  lines.push(recipe.syrup ? SYRUPS[recipe.syrup].label : 'No syrup');
  if (recipe.butter) lines.push('Butter pat');
  lines.push(recipe.fruit ? FRUITS[recipe.fruit].label : 'No fruit');
  return lines;
}

// Patience (seconds) a fresh ticket starts with, before the rush factor
// squeezes it. Bigger stacks get a little more grace.
export function basePatience(recipe) {
  return 52 + recipe.stack * 6;
}
