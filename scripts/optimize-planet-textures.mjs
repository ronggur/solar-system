#!/usr/bin/env node
/**
 * Downsize the heaviest planet/moon textures in public/textures/.
 * Requires ImageMagick 7+ (`magick` on PATH). macOS: brew install imagemagick
 *
 * Run: node scripts/optimize-planet-textures.mjs
 *
 * Only the files listed below are touched: dwarf planets render tiny (and are
 * also tiled across the belts), the Moon and Mercury support click-to-zoom so
 * they keep more detail. Everything else in public/textures/ stays untouched.
 * Filenames never change (they are referenced from src/data/*.ts).
 */

import { unlinkSync, renameSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'public', 'textures');

/** file -> { resize, quality } (resize only shrinks larger sources). */
const TARGETS = {
  'ceres.webp': { resize: '1024x512>', quality: '78' },
  'eris.webp': { resize: '1024x512>', quality: '78' },
  'haumea.webp': { resize: '1024x512>', quality: '78' },
  'makemake.webp': { resize: '1024x512>', quality: '78' },
  'moon.webp': { resize: '1280x640>', quality: '80' },
  'mercury.webp': { resize: '1280x640>', quality: '80' },
};

function magickCmd() {
  try {
    execFileSync('magick', ['-version'], { stdio: 'pipe' });
    return 'magick';
  } catch {
    try {
      execFileSync('convert', ['-version'], { stdio: 'pipe' });
      return 'convert';
    } catch {
      console.error('Install ImageMagick (brew install imagemagick) so `magick` is on PATH.');
      process.exit(1);
    }
  }
}

function main() {
  if (!existsSync(DIR)) {
    console.error('Missing directory:', DIR);
    process.exit(1);
  }

  const bin = magickCmd();
  console.log(`Optimizing ${Object.keys(TARGETS).length} planet texture(s)…\n`);

  for (const [name, { resize, quality }] of Object.entries(TARGETS)) {
    const inPath = join(DIR, name);
    const tmpPath = join(DIR, `.opt-work-${name}`);
    if (!existsSync(inPath)) {
      console.error(`  ✗ ${name}: missing`);
      process.exitCode = 1;
      continue;
    }
    try {
      execFileSync(bin, [inPath, '-resize', resize, '-strip', '-quality', quality, tmpPath], {
        stdio: 'inherit',
      });
      unlinkSync(inPath);
      renameSync(tmpPath, inPath);
      console.log(`  ✓ ${name} (${resize} q${quality})`);
    } catch (e) {
      if (existsSync(tmpPath)) {
        try {
          unlinkSync(tmpPath);
        } catch {
          /* ignore */
        }
      }
      console.error(`  ✗ ${name}:`, e.message || e);
      process.exitCode = 1;
    }
  }

  console.log('\nDone.');
}

main();
