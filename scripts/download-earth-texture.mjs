import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const textures = [
  {
    url: 'https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg',
    filename: 'earth_day.jpg',
  },
  {
    url: 'https://www.solarsystemscope.com/textures/download/2k_earth_nightmap.jpg',
    filename: 'earth_night.jpg',
  },
];

const publicDir = path.join(__dirname, '..', 'public');
const texturesDir = path.join(publicDir, 'textures');

// Create directories if they don't exist
if (!fs.existsSync(texturesDir)) {
  fs.mkdirSync(texturesDir, { recursive: true });
}

function downloadTexture(url, filename) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(texturesDir, filename);
    console.log(`\nDownloading ${filename}...`);
    console.log('URL:', url);
    console.log('Output:', outputPath);

    const file = fs.createWriteStream(outputPath);

    https
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Follow redirect
          const redirectUrl = response.headers.location;
          console.log('Following redirect to:', redirectUrl);

          https
            .get(redirectUrl, (redirectResponse) => {
              redirectResponse.pipe(file);
              file.on('finish', () => {
                file.close();
                const stats = fs.statSync(outputPath);
                console.log(`✅ ${filename} downloaded successfully!`);
                console.log('File size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
                resolve();
              });
            })
            .on('error', (err) => {
              fs.unlink(outputPath, () => {});
              console.error(`❌ Error downloading ${filename}:`, err.message);
              reject(err);
            });
        } else {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            const stats = fs.statSync(outputPath);
            console.log(`✅ ${filename} downloaded successfully!`);
            console.log('File size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
            resolve();
          });
        }
      })
      .on('error', (err) => {
        fs.unlink(outputPath, () => {});
        console.error(`❌ Error downloading ${filename}:`, err.message);
        reject(err);
      });
  });
}

async function downloadAllTextures() {
  console.log('Starting Earth texture downloads...');

  for (const texture of textures) {
    try {
      await downloadTexture(texture.url, texture.filename);
    } catch (error) {
      console.error(`Failed to download ${texture.filename}`);
    }
  }

  console.log('\n✅ All downloads complete!');
}

downloadAllTextures();
