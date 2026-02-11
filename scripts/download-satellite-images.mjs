#!/usr/bin/env node
/**
 * Downloads satellite images to public/satellites/ (sources: Wikimedia Commons).
 * Run: node scripts/download-satellite-images.mjs
 * Or: npm run download-satellite-images
 */

import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'satellites');

const IMAGES = [
  { file: 'iss.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/International_Space_Station_after_undocking_of_STS-132.jpg' },
  { file: 'hubble.jpeg', url: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/HST-SM4.jpeg' },
  { file: 'jwst.png', url: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/James_Webb_Space_Telescope_2021.png' },
  { file: 'gps.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/GPS_Satellite_ArtistConcept_20th.jpg' },
  { file: 'starlink.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Starlink_Launch_4_%2840604315141%29.jpg' },
  { file: 'voyager.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Voyager_program_illustration.jpg' },
  { file: 'cassini.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Cassini_Saturn_Orbit_Insertion.jpg' },
  { file: 'juno.png', url: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Juno_mission_patch_400.png' },
  { file: 'mars-reconnaissance.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Mars_Reconnaissance_Orbiter_artist_render.jpg' },
  { file: 'tianhe.png', url: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Tiangong_Space_Station_after_being_completed_in_2022.png' },
  { file: 'gaia.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Gaia_satellite_artist_impression.jpg' },
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  'Referer': 'https://commons.wikimedia.org/',
};

async function downloadOne({ file, url }) {
  const outPath = join(OUT_DIR, file);
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
  if (!res.ok) throw new Error(`${file}: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error(`${file}: response too small (${buf.length} bytes), likely not an image`);
  await writeFile(outPath, buf);
  console.log(`  ✓ ${file} (${(buf.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log('Downloading satellite images to public/satellites/ ...\n');
  for (const entry of IMAGES) {
    try {
      await downloadOne(entry);
    } catch (e) {
      console.error(`  ✗ ${entry.file}: ${e.message}`);
    }
  }
  console.log('\nDone.');
}

main();
