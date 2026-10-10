import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path of the repository root (this file lives in `<root>/tests`). */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function readText(relPath: string): string {
  return readFileSync(path.join(ROOT, relPath), 'utf8');
}

/**
 * Resolves an asset reference from data or code against `public/`. A leading slash is optional
 * (see ARCHITECTURE.md, "Path conventions"), so `/textures/a.webp` and `textures/a.webp` are the
 * same file.
 */
export function publicFileExists(assetPath: string): boolean {
  return existsSync(path.join(ROOT, 'public', assetPath.replace(/^\/+/, '')));
}
