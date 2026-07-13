#!/usr/bin/env node
/**
 * Batch-optimize GLBs in public/3d-objects/satellites/ using @gltf-transform/cli.
 *
 * Usage: npm run compress-satellite-glbs
 * Requires: npm install (installs devDependency @gltf-transform/cli)
 *
 * Runs `gltf-transform optimize` per file (in-place replace via temp file)
 * with meshopt geometry compression and WebP texture compression. Files are
 * only replaced when the optimized output is smaller than the original.
 *
 * No runtime changes are needed for meshopt: drei's useGLTF wires
 * MeshoptDecoder (from three-stdlib) into GLTFLoader by default.
 *
 * Note: maven.glb was additionally pre-simplified (4.2M-vertex disconnected
 * triangle soup that the standard simplifier cannot reduce) with
 * scripts/simplify-glb-sloppy.mjs before running this script.
 */

import {
  readdirSync,
  unlinkSync,
  existsSync,
  copyFileSync,
  statSync,
  readFileSync,
} from 'node:fs';
import { join, dirname, basename } from 'node:path';
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

const COMMON_ARGS = [
  '--compress', 'meshopt',
  '--texture-compress', 'webp',
  '--texture-size', '1024',
  '--simplify-error', '0.001',
];

function usesDraco(glbPath) {
  return readFileSync(glbPath).includes('KHR_draco_mesh_compression');
}

function optimizeInPlace(glbPath) {
  const tmp = `${glbPath}.opt-tmp.glb`;
  const bin = gltfTransformBin();
  try {
    execFileSync(bin, ['optimize', glbPath, tmp, ...COMMON_ARGS], {
      stdio: 'inherit',
      cwd: root,
    });
    const before = statSync(glbPath).size;
    const after = statSync(tmp).size;
    // Always replace draco sources even if meshopt is slightly larger: draco
    // decoding pulls the decoder wasm from gstatic.com at runtime.
    if (after < before || usesDraco(glbPath)) {
      copyFileSync(tmp, glbPath);
      console.log(`  ok ${glbPath.replace(root + '/', '')} (${before} -> ${after})`);
    } else {
      console.log(`  skip ${basename(glbPath)} (would grow ${before} -> ${after})`);
    }
    unlinkSync(tmp);
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
