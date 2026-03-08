import * as THREE from 'three';

// Generate planet texture using canvas
export function generatePlanetTexture(
  color: string,
  noiseScale: number = 1,
  noiseIntensity: number = 0.3,
  bandIntensity: number = 0,
  seed: number = Math.random()
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Fill base color
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);

  // Add noise for surface detail
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  const baseColor = new THREE.Color(color);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Simple noise
      const noise = (Math.random() - 0.5) * 2;
      const bandNoise = Math.sin((y / size) * Math.PI * 4 + seed * 10) * bandIntensity;
      const totalNoise = noise * noiseIntensity + bandNoise;

      // Apply noise to color
      data[i] = Math.max(0, Math.min(255, baseColor.r * 255 + totalNoise * 50));
      data[i + 1] = Math.max(0, Math.min(255, baseColor.g * 255 + totalNoise * 50));
      data[i + 2] = Math.max(0, Math.min(255, baseColor.b * 255 + totalNoise * 50));
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Add some crater-like features for rocky planets
  if (noiseScale > 0.5) {
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = Math.random() * 20 + 5;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// Generate gas giant texture with bands
export function generateGasGiantTexture(
  baseColor: string,
  bandColors: string[],
  seed: number = Math.random()
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Fill base
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  // Create horizontal bands
  const numBands = bandColors.length;
  const bandHeight = size / numBands;

  bandColors.forEach((color, index) => {
    const y = index * bandHeight;
    const gradient = ctx.createLinearGradient(0, y, 0, y + bandHeight);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, baseColor);
    gradient.addColorStop(1, color);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, y, size, bandHeight);
  });

  // Add turbulence
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const noise = Math.sin(x * 0.02 + seed * 5) * Math.cos(y * 0.05 + seed * 3) * 10;

      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// Generate sun texture with solar surface effects
export function generateSunTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Base orange-yellow gradient
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, '#FFFF80');
  gradient.addColorStop(0.3, '#FFD700');
  gradient.addColorStop(0.6, '#FF8C00');
  gradient.addColorStop(1, '#FF4500');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Add solar granulation noise
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = x - size / 2;
      const dy = y - size / 2;
      const dist = Math.sqrt(dx * dx + dy * dy) / (size / 2);

      if (dist < 1) {
        const noise = (Math.random() - 0.5) * 30;
        const turbulence = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 20;

        data[i] = Math.max(0, Math.min(255, data[i] + noise + turbulence));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise + turbulence * 0.8));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Add sunspots
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * size * 0.4;
    const x = size / 2 + Math.cos(angle) * dist;
    const y = size / 2 + Math.sin(angle) * dist;
    const radius = Math.random() * 15 + 5;

    ctx.fillStyle = 'rgba(100, 50, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// Generate Earth-like texture with continents
export function generateEarthTexture(): THREE.CanvasTexture {
  const size = 1024; // Higher resolution for better detail
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Deep ocean base
  ctx.fillStyle = '#0F4C81';
  ctx.fillRect(0, 0, size, size);

  // Create more realistic continents using multiple overlapping regions
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  // Simplified continent shapes (approximating real geography)
  const continents = [
    // North America
    { x: 180, y: 280, radius: 120, variation: 30 },
    // South America
    { x: 240, y: 520, radius: 100, variation: 25 },
    // Europe
    { x: 520, y: 250, radius: 70, variation: 20 },
    // Africa
    { x: 540, y: 420, radius: 110, variation: 30 },
    // Asia
    { x: 700, y: 280, radius: 150, variation: 40 },
    // Australia
    { x: 800, y: 600, radius: 60, variation: 15 },
    // Antarctica
    { x: 512, y: 950, radius: 200, variation: 20 },
  ];

  // Add noise function for terrain variation
  const noise = (x: number, y: number) => {
    return (
      Math.sin(x * 0.02) * Math.cos(y * 0.02) * 20 +
      Math.sin(x * 0.05 + 100) * Math.cos(y * 0.05 + 100) * 10
    );
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Check if point is inside any continent
      let inContinent = false;
      let landType = 0; // 0 = none, 1 = lowland, 2 = highland, 3 = mountain

      for (const continent of continents) {
        const dx = x - continent.x;
        const dy = y - continent.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < continent.radius) {
          const edgeFactor = 1 - dist / continent.radius;
          const n = noise(x, y) * (edgeFactor * 0.5);
          const threshold = 0.2 + Math.random() * 0.2;

          if (edgeFactor * 1.5 + n * 0.01 > threshold) {
            inContinent = true;

            // Determine land type based on elevation noise
            const elevation = edgeFactor + n * 0.1;
            if (elevation > 0.8) {
              landType = 3; // Mountain - darker brown
            } else if (elevation > 0.5) {
              landType = 2; // Highland - medium green
            } else {
              landType = 1; // Lowland - light green
            }
            break;
          }
        }
      }

      if (inContinent) {
        // Land colors based on type
        if (landType === 3) {
          // Mountains/rocky terrain
          const mountainNoise = (Math.random() - 0.5) * 20;
          data[i] = Math.min(255, 139 + mountainNoise); // R - brown
          data[i + 1] = Math.min(255, 90 + mountainNoise); // G
          data[i + 2] = Math.min(255, 43 + mountainNoise); // B
        } else if (landType === 2) {
          // Highland - forest green
          const forestNoise = (Math.random() - 0.5) * 15;
          data[i] = Math.min(255, 34 + forestNoise); // R
          data[i + 1] = Math.min(255, 100 + forestNoise); // G
          data[i + 2] = Math.min(255, 34 + forestNoise); // B
        } else {
          // Lowland - grassland/fields
          const grassNoise = (Math.random() - 0.5) * 20;
          data[i] = Math.min(255, 85 + grassNoise); // R
          data[i + 1] = Math.min(255, 150 + grassNoise); // G
          data[i + 2] = Math.min(255, 60 + grassNoise); // B
        }
      } else {
        // Ocean with depth variation
        const oceanX = x / size;
        const oceanY = y / size;
        const depthNoise = Math.sin(oceanX * 10) * Math.cos(oceanY * 10) * 15;
        const randomNoise = (Math.random() - 0.5) * 10;

        data[i] = Math.max(0, Math.min(255, 15 + depthNoise + randomNoise));
        data[i + 1] = Math.max(0, Math.min(255, 76 + depthNoise + randomNoise));
        data[i + 2] = Math.max(0, Math.min(255, 129 + depthNoise + randomNoise));
      }

      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Add polar ice caps
  // North pole ice
  const northIce = ctx.createLinearGradient(0, 0, 0, 80);
  northIce.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  northIce.addColorStop(0.5, 'rgba(240, 248, 255, 0.85)');
  northIce.addColorStop(1, 'rgba(240, 248, 255, 0)');
  ctx.fillStyle = northIce;
  ctx.fillRect(0, 0, size, 80);

  // Add some ice on Greenland
  ctx.fillStyle = 'rgba(240, 248, 255, 0.85)';
  ctx.beginPath();
  ctx.ellipse(200, 180, 40, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  // South pole ice
  const southIce = ctx.createLinearGradient(0, size - 100, 0, size);
  southIce.addColorStop(0, 'rgba(240, 248, 255, 0)');
  southIce.addColorStop(0.3, 'rgba(240, 248, 255, 0.8)');
  southIce.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
  ctx.fillStyle = southIce;
  ctx.fillRect(0, size - 100, size, 100);

  // Add subtle clouds (very light wisps)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  for (let i = 0; i < 15; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const rx = Math.random() * 80 + 20;
    const ry = Math.random() * 30 + 10;

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// Generate procedural moon texture based on real surface appearance
// Research: NASA, Voyager, Cassini, New Horizons imagery and spectral data
export function generateMoonTexture(
  moonId: string,
  baseColor: string,
  surfaceType: 'rocky' | 'icy' | 'volcanic' | 'mixed' = 'icy',
  options?: { twoTone?: boolean; polarCap?: string }
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Deterministic seed from moonId
  const seed = moonId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rnd = (n: number) => ((Math.sin(seed * n) * 0.5 + 0.5) * 1000) % 1;

  const base = new THREE.Color(baseColor);

  // Fill base
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const u = x / size;
      const v = y / size;

      let r = base.r * 255;
      let g = base.g * 255;
      let b = base.b * 255;

      // Per-pixel noise (deterministic)
      const nx = (x + seed * 7) * 0.02;
      const ny = (y + seed * 11) * 0.02;
      const noise =
        (Math.sin(nx) * Math.cos(ny) + Math.sin(nx * 2 + 1) * Math.cos(ny * 2 + 2)) * 0.5 + 0.5;

      if (surfaceType === 'rocky') {
        // Phobos, Deimos, Nereid: gray-brown, cratered, grooves
        const craterNoise = Math.sin((x + seed) * 0.03) * Math.cos((y + seed * 2) * 0.03);
        const variation = (noise - 0.5) * 40 + craterNoise * 25;
        r = Math.max(0, Math.min(255, r + variation));
        g = Math.max(0, Math.min(255, g + variation * 0.9));
        b = Math.max(0, Math.min(255, b + variation * 0.7));
      } else if (surfaceType === 'volcanic') {
        // Io: sulfur yellows, oranges, reds, lava flows
        const lava = Math.sin(u * Math.PI * 6 + seed) * Math.cos(v * Math.PI * 4 + seed * 0.7);
        const sulfur = noise > 0.6 ? 1 : noise > 0.3 ? 0.5 : 0;
        r = Math.min(255, r + 80 * sulfur + lava * 30);
        g = Math.min(255, g + 60 * sulfur + lava * 10);
        b = Math.max(0, Math.min(255, b - 20 * sulfur + lava * 5));
      } else if (surfaceType === 'mixed') {
        // Titan: orange-brown haze, methane lakes
        const haze = 0.7 + noise * 0.3;
        r = Math.min(255, r * haze + 30);
        g = Math.min(255, g * haze);
        b = Math.max(0, b * haze - 20);
      } else {
        // icy: Europa, Ganymede, Callisto, Enceladus, etc.
        if (options?.twoTone) {
          // Iapetus: dark leading / bright trailing
          const hemisphere = u < 0.5 ? 0.3 : 1;
          r *= hemisphere + noise * 0.2;
          g *= hemisphere + noise * 0.2;
          b *= hemisphere + noise * 0.2;
        } else if (options?.polarCap) {
          // Charon: gray with reddish polar cap
          const cap = v < 0.15 || v > 0.85 ? 1 : 0;
          r = Math.min(255, r + (cap * 40));
          g = Math.max(0, g - (cap * 10));
          b = Math.max(0, b - (cap * 15));
        } else {
          const frost = noise > 0.7 ? 1.15 : 1;
          const dark = noise < 0.25 ? 0.85 : 1;
          r = Math.max(0, Math.min(255, r * frost * dark + (noise - 0.5) * 40));
          g = Math.max(0, Math.min(255, g * frost * dark + (noise - 0.5) * 40));
          b = Math.max(0, Math.min(255, b * frost * dark + (noise - 0.5) * 40));
        }
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Add craters for rocky/icy
  if (surfaceType === 'rocky' || surfaceType === 'icy') {
    const craterCount = surfaceType === 'rocky' ? 35 : 25;
    for (let c = 0; c < craterCount; c++) {
      const cx = (rnd(c * 3) * 0.8 + 0.1) * size;
      const cy = (rnd(c * 5 + 1) * 0.8 + 0.1) * size;
      const radius = (rnd(c * 7 + 2) * 15 + 3) | 0;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, 'rgba(0,0,0,0.35)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Triton: pinkish tint overlay
  if (moonId === 'triton') {
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(255, 180, 180, 0.15)';
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// Cache for generated textures
const textureCache = new Map<string, THREE.CanvasTexture>();

export function getCachedTexture(
  key: string,
  generator: () => THREE.CanvasTexture
): THREE.CanvasTexture {
  if (!textureCache.has(key)) {
    textureCache.set(key, generator());
  }
  return textureCache.get(key)!;
}

export function clearTextureCache() {
  textureCache.forEach((texture) => {
    texture.dispose();
  });
  textureCache.clear();
}

/** Get or create cached procedural moon texture */
export function getCachedMoonTexture(
  moonId: string,
  baseColor: string,
  surfaceType?: 'rocky' | 'icy' | 'volcanic' | 'mixed',
  options?: { twoTone?: boolean; polarCap?: string }
): THREE.CanvasTexture {
  const key = `moon-${moonId}`;
  if (!textureCache.has(key)) {
    textureCache.set(
      key,
      generateMoonTexture(moonId, baseColor, surfaceType || 'icy', options)
    );
  }
  return textureCache.get(key)!;
}
