import { describe, expect, it } from 'vitest';
import { moons } from '@/data/moons';
import { satellites } from '@/data/satellites';
import { readText } from './repo';

type Kind = 'moons' | 'spacecraft';
interface Claim {
  kind: Kind;
  count: number;
  line: number;
  text: string;
}

const expectedCount: Record<Kind, number> = {
  moons: moons.length,
  spacecraft: satellites.length,
};

/**
 * Finds counts written next to the words moons / spacecraft / satellites:
 *   "26 moons", "26 natural moons", "24 spacecraft"   (number before the word)
 *   "Natural moons (26)", "Spacecraft (24)"           (number in parentheses after the word)
 * "satellites" is treated as spacecraft: in this app a satellite is a human-made spacecraft.
 */
function findClaims(source: string): Claim[] {
  const claims: Claim[] = [];
  const kindOf = (word: string): Kind => (word.toLowerCase() === 'moons' ? 'moons' : 'spacecraft');
  const before = /\b(\d+)\s+(?:(?:major|natural)\s+)?(moons|spacecraft|satellites)\b/gi;
  const after = /\b(moons|spacecraft|satellites)\s*\((\d+)\)/gi;

  source.split('\n').forEach((text, i) => {
    for (const m of text.matchAll(before)) {
      claims.push({ kind: kindOf(m[2]), count: Number(m[1]), line: i + 1, text: m[0] });
    }
    for (const m of text.matchAll(after)) {
      claims.push({ kind: kindOf(m[1]), count: Number(m[2]), line: i + 1, text: m[0] });
    }
  });
  return claims;
}

describe.each(['README.md', 'index.html'])('object counts quoted in %s', (file) => {
  const claims = findClaims(readText(file));

  it.each<Kind>(['moons', 'spacecraft'])('mentions a %s count at least once', (kind) => {
    // A regex that silently matches nothing must not pass as "all counts correct".
    expect(
      claims.filter((c) => c.kind === kind).length,
      `${file}: found no "${kind}" count; update findClaims() in tests/docs-counts.test.ts if the wording changed`,
    ).toBeGreaterThan(0);
  });

  it('matches moons.length and satellites.length', () => {
    const wrong = claims
      .filter((c) => c.count !== expectedCount[c.kind])
      .map((c) => `${file}:${c.line} says "${c.text}" but the data has ${expectedCount[c.kind]} ${c.kind}`);
    expect(wrong, 'stale count(s); update the docs or the data').toEqual([]);
  });
});
