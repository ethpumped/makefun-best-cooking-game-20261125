// input.js — mouse and keyboard for the counter: click tickets, griddle
// slots, ingredient bins and the SERVE button; keys 1-9 pick a bin,
// Space/Enter serves, Backspace trashes the plate being built.

import { LAYOUT } from './render.js';

export function binAt(x, y) {
  if (y < LAYOUT.binsY || y > LAYOUT.binsY + LAYOUT.binsH) return null;
  const i = Math.floor((x - LAYOUT.binX0) / (LAYOUT.binW + LAYOUT.binGap));
  if (i < 0 || i >= LAYOUT.binKeys.length) return null;
  const bx = LAYOUT.binX0 + i * (LAYOUT.binW + LAYOUT.binGap);
  if (x > bx + LAYOUT.binW) return null;
  return LAYOUT.binKeys[i];
}

export function slotAt(x, y) {
  for (let i = 0; i < LAYOUT.slots.length; i++) {
    const s = LAYOUT.slots[i];
    const dx = x - s.cx, dy = y - (s.cy + 12);
    if (dx * dx + dy * dy <= (LAYOUT.slotR + 10) * (LAYOUT.slotR + 10)) return i;
  }
  return -1;
}

export function ticketAt(x, y, count) {
  const B = LAYOUT.board;
  if (x < B.x || x > B.x + B.w || y < B.y + 44) return -1;
  const i = Math.floor((y - B.y - 44) / LAYOUT.ticketH);
  return i >= 0 && i < count ? i : -1;
}

export function serveAt(x, y) {
  const S = LAYOUT.serveBtn;
  return x >= S.x && x <= S.x + S.w && y >= S.y && y <= S.y + S.h;
}

// Attach handlers; `actions` supplies pour(), bin(key), slot(i),
// ticket(i), serve(), trashPlate(), restart().
export function attachInput(canvas, actions) {
  canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
    if (actions.anyClick && actions.anyClick()) return;
    const bin = binAt(x, y);
    if (bin) { actions.bin(bin); return; }
    const slot = slotAt(x, y);
    if (slot >= 0) { actions.slot(slot); return; }
    if (serveAt(x, y)) { actions.serve(); return; }
    const t = ticketAt(x, y, actions.ticketCount());
    if (t >= 0) actions.ticket(t);
  });
  window.addEventListener('keydown', (ev) => {
    if (ev.key >= '1' && ev.key <= '9') {
      actions.bin(LAYOUT.binKeys[Number(ev.key) - 1]);
    } else if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault(); actions.serve();
    } else if (ev.key === 'Backspace') {
      ev.preventDefault(); actions.trashPlate();
    }
  });
}
