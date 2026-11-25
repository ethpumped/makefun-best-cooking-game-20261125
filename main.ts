// Pancake Parade — Sunrise Diner Stacks: hand-in program.
//
// The game itself is the plain static site under game/ (open
// game/index.html in a browser, no build step, no network). This program
// prepares the submission: it mirrors game/ and screenshots/ into the
// output folder and writes dossier.json there using the vendored
// make.fun dossier builder, capped at the bounty limits.
//
// Run locally with:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const target = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(target, { recursive: true });
cpSync(join(root, 'game'), join(target, 'game'), { recursive: true });
mkdirSync(join(target, 'screenshots'), { recursive: true });
if (existsSync(join(root, 'screenshots'))) {
  cpSync(join(root, 'screenshots'), join(target, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(target, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(target, 'dossier.json'), dossier);
