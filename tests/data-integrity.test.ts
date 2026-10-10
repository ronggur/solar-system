import { readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { moons } from '@/data/moons';
import { planets, sunData } from '@/data/planets';
import { satellites } from '@/data/satellites';
import { publicFileExists, readText, ROOT } from './repo';

/** The Sun is a `PlanetData`-like entry with id `sun`, kept outside the `planets` array. */
const planetCollection = [sunData, ...planets];
const planetIds = new Set(planets.map((p) => p.id));
const moonById = new Map(moons.map((m) => [m.id, m]));

function duplicates(ids: string[]): string[] {
  return ids.filter((id, i) => ids.indexOf(id) !== i);
}

describe('unique ids', () => {
  it.each([
    ['planets (incl. sun)', planetCollection.map((p) => p.id)],
    ['moons', moons.map((m) => m.id)],
    ['satellites', satellites.map((s) => s.id)],
  ])('%s have unique ids', (collection, ids) => {
    expect(
      duplicates(ids),
      `duplicate id(s) in ${collection}: ${duplicates(ids).join(', ')}`,
    ).toEqual([]);
  });
});

describe('parent references', () => {
  it('every moon parentPlanet is a planet id', () => {
    const bad = moons.filter((m) => !planetIds.has(m.parentPlanet));
    expect(
      bad.map((m) => `${m.id} -> "${m.parentPlanet}"`),
      `moon(s) with an unknown parentPlanet (valid: ${[...planetIds].join(', ')})`,
    ).toEqual([]);
  });

  it('every satellite parentPlanet is a planet id, "sun" or "moon"', () => {
    const bad = satellites.filter(
      (s) => !planetIds.has(s.parentPlanet) && s.parentPlanet !== 'sun' && s.parentPlanet !== 'moon',
    );
    expect(
      bad.map((s) => `${s.id} -> "${s.parentPlanet}"`),
      'satellite(s) with an unknown parentPlanet',
    ).toEqual([]);
  });

  it('"moon" is only a valid satellite parent because the Moon exists in moons.ts', () => {
    const moonChildren = satellites.filter((s) => s.parentPlanet === 'moon').map((s) => s.id);
    if (moonChildren.length > 0) {
      expect(
        moonById.has('moon'),
        `satellite(s) ${moonChildren.join(', ')} orbit "moon" but moons.ts has no moon with id "moon"`,
      ).toBe(true);
    }
  });
});

describe('asset references resolve under public/', () => {
  const refs: { owner: string; field: string; path: string }[] = [
    ...planetCollection.flatMap((p) =>
      p.texture ? [{ owner: `planets.ts:${p.id}`, field: 'texture', path: p.texture }] : [],
    ),
    ...moons.flatMap((m) =>
      m.texture ? [{ owner: `moons.ts:${m.id}`, field: 'texture', path: m.texture }] : [],
    ),
    ...satellites.flatMap((s) => [
      ...(s.imageUrl ? [{ owner: `satellites.ts:${s.id}`, field: 'imageUrl', path: s.imageUrl }] : []),
      ...(s.modelPath ? [{ owner: `satellites.ts:${s.id}`, field: 'modelPath', path: s.modelPath }] : []),
    ]),
  ];

  it('finds asset references in the data files (guards against an empty scan)', () => {
    expect(refs.length).toBeGreaterThan(40);
  });

  it('every texture / imageUrl / modelPath in data points to an existing file', () => {
    const missing = refs
      .filter((r) => !publicFileExists(r.path))
      .map((r) => `${r.owner} ${r.field}: "${r.path}" (expected public/${r.path.replace(/^\/+/, '')})`);
    expect(missing, 'missing asset file(s)').toEqual([]);
  });

  it('modelPath and modelScale are set together', () => {
    const bad = satellites
      .filter((s) => (s.modelPath !== undefined) !== (s.modelScale !== undefined))
      .map((s) => `${s.id}: modelPath=${s.modelPath ?? 'unset'}, modelScale=${s.modelScale ?? 'unset'}`);
    expect(bad, 'satellite(s) with only one of modelPath / modelScale').toEqual([]);
  });

  it('hard-coded texture paths in components and index.html resolve', () => {
    const files = readdirSync(path.join(ROOT, 'src/components'))
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => `src/components/${f}`);
    const found = new Map<string, string>(); // asset path -> first file that mentions it

    for (const file of files) {
      for (const m of readText(file).matchAll(/textures\/[\w.-]+\.(?:webp|png|jpe?g)/g)) {
        if (!found.has(m[0])) found.set(m[0], file);
      }
    }
    for (const m of readText('index.html').matchAll(/href="(textures\/[\w.-]+\.(?:webp|png|jpe?g))"/g)) {
      if (!found.has(m[1])) found.set(m[1], 'index.html');
    }

    // Known hard-coded paths: Earth day/night (Planet.tsx), Saturn rings (Planet.tsx),
    // belt textures (SolarSystem.tsx). A regex that stops matching must fail loudly.
    for (const known of [
      'textures/earth_day.webp',
      'textures/earth_night.webp',
      'textures/saturn_ring_alpha.png',
      'textures/ceres.webp',
      'textures/pluto.webp',
    ]) {
      expect(found.has(known), `scan did not find hard-coded path "${known}"`).toBe(true);
    }

    const missing = [...found]
      .filter(([assetPath]) => !publicFileExists(assetPath))
      .map(([assetPath, file]) => `${file}: "${assetPath}" (expected public/${assetPath})`);
    expect(missing, 'missing hard-coded asset file(s)').toEqual([]);
  });
});

describe('orbit distances clear the parent body', () => {
  function parentRadius(parent: string): number | undefined {
    if (parent === 'sun') return sunData.radius;
    if (parent === 'moon') return moonById.get('moon')?.radius;
    return planets.find((p) => p.id === parent)?.radius;
  }

  it('orbitDistance > parent radius + radius for every moon', () => {
    const bad = moons.flatMap((m) => {
      const r = parentRadius(m.parentPlanet);
      if (r === undefined) return [`${m.id}: unknown parent "${m.parentPlanet}"`];
      return m.orbitDistance > r + m.radius
        ? []
        : [`${m.id}: orbitDistance ${m.orbitDistance} <= ${m.parentPlanet} radius ${r} + ${m.radius}`];
    });
    expect(bad, 'moon(s) intersecting their parent').toEqual([]);
  });

  it('orbitDistance > parent radius + radius for every orbiting satellite', () => {
    const bad = satellites
      .filter((s) => !s.escapeTrajectory) // escape probes do not orbit
      .flatMap((s) => {
        const r = parentRadius(s.parentPlanet);
        if (r === undefined) return [`${s.id}: unknown parent "${s.parentPlanet}"`];
        return s.orbitDistance > r + s.radius
          ? []
          : [`${s.id}: orbitDistance ${s.orbitDistance} <= ${s.parentPlanet} radius ${r} + ${s.radius}`];
      });
    expect(bad, 'satellite(s) intersecting their parent').toEqual([]);
  });
});
