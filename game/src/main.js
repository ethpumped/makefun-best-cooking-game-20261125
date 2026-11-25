// main.js — Pancake Parade: the shift loop. Take a ticket, pour batter,
// flip when the bubbles rise, stack the cakes on the assembly plate, finish
// with syrup / butter / fruit exactly as the ticket says, and serve before
// patience runs out. Three strikes (or the end of the shift) closes the diner.

import { makeGriddle, pourBatter, clickSlot, tickGriddle, freeSlot } from './stations.js';
import { makeTicket, tickOrders, patienceFrac, mulberry32, resetTicketIds } from './orders.js';
import { priceOf, basePatience } from './recipes.js';
import { drawScene } from './render.js';
import { attachInput } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const SHIFT_SECONDS = 180;

const freshPlate = () => ({ cakes: [], butter: false, syrup: null, fruit: null });

function newState() {
  return {
    tickets: [], selectedId: null,
    griddle: makeGriddle(),
    plate: freshPlate(),
    passPlate: null, passLabel: '',
    coins: 0, strikes: 0, served: 0, golden: 0,
    shiftLeft: SHIFT_SECONDS, elapsed: 0, spawnT: 0,
    message: 'First guests are here!\nPour batter [1], flip at the bubbles,\nstack the cakes, match the ticket, SERVE.',
    banner: false, gameOver: false,
    rng: mulberry32((Math.random() * 1e9) | 0),
  };
}

let S = newState();

function heat() { return Math.min(1, S.elapsed / SHIFT_SECONDS); }

function spawnTicket() {
  if (S.tickets.length >= 3) return;
  const t = makeTicket(S.rng, heat());
  S.tickets.push(t);
  if (S.selectedId === null) S.selectedId = t.id;
}

function say(text) { S.message = text; }

function doBin(key) {
  if (S.gameOver) return;
  if (key === 'batter') {
    const i = freeSlot(S.griddle);
    if (i < 0) { say('Griddle is full!\nFlip or plate a cake first.'); return; }
    pourBatter(S.griddle[i]);
    say('Batter poured.\nWatch for bubbles — that is your flip cue.');
  } else if (key === 'trash') {
    S.plate = freshPlate();
    say('Plate scrapped.\nFresh plate, fresh start.');
  } else if (key === 'butter') {
    if (S.plate.cakes.length === 0) { say('Butter needs a stack first.\nPlate a pancake, then top it.'); return; }
    S.plate.butter = true; say('Butter pat on.\nIt melts into the warm stack.');
  } else if (key === 'maple' || key === 'berry' || key === 'choco') {
    if (S.plate.cakes.length === 0) { say('Syrup needs a stack first.'); return; }
    S.plate.syrup = key; say('Syrup poured in a spiral.\nCheck the ticket before you serve!');
  } else { // fruit bins share their key with the fruit name
    if (S.plate.cakes.length === 0) { say('Fruit needs a stack first.'); return; }
    S.plate.fruit = key; say('Fruit scattered on top.\nAlmost parade-ready.');
  }
}

function doSlot(i) {
  if (S.gameOver) return;
  const result = clickSlot(S.griddle[i]);
  if (result === 'flipped') say('Flipped!\nSide two browns fast — stay close.');
  else if (result === 'golden') { S.plate.cakes.push('golden'); S.golden++; say('Golden pancake plated!\nPerfect bubble flip. Keep stacking.'); }
  else if (result === 'plain') { S.plate.cakes.push('plain'); say('Pancake plated.\nA touch early or late, still tasty.'); }
  else if (result === 'scraped') say('Burnt cake scrapped.\nThe parade marches on.');
}

function recipeDiff(ticket) {
  const r = ticket.recipe, p = S.plate, diffs = [];
  if (p.cakes.length !== r.stack) diffs.push(`needs ${r.stack} cakes (has ${p.cakes.length})`);
  if (p.syrup !== r.syrup) diffs.push(r.syrup ? `syrup should be ${r.syrup}` : 'no syrup wanted');
  if (p.butter !== r.butter) diffs.push(r.butter ? 'missing butter' : 'no butter wanted');
  if (p.fruit !== r.fruit) diffs.push(r.fruit ? `fruit should be ${r.fruit}` : 'no fruit wanted');
  return diffs;
}

function doServe() {
  if (S.gameOver) return;
  const ticket = S.tickets.find((t) => t.id === S.selectedId) || S.tickets[0];
  if (!ticket) { say('No ticket selected.\nWait for a guest to order.'); return; }
  const diffs = recipeDiff(ticket);
  if (diffs.length > 0) {
    S.strikes++;
    say(`Ticket #${ticket.id} sent it back:\n${diffs[0]}.\nStrike ${S.strikes} of 3 — fix the plate!`);
    if (S.strikes >= 3) S.gameOver = true;
    return;
  }
  const tip = Math.round(ticket.price * 0.5 * patienceFrac(ticket));
  S.coins += ticket.price + tip;
  S.served++;
  S.passPlate = { ...S.plate, cakes: [...S.plate.cakes] };
  S.passLabel = `Ticket #${ticket.id} — $${ticket.price}${tip ? ` + $${tip} tip` : ''}`;
  S.tickets = S.tickets.filter((t) => t.id !== ticket.id);
  S.selectedId = S.tickets.length ? S.tickets[0].id : null;
  S.plate = freshPlate();
  say(`Served Ticket #${ticket.id}!\n$${ticket.price}${tip ? ` plus a $${tip} sunrise tip` : ''}. Next guest, please.`);
}

function update(dt) {
  if (S.gameOver) return;
  S.elapsed += dt;
  S.shiftLeft -= dt;
  tickGriddle(S.griddle, dt);
  const expired = tickOrders(S.tickets, dt);
  for (const t of expired) {
    S.tickets = S.tickets.filter((x) => x.id !== t.id);
    S.strikes++;
    say(`Ticket #${t.id} walked out hungry!\nStrike ${S.strikes} of 3.`);
    if (S.selectedId === t.id) S.selectedId = S.tickets.length ? S.tickets[0].id : null;
  }
  S.spawnT -= dt;
  if (S.spawnT <= 0) { spawnTicket(); S.spawnT = 6 + S.rng() * 4; }
  if (S.shiftLeft <= 0 || S.strikes >= 3) S.gameOver = true;
}

// ---- deterministic screenshot scenes -------------------------------------
function shotTicket(id, recipe, frac, guest) {
  const patienceMax = basePatience(recipe);
  return { id, recipe, price: priceOf(recipe), patienceMax, patienceLeft: patienceMax * frac, guest };
}

function buildShot(kind, seed) {
  resetTicketIds();
  const s = newState();
  s.rng = mulberry32(seed);
  const slot = (stage, t, perfectFlip = false) => ({ stage, t, perfectFlip });
  if (kind === 'cover') {
    s.tickets = [
      shotTicket(1, { stack: 3, syrup: 'maple', butter: true, fruit: 'strawberry' }, 0.82, 2),
      shotTicket(2, { stack: 2, syrup: 'berry', butter: false, fruit: 'blueberry' }, 0.58, 5),
    ];
    s.selectedId = 1;
    s.griddle = [slot('side2', 1.1, true), slot('side1', 3.8), slot('empty', 0), slot('side1', 1.4)];
    s.plate = { cakes: ['golden', 'golden', 'plain'], butter: true, syrup: null, fruit: null };
    s.passPlate = { cakes: ['golden', 'golden', 'golden'], butter: true, syrup: 'maple', fruit: 'strawberry' };
    s.passLabel = 'Warm-up stack — parade perfect!';
    s.coins = 24; s.served = 2; s.golden = 3; s.shiftLeft = 152;
    s.message = 'Morning rush is warming up!\nTicket #1 wants a maple stack of 3 —\none cake is bubbling, ready to flip.';
    s.banner = true;
  } else if (kind === 'rush') {
    s.tickets = [
      shotTicket(3, { stack: 4, syrup: 'choco', butter: true, fruit: 'banana' }, 0.3, 1),
      shotTicket(4, { stack: 3, syrup: 'berry', butter: true, fruit: null }, 0.16, 4),
      shotTicket(5, { stack: 2, syrup: null, butter: false, fruit: 'blueberry' }, 0.62, 6),
    ];
    s.selectedId = 3;
    s.griddle = [slot('done', 3.0, true), slot('burnt', 0), slot('side1', 4.3), slot('side2', 1.8, true)];
    s.plate = { cakes: ['plain', 'golden'], butter: false, syrup: 'berry', fruit: null };
    s.passPlate = { cakes: ['golden', 'golden'], butter: false, syrup: 'berry', fruit: 'blueberry' };
    s.passLabel = 'Ticket #2 — out the door!';
    s.coins = 87; s.served = 6; s.golden = 5; s.strikes = 1; s.shiftLeft = 64;
    s.message = 'RUSH HOUR!\nOne cake burnt, one ready to plate,\nTicket #4 is nearly out of patience!';
  } else { // serve
    s.tickets = [
      shotTicket(6, { stack: 3, syrup: 'maple', butter: true, fruit: 'strawberry' }, 0.74, 3),
      shotTicket(7, { stack: 4, syrup: 'berry', butter: false, fruit: 'banana' }, 0.47, 2),
    ];
    s.selectedId = 6;
    s.griddle = [slot('side1', 3.6), slot('done', 2.8, true), slot('empty', 0), slot('empty', 0)];
    s.plate = { cakes: ['golden', 'golden', 'golden'], butter: true, syrup: 'maple', fruit: 'strawberry' };
    s.passPlate = { cakes: ['golden', 'plain', 'golden'], butter: true, syrup: 'choco', fruit: 'banana' };
    s.passLabel = 'Ticket #5 — happy guest!';
    s.coins = 132; s.served = 9; s.golden = 11; s.shiftLeft = 121;
    s.message = 'Ticket #6 is built exactly right:\n3 golden cakes, maple, butter, berries.\nHit SERVE while patience is high!';
  }
  return s;
}

// ---- boot -----------------------------------------------------------------
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  S = buildShot(shot, Number(params.get('seed') || 7));
  drawScene(ctx, S); // one frozen frame, no animation
} else {
  spawnTicket(); spawnTicket();
  attachInput(canvas, {
    anyClick: () => { if (S.gameOver) { S = newState(); spawnTicket(); spawnTicket(); return true; } return false; },
    bin: doBin,
    slot: doSlot,
    ticket: (i) => { if (S.tickets[i]) S.selectedId = S.tickets[i].id; },
    ticketCount: () => S.tickets.length,
    serve: doServe,
    trashPlate: () => doBin('trash'),
  });
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    drawScene(ctx, S);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
