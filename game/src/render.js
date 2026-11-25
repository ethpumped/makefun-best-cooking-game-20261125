// render.js — every pixel of the Sunrise Diner, drawn in code: the dawn
// sky over the windows, the order board, the iron griddle, the assembly
// plate, the pass shelf and the ingredient counter. No image assets.

import { SYRUPS, FRUITS, describeRecipe } from './recipes.js';
import { patienceFrac } from './orders.js';
import { slotProgress, inFlipWindow, BUBBLE_START } from './stations.js';

export const W = 1280, H = 800;

// Shared layout — input.js hit-tests against these same rectangles.
export const LAYOUT = {
  board: { x: 16, y: 80, w: 300, h: 560 },
  ticketH: 172,
  griddle: { x: 340, y: 80, w: 540, h: 330 },
  slots: [
    { cx: 455, cy: 182 }, { cx: 665, cy: 182 },
    { cx: 455, cy: 322 }, { cx: 665, cy: 322 },
  ],
  slotR: 62,
  assembly: { x: 340, y: 426, w: 540, h: 218 },
  plate: { cx: 512, cy: 566, rx: 118, ry: 30 },
  serveBtn: { x: 700, y: 580, w: 160, h: 56 },
  pass: { x: 904, y: 80, w: 360, h: 330 },
  passPlate: { cx: 1084, cy: 316, rx: 110, ry: 28 },
  binsY: 660, binsH: 124, binX0: 340, binW: 96, binGap: 7.5,
  binKeys: ['batter', 'butter', 'maple', 'berry', 'choco', 'strawberry', 'blueberry', 'banana', 'trash'],
  hints: { x: 16, y: 656, w: 300, h: 128 },
};

const DAWN = ['#f7b733', '#fc4a1a', '#7ec8e3'];

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, cx, cy, rx, ry) {
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
}

// One pancake seen from the diner-counter angle: a fat ellipse with a
// browned rim. Quality tints it: golden = perfect flip, plain = fine,
// pale = still batter.
function drawPancake(ctx, cx, cy, rx, ry, tone) {
  const fills = {
    golden: ['#f3c96b', '#d98a2b'],
    plain: ['#f6dd9a', '#e0aa4e'],
    pale: ['#f9ecc4', '#eed9a0'],
    burnt: ['#5a3a22', '#33200f'],
  }[tone];
  ellipse(ctx, cx, cy, rx, ry);
  const g = ctx.createLinearGradient(cx, cy - ry, cx, cy + ry);
  g.addColorStop(0, fills[0]); g.addColorStop(1, fills[1]);
  ctx.fillStyle = g; ctx.fill();
  ellipse(ctx, cx, cy - ry * 0.22, rx * 0.82, ry * 0.62);
  ctx.fillStyle = 'rgba(255,244,200,0.35)'; ctx.fill();
}

function drawSyrup(ctx, cx, cy, rx, ry, key) {
  ctx.fillStyle = SYRUPS[key].color;
  ellipse(ctx, cx, cy, rx * 0.8, ry * 0.8); ctx.fill();
  for (let i = -2; i <= 2; i++) { // drips over the edge
    const dx = i * rx * 0.3;
    ellipse(ctx, cx + dx, cy + ry * 0.72, rx * 0.1, ry * (0.5 + Math.abs(i) * -0.06 + 0.28));
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ellipse(ctx, cx - rx * 0.3, cy - ry * 0.3, rx * 0.22, ry * 0.2); ctx.fill();
}

function drawButter(ctx, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(-0.18);
  ctx.fillStyle = '#ffe066';
  rr(ctx, -22, -11, 44, 22, 5); ctx.fill();
  ctx.fillStyle = '#fff3b0';
  rr(ctx, -22, -11, 44, 8, 4); ctx.fill();
  ctx.restore();
}

function drawFruit(ctx, cx, cy, key) {
  if (key === 'strawberry') {
    for (const dx of [-26, 0, 26]) {
      ctx.fillStyle = FRUITS.strawberry.color;
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy + 12);
      ctx.quadraticCurveTo(cx + dx - 13, cy - 6, cx + dx, cy - 10);
      ctx.quadraticCurveTo(cx + dx + 13, cy - 6, cx + dx, cy + 12);
      ctx.fill();
      ctx.fillStyle = '#3f9e4d';
      ctx.fillRect(cx + dx - 5, cy - 14, 10, 5);
      ctx.fillStyle = '#ffe9ec';
      for (const [sx, sy] of [[-5, 0], [4, 3], [0, 8]]) { ctx.fillRect(cx + dx + sx, cy + sy, 2, 2); }
    }
  } else if (key === 'blueberry') {
    for (const [dx, dy] of [[-24, 4], [-8, -6], [8, 2], [24, -4], [0, 10], [16, 12]]) {
      ctx.fillStyle = FRUITS.blueberry.color;
      ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8fa3e8';
      ctx.beginPath(); ctx.arc(cx + dx - 2, cy + dy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (key === 'banana') {
    for (const dx of [-24, 0, 24]) {
      ctx.fillStyle = '#f7e08a';
      ctx.beginPath(); ctx.arc(cx + dx, cy + 2, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fdf3c0';
      ctx.beginPath(); ctx.arc(cx + dx, cy + 2, 6, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// A whole plated stack: plate, cakes bottom-up, syrup, butter, fruit.
export function drawStack(ctx, cx, baseY, rx, dish) {
  ellipse(ctx, cx, baseY, rx, rx * 0.26);
  ctx.fillStyle = '#fdfdf8'; ctx.fill();
  ctx.strokeStyle = '#c9d4d8'; ctx.lineWidth = 2; ctx.stroke();
  ellipse(ctx, cx, baseY, rx * 0.78, rx * 0.19);
  ctx.fillStyle = '#eef3f4'; ctx.fill();
  const n = dish.cakes.length;
  for (let i = 0; i < n; i++) {
    const wobble = (i % 2 === 0 ? -1 : 1) * (i * 1.6);
    drawPancake(ctx, cx + wobble, baseY - 8 - i * 14, rx * 0.8 - i * 2, rx * 0.21, dish.cakes[i]);
  }
  const topY = baseY - 8 - Math.max(0, n - 1) * 14;
  if (n > 0 && dish.syrup) drawSyrup(ctx, cx, topY - 4, rx * 0.78, rx * 0.2, dish.syrup);
  if (n > 0 && dish.butter) drawButter(ctx, cx + 6, topY - 12);
  if (n > 0 && dish.fruit) drawFruit(ctx, cx, topY - 2, dish.fruit);
  return topY;
}

function drawGuest(ctx, cx, cy, n) {
  const skins = ['#f2c79b', '#c68863', '#8d5a3b', '#f7d7b0', '#a9714b', '#e8b48c'];
  const hair = ['#3a2415', '#101010', '#7a4a21', '#c94f1a', '#555', '#2b1c10'];
  ctx.fillStyle = skins[n % skins.length];
  ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hair[n % hair.length];
  ctx.beginPath(); ctx.arc(cx, cy - 4, 15, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(cx - 6, cy + 1, 3, 3); ctx.fillRect(cx + 3, cy + 1, 3, 3);
  ctx.beginPath(); ctx.arc(cx, cy + 6, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
}

function drawTicket(ctx, t, x, y, w, selected) {
  ctx.fillStyle = selected ? '#fff7d6' : '#fffdf4';
  rr(ctx, x, y, w, LAYOUT.ticketH - 10, 8); ctx.fill();
  ctx.strokeStyle = selected ? '#f0a500' : '#d8c9a3';
  ctx.lineWidth = selected ? 3 : 1.5; ctx.stroke();
  drawGuest(ctx, x + 26, y + 26, t.guest);
  ctx.fillStyle = '#40260d';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText(`Ticket #${t.id}`, x + 50, y + 24);
  ctx.font = 'bold 16px Georgia, serif';
  ctx.fillStyle = '#b45f06';
  ctx.fillText(`$${t.price}`, x + w - 44, y + 24);
  ctx.font = '14px Verdana, sans-serif';
  ctx.fillStyle = '#4a3421';
  describeRecipe(t.recipe).forEach((line, i) => {
    ctx.fillText('• ' + line, x + 50, y + 48 + i * 19);
  });
  // patience bar
  const frac = patienceFrac(t);
  ctx.fillStyle = '#e5d9bd'; rr(ctx, x + 12, y + LAYOUT.ticketH - 34, w - 24, 12, 6); ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#58a34c' : frac > 0.25 ? '#f0a500' : '#d92b3a';
  if (frac > 0) { rr(ctx, x + 12, y + LAYOUT.ticketH - 34, (w - 24) * frac, 12, 6); ctx.fill(); }
  ctx.fillStyle = '#7a6248'; ctx.font = '11px Verdana, sans-serif';
  ctx.fillText('patience', x + 12, y + LAYOUT.ticketH - 40);
}

function drawGriddleSlot(ctx, slot, cx, cy) {
  const R = LAYOUT.slotR;
  ctx.fillStyle = '#3c3f45';
  ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#565b63';
  ctx.beginPath(); ctx.arc(cx, cy, R + 2, 0, Math.PI * 2); ctx.fill();
  if (slot.stage === 'empty') {
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.font = '13px Verdana, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('empty', cx, cy + 4); ctx.textAlign = 'left';
    return;
  }
  if (slot.stage === 'burnt') {
    drawPancake(ctx, cx, cy, R * 0.86, R * 0.4, 'burnt');
    ctx.strokeStyle = 'rgba(120,120,120,0.7)'; ctx.lineWidth = 3;
    for (const dx of [-18, 4, 22]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy - 22);
      ctx.quadraticCurveTo(cx + dx + 8, cy - 40, cx + dx, cy - 56);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffb3b3'; ctx.font = 'bold 13px Verdana, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('BURNT', cx, cy + R - 14); ctx.textAlign = 'left';
    return;
  }
  const tone = slot.stage === 'side1' ? 'pale' : 'golden';
  drawPancake(ctx, cx, cy, R * 0.86, R * 0.42, tone);
  if (slot.stage === 'side1' && slot.t >= BUBBLE_START) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (const [dx, dy, r] of [[-24, -4, 5], [-6, 6, 4], [14, -8, 6], [28, 4, 4], [2, -12, 3]]) {
      ctx.beginPath(); ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  // doneness ring
  ctx.beginPath();
  ctx.arc(cx, cy, R + 5, -Math.PI / 2, -Math.PI / 2 + slotProgress(slot) * Math.PI * 2);
  ctx.strokeStyle = slot.stage === 'done' ? '#58a34c' : inFlipWindow(slot) ? '#ffd23f' : '#7ec8e3';
  ctx.lineWidth = 4; ctx.stroke();
  ctx.font = 'bold 14px Verdana, sans-serif'; ctx.textAlign = 'center';
  if (inFlipWindow(slot)) {
    ctx.fillStyle = '#ffd23f';
    ctx.fillText('FLIP NOW!', cx, cy + R - 12);
  } else if (slot.stage === 'done') {
    ctx.fillStyle = '#7dd87d';
    ctx.fillText('READY!', cx, cy + R - 12);
  } else if (slot.stage === 'side1') {
    ctx.fillStyle = '#cfe8f5';
    ctx.fillText('cooking…', cx, cy + R - 12);
  } else {
    ctx.fillStyle = '#ffe1a8';
    ctx.fillText('side two…', cx, cy + R - 12);
  }
  ctx.textAlign = 'left';
}

function drawBin(ctx, key, x, y, w, h, idx) {
  ctx.fillStyle = '#8a5a2b'; rr(ctx, x, y, w, h, 8); ctx.fill();
  ctx.fillStyle = '#a9713d'; rr(ctx, x + 4, y + 4, w - 8, h - 40, 6); ctx.fill();
  const cx = x + w / 2, cy = y + 38;
  if (key === 'batter') {
    ctx.fillStyle = '#e8eef2'; rr(ctx, cx - 18, cy - 22, 36, 40, 5); ctx.fill();
    ctx.fillStyle = '#f9ecc4'; ellipse(ctx, cx, cy - 20, 15, 5); ctx.fill();
    ctx.fillStyle = '#7a6248'; ctx.fillRect(cx + 14, cy - 12, 12, 6);
  } else if (key === 'butter') {
    drawButter(ctx, cx, cy);
  } else if (key === 'maple' || key === 'berry' || key === 'choco') {
    ctx.fillStyle = SYRUPS[key].color; rr(ctx, cx - 11, cy - 16, 22, 36, 4); ctx.fill();
    ctx.fillStyle = '#f7e08a'; ctx.fillRect(cx - 5, cy - 24, 10, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(cx - 7, cy - 12, 4, 26);
  } else if (key === 'trash') {
    ctx.fillStyle = '#6b7280'; rr(ctx, cx - 15, cy - 14, 30, 34, 3); ctx.fill();
    ctx.fillStyle = '#4b5563'; ctx.fillRect(cx - 18, cy - 19, 36, 7);
  } else {
    drawFruit(ctx, cx, cy, key);
  }
  ctx.fillStyle = '#fff7e0'; ctx.font = 'bold 12px Verdana, sans-serif'; ctx.textAlign = 'center';
  const labels = { batter: 'BATTER', butter: 'BUTTER', maple: 'MAPLE', berry: 'BERRY', choco: 'CHOCO', strawberry: 'STRAWB.', blueberry: 'BLUEB.', banana: 'BANANA', trash: 'TRASH' };
  ctx.fillText(labels[key] || key.toUpperCase(), cx, y + h - 22);
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 13px Verdana, sans-serif';
  ctx.fillText(String(idx + 1), cx, y + h - 6);
  ctx.textAlign = 'left';
}

export function drawScene(ctx, s) {
  // dawn sky + diner wall
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#7ec8e3'); sky.addColorStop(0.35, '#f7b733');
  sky.addColorStop(0.36, '#8a5a2b'); sky.addColorStop(1, '#6e4520');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#a9713d'; ctx.fillRect(0, 288, W, 512);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let x = 0; x < W; x += 64) ctx.fillRect(x, 288, 2, 512);

  // header: sunrise strip, title, clock, till
  const hg = ctx.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, DAWN[1]); hg.addColorStop(0.5, DAWN[0]); hg.addColorStop(1, DAWN[2]);
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, 64);
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath(); ctx.arc(52, 32, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#40260d'; ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText('PANCAKE PARADE', 84, 42);
  ctx.font = '15px Verdana, sans-serif'; ctx.fillStyle = '#5a3208';
  ctx.fillText('Sunrise Diner', 470, 39);
  const mm = Math.floor(Math.max(0, s.shiftLeft) / 60), ss = Math.floor(Math.max(0, s.shiftLeft) % 60);
  ctx.fillStyle = '#40260d'; ctx.font = 'bold 26px Verdana, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`SHIFT ${mm}:${String(ss).padStart(2, '0')}`, 830, 41);
  ctx.font = 'bold 24px Verdana, sans-serif';
  ctx.fillText(`$ ${s.coins}`, 1060, 41);
  ctx.fillStyle = s.strikes >= 2 ? '#d92b3a' : '#40260d'; ctx.font = 'bold 22px Verdana, sans-serif';
  ctx.fillText('✕'.repeat(s.strikes) + '·'.repeat(Math.max(0, 3 - s.strikes)), 1200, 41);
  ctx.textAlign = 'left';

  // order board
  const B = LAYOUT.board;
  ctx.fillStyle = '#5d3d1e'; rr(ctx, B.x, B.y, B.w, B.h, 10); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 19px Georgia, serif';
  ctx.fillText('ORDER BOARD', B.x + 16, B.y + 30);
  s.tickets.forEach((t, i) => {
    drawTicket(ctx, t, B.x + 12, B.y + 44 + i * LAYOUT.ticketH, B.w - 24, t.id === s.selectedId);
  });
  if (s.tickets.length === 0) {
    ctx.fillStyle = '#e8dcc0'; ctx.font = '15px Verdana, sans-serif';
    ctx.fillText('No tickets — quiet dawn…', B.x + 16, B.y + 80);
  }

  // griddle
  const G = LAYOUT.griddle;
  ctx.fillStyle = '#2f3237'; rr(ctx, G.x, G.y, G.w, G.h, 12); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText('GRIDDLE — pour [1], click a cake to flip / plate it', G.x + 16, G.y + 26);
  s.griddle.forEach((slot, i) => drawGriddleSlot(ctx, slot, LAYOUT.slots[i].cx, LAYOUT.slots[i].cy + 12));

  // assembly
  const A = LAYOUT.assembly;
  ctx.fillStyle = '#fdf6e0'; rr(ctx, A.x, A.y, A.w, A.h, 12); ctx.fill();
  ctx.fillStyle = '#40260d'; ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText('ASSEMBLY PLATE', A.x + 16, A.y + 28);
  drawStack(ctx, LAYOUT.plate.cx, LAYOUT.plate.cy + 30, LAYOUT.plate.rx, s.plate);
  ctx.font = '14px Verdana, sans-serif'; ctx.fillStyle = '#4a3421';
  const sel = s.tickets.find((t) => t.id === s.selectedId);
  ctx.fillText(sel ? `Building for Ticket #${sel.id}` : 'Click a ticket, then build it', A.x + 330, A.y + 52);
  ctx.fillText(`Cakes on plate: ${s.plate.cakes.length}`, A.x + 330, A.y + 74);
  ctx.fillText(s.plate.syrup ? `Syrup: ${SYRUPS[s.plate.syrup].label}` : 'Syrup: —', A.x + 330, A.y + 96);
  ctx.fillText(`Butter: ${s.plate.butter ? 'yes' : 'no'}`, A.x + 330, A.y + 118);
  ctx.fillText(s.plate.fruit ? `Fruit: ${FRUITS[s.plate.fruit].label}` : 'Fruit: —', A.x + 330, A.y + 140);
  const SB = LAYOUT.serveBtn;
  ctx.fillStyle = '#58a34c'; rr(ctx, SB.x, SB.y, SB.w, SB.h, 10); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Verdana, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('SERVE ▶', SB.x + SB.w / 2, SB.y + 38); ctx.textAlign = 'left';

  // pass
  const P = LAYOUT.pass;
  ctx.fillStyle = '#4a3421'; rr(ctx, P.x, P.y, P.w, P.h, 12); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText('THE PASS — READY TO SERVE', P.x + 16, P.y + 28);
  ctx.fillStyle = '#8a5a2b'; ctx.fillRect(P.x + 20, 300, P.w - 40, 12);
  if (s.passPlate) {
    drawStack(ctx, LAYOUT.passPlate.cx, LAYOUT.passPlate.cy, LAYOUT.passPlate.rx, s.passPlate);
    ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 15px Verdana, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(s.passLabel || 'Fresh off the griddle!', LAYOUT.passPlate.cx, 356);
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = '#cbb590';
    ctx.font = '15px Verdana, sans-serif';
    ctx.fillText('Nothing on the pass yet.', P.x + 24, 200);
  }
  ctx.fillStyle = '#e8dcc0'; ctx.font = '14px Verdana, sans-serif';
  ctx.fillText(`Served: ${s.served}   Golden flips: ${s.golden}`, P.x + 24, P.y + 62);

  // ingredient counter
  ctx.fillStyle = '#5d3d1e'; ctx.fillRect(LAYOUT.binX0 - 8, LAYOUT.binsY - 8, 940, LAYOUT.binsH + 16);
  LAYOUT.binKeys.forEach((key, i) => {
    drawBin(ctx, key, LAYOUT.binX0 + i * (LAYOUT.binW + LAYOUT.binGap), LAYOUT.binsY, LAYOUT.binW, LAYOUT.binsH, i);
  });

  // hints / message panel
  const Hp = LAYOUT.hints;
  ctx.fillStyle = '#40260d'; rr(ctx, Hp.x, Hp.y, Hp.w, Hp.h, 10); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 14px Verdana, sans-serif';
  ctx.fillText('DINER NOTES', Hp.x + 12, Hp.y + 24);
  ctx.fillStyle = '#fdf6e0'; ctx.font = '13px Verdana, sans-serif';
  const lines = s.message ? s.message.split('\n') : [];
  lines.slice(0, 4).forEach((ln, i) => ctx.fillText(ln, Hp.x + 12, Hp.y + 48 + i * 19));
  ctx.fillStyle = '#cbb590'; ctx.font = '11px Verdana, sans-serif';
  ctx.fillText('Keys 1–9 bins · Space serve · ⌫ trash plate', Hp.x + 12, Hp.y + Hp.h - 10);

  // cover banner
  if (s.banner) {
    ctx.fillStyle = 'rgba(64,38,13,0.88)';
    rr(ctx, 300, 300, 680, 150, 18); ctx.fill();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; rr(ctx, 300, 300, 680, 150, 18); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 52px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('PANCAKE PARADE', 640, 366);
    ctx.fillStyle = '#fdf6e0'; ctx.font = '22px Georgia, serif';
    ctx.fillText('Sunrise Diner Stacks — flip at the bubbles!', 640, 408);
    ctx.textAlign = 'left';
  }
  if (s.gameOver) {
    ctx.fillStyle = 'rgba(30,16,4,0.82)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 54px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('SHIFT OVER', 640, 340);
    ctx.fillStyle = '#fdf6e0'; ctx.font = '26px Verdana, sans-serif';
    ctx.fillText(`You earned $ ${s.coins} and served ${s.served} stacks.`, 640, 396);
    ctx.fillText('Click anywhere to open the diner again.', 640, 440);
    ctx.textAlign = 'left';
  }
}
