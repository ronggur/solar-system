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
