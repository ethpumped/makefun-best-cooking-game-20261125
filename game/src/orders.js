// orders.js — the order board: ticket generation, the queue, and the
// patience bar that drains while a guest watches the griddle.

import { SYRUPS, FRUITS, priceOf, basePatience } from './recipes.js';

// Small deterministic RNG so screenshot scenes and practice runs repeat.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SYRUP_KEYS = Object.keys(SYRUPS);
const FRUIT_KEYS = Object.keys(FRUITS);

let nextTicketId = 1;

// Build one random ticket. `heat` (0..1) is the rush level: hotter shifts
// ask for taller stacks and shave the patience window.
export function makeTicket(rng, heat) {
  const stack = 2 + Math.floor(rng() * (heat > 0.55 ? 4 : 3)); // 2..4, late 2..5
  const recipe = {
    stack,
    syrup: rng() < 0.18 ? null : SYRUP_KEYS[Math.floor(rng() * SYRUP_KEYS.length)],
    butter: rng() < 0.62,
    fruit: rng() < 0.3 ? null : FRUIT_KEYS[Math.floor(rng() * FRUIT_KEYS.length)],
  };
  const patience = basePatience(recipe) * (1 - heat * 0.35);
  return {
    id: nextTicketId++,
    recipe,
    price: priceOf(recipe),
    patienceMax: patience,
    patienceLeft: patience,
    guest: 1 + Math.floor(rng() * 6),
  };
}

export function resetTicketIds() { nextTicketId = 1; }

// Drain every ticket; returns the ones whose patience just ran out.
export function tickOrders(tickets, dt) {
  const expired = [];
  for (const t of tickets) {
    t.patienceLeft -= dt;
    if (t.patienceLeft <= 0) expired.push(t);
  }
  return expired;
}

export function patienceFrac(ticket) {
  return Math.max(0, ticket.patienceLeft / ticket.patienceMax);
}
