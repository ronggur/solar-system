/**
 * Removes texture assets not referenced by the app.
 * Matches src/data/planets.ts, moons.ts, and Planet.tsx (Earth day/night + Saturn ring).
 *
 * Run: node scripts/prune-unused-textures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const texturesDir = path.join(root, 'public', 'textures');

const keepNames = new Set([
  'mercury.webp',
  'venus_atmosphere.webp',
  'earth_day.webp',
  'earth_night.webp',
  'mars.webp',
  'ceres.webp',
  'jupiter.webp',
  'saturn.webp',
  'uranus.webp',
  'neptune.webp',
  'pluto.webp',
  'haumea.webp',
  'makemake.webp',
  'eris.webp',
  'sun.webp',
  'moon.webp',
  'saturn_ring_alpha.png',
]);

if (!fs.existsSync(texturesDir)) {
  console.error('Missing', texturesDir);
  process.exit(1);
}

for (const name of fs.readdirSync(texturesDir)) {
  const full = path.join(texturesDir, name);
  const st = fs.statSync(full);
  if (st.isDirectory()) {
    if (name === 'optimize') {
      fs.rmSync(full, { recursive: true, force: true });
      console.log('removed:', path.relative(root, full));
    }
    continue;
  }
  if (!keepNames.has(name)) {
    fs.unlinkSync(full);
    console.log('removed:', path.relative(root, full));
  }
}
