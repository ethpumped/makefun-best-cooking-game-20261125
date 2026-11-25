// stations.js — the griddle: four iron slots where batter becomes pancakes.
// A pancake cooks on side one until bubbles rise (the flip window), flips,
// finishes on side two, and burns if the cook daydreams.

export const SIDE1_TIME = 6.0;    // seconds before side one scorches
export const BUBBLE_START = 3.0;  // bubbles appear — flip window opens
export const BUBBLE_END = 5.0;    // flip window closes (still flippable, plain)
export const SIDE2_DONE = 2.4;    // side two is ready to plate
export const SIDE2_BURN = 4.2;    // side two scorches after this

export function makeGriddle() {
  return [null, null, null, null].map(() => ({
    stage: 'empty', // empty | side1 | side2 | done | burnt
    t: 0,
    perfectFlip: false,
  }));
}

export function freeSlot(griddle) {
  return griddle.findIndex((s) => s.stage === 'empty');
}

// Pour batter onto a slot. Returns false when the slot is busy.
export function pourBatter(slot) {
  if (slot.stage !== 'empty') return false;
  slot.stage = 'side1';
  slot.t = 0;
  slot.perfectFlip = false;
  return true;
}

// The one click a slot understands, by stage:
// side1 -> flip it, done -> lift it onto the plate, burnt -> scrape it off.
export function clickSlot(slot) {
  if (slot.stage === 'side1') {
    slot.perfectFlip = slot.t >= BUBBLE_START && slot.t <= BUBBLE_END;
    slot.stage = 'side2';
    slot.t = 0;
    return 'flipped';
  }
  if (slot.stage === 'done') {
    const quality = slot.perfectFlip ? 'golden' : 'plain';
    slot.stage = 'empty'; slot.t = 0;
    return quality; // 'golden' | 'plain' — a pancake for the plate
  }
  if (slot.stage === 'burnt') {
    slot.stage = 'empty'; slot.t = 0;
    return 'scraped';
  }
  return null;
}

export function tickGriddle(griddle, dt) {
  for (const slot of griddle) {
    if (slot.stage === 'side1') {
      slot.t += dt;
      if (slot.t >= SIDE1_TIME) { slot.stage = 'burnt'; slot.t = 0; }
    } else if (slot.stage === 'side2') {
      slot.t += dt;
      if (slot.t >= SIDE2_BURN) { slot.stage = 'burnt'; slot.t = 0; }
      else if (slot.t >= SIDE2_DONE) slot.stage = 'done';
    }
  }
}

// 0..1 doneness ring for drawing the timer arc around a slot.
export function slotProgress(slot) {
  if (slot.stage === 'side1') return slot.t / SIDE1_TIME;
  if (slot.stage === 'side2' || slot.stage === 'done') return slot.t / SIDE2_BURN;
  return 0;
}

export function inFlipWindow(slot) {
  return slot.stage === 'side1' && slot.t >= BUBBLE_START && slot.t <= BUBBLE_END;
}
