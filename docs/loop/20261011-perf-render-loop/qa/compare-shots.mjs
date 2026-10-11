#!/usr/bin/env node
/**
 * AC-5 pixel comparison. Compares the branch screenshots with the BASE screenshots and reports how
 * many pixels differ, using pixelmatch (default threshold 0.1). The noise floor comes from BASE
 * itself: overview-1 vs overview-2 and selected-jupiter-1 vs selected-jupiter-2. A branch pair is a
 * real difference only when it is above the matching noise value.
 *
 * Usage (PW_DIR = scratch dir that holds node_modules/pngjs and node_modules/pixelmatch):
 *   PW_DIR=... node compare-shots.mjs <baseDir> <branchDir> [diffOutDir]
 *
 * pngjs and pixelmatch are installed in PW_DIR only, not in the repo.
 */
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const PW_DIR = process.env.PW_DIR;
if (!PW_DIR) {
  console.error('PW_DIR is required (directory that contains node_modules/pngjs and pixelmatch)');
  process.exit(2);
}
const req = createRequire(PW_DIR + '/');
const { PNG } = req('pngjs');
const pixelmatch = req('pixelmatch');

const [baseDir, branchDir, diffOut] = process.argv.slice(2);
if (!baseDir || !branchDir) {
  console.error('usage: compare-shots.mjs <baseDir> <branchDir> [diffOutDir]');
  process.exit(2);
}

const load = (file) => PNG.sync.read(readFileSync(file));

function diffCount(fileA, fileB, diffFile) {
  const a = load(fileA);
  const b = load(fileB);
  if (a.width !== b.width || a.height !== b.height) {
    return { error: `size mismatch ${a.width}x${a.height} vs ${b.width}x${b.height}` };
  }
  const out = new PNG({ width: a.width, height: a.height });
  const count = pixelmatch(a.data, b.data, out.data, a.width, a.height, { threshold: 0.1 });
  if (diffFile) writeFileSync(diffFile, PNG.sync.write(out));
  return { differentPixels: count, totalPixels: a.width * a.height };
}

const scenes = ['overview', 'selected-jupiter'];
const rows = [];
const noise = {};
for (const scene of scenes) {
  const r = diffCount(
    path.join(baseDir, `${scene}-1.png`),
    path.join(baseDir, `${scene}-2.png`)
  );
  noise[scene] = r.differentPixels;
  rows.push({ pair: `base ${scene}-1 vs base ${scene}-2 (noise)`, ...r });
}
const maxNoise = Math.max(...Object.values(noise));

if (diffOut) mkdirSync(diffOut, { recursive: true });
for (const scene of scenes) {
  for (const i of [1, 2]) {
    const name = `${scene}-${i}.png`;
    const diffFile = diffOut ? path.join(diffOut, `diff-${scene}-${i}.png`) : null;
    const r = diffCount(path.join(baseDir, name), path.join(branchDir, name), diffFile);
    rows.push({
      pair: `branch ${name} vs base ${name}`,
      ...r,
      aboveNoise: r.differentPixels !== undefined ? r.differentPixels > noise[scene] : null,
    });
  }
}

console.log(JSON.stringify({ baseDir, branchDir, noiseByScene: noise, maxNoise, rows }, null, 2));
