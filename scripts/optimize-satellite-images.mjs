#!/usr/bin/env node
/**
 * Resize + strip metadata + WebP encode for UI thumbnails in public/satellites/.
 * Requires ImageMagick 7+ (`magick` on PATH). macOS: brew install imagemagick
 *
 * Run: npm run optimize-satellite-images
 */

import { readdirSync, unlinkSync, renameSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'public', 'satellites');

/** Max width/height for info-panel images (only shrinks larger sources). */
const MAX = '960x960>';

const WEBP_QUALITY = '85';

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp']);

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

function runMagick(bin, inFile, outFile) {
  const args =
    bin === 'magick'
      ? [inFile, '-resize', MAX, '-strip', '-quality', WEBP_QUALITY, outFile]
      : [inFile, '-resize', MAX, '-strip', '-quality', WEBP_QUALITY, outFile];
  execFileSync(bin, args, { stdio: 'inherit' });
}

function main() {
  if (!existsSync(DIR)) {
    console.error('Missing directory:', DIR);
    process.exit(1);
  }

  const bin = magickCmd();
  const names = readdirSync(DIR).filter((n) => {
    const e = extname(n).toLowerCase();
    return ALLOWED.has(e);
  });

  if (names.length === 0) {
    console.log('No images in', DIR);
    return;
  }

  console.log(`Optimizing ${names.length} file(s) → WebP (max ${MAX}, q=${WEBP_QUALITY})…\n`);

  for (const name of names) {
    const ext = extname(name);
    const base = basename(name, ext);
    const inPath = join(DIR, name);
    const outPath = join(DIR, `${base}.webp`);
    const tmpPath = join(DIR, `.opt-work-${base}.webp`);

    try {
      runMagick(bin, inPath, tmpPath);
      unlinkSync(inPath);
      renameSync(tmpPath, outPath);
      console.log(`  ✓ ${name} → ${base}.webp`);
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

  console.log('\nDone. Ensure src/data/satellites.ts imageUrl entries use matching `.webp` names.');
}

main();
