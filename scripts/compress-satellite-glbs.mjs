#!/usr/bin/env node
/**
 * Batch-optimize GLBs in public/3d-objects/satellites/ using @gltf-transform/cli.
 *
 * Usage: npm run compress-satellite-glbs
 * Requires: npm install (installs devDependency @gltf-transform/cli)
 *
 * Runs `gltf-transform optimize` per file (in-place replace via temp file).
 * That applies sensible defaults (prune, join, dedup, texture resize, etc.).
 *
 * For stronger compression you can extend the pipeline with meshopt or Draco;
 * meshopt requires MeshoptDecoder in the Three.js loader path; Draco needs
 * decoder assets under public and useGLTF(..., dracoPath). See three.js / drei docs.
 */

import { readdirSync, unlinkSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { platform } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const SAT_DIR = join(root, 'public', '3d-objects', 'satellites');

function gltfTransformBin() {
  const dir = join(root, 'node_modules', '.bin');
  if (platform() === 'win32') {
    const cmd = join(dir, 'gltf-transform.cmd');
    if (existsSync(cmd)) return cmd;
  }
  return join(dir, 'gltf-transform');
}

function optimizeInPlace(glbPath) {
  const tmp = `${glbPath}.opt-tmp.glb`;
  const bin = gltfTransformBin();
  try {
    execFileSync(bin, ['optimize', glbPath, tmp], { stdio: 'inherit', cwd: root });
    copyFileSync(tmp, glbPath);
    unlinkSync(tmp);
    console.log(`  ok ${glbPath.replace(root + '/', '')}`);
  } catch (e) {
    if (existsSync(tmp)) {
      try {
        unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    }
    throw e;
  }
}

function main() {
  const bin = gltfTransformBin();
  if (!existsSync(bin)) {
    console.error('Missing @gltf-transform/cli. Run: npm install');
    process.exit(1);
  }
  if (!existsSync(SAT_DIR)) {
    console.log('No folder', SAT_DIR, '- nothing to do.');
    return;
  }

  const files = readdirSync(SAT_DIR).filter((f) => f.toLowerCase().endsWith('.glb'));
  if (files.length === 0) {
    console.log('No .glb files in', SAT_DIR);
    return;
  }

  console.log(`Optimizing ${files.length} GLB(s)…\n`);
  for (const f of files) {
    const full = join(SAT_DIR, f);
    try {
      optimizeInPlace(full);
    } catch (e) {
      console.error(`  fail ${f}:`, e?.message || e);
      process.exitCode = 1;
    }
  }
  console.log('\nDone.');
}

main();
