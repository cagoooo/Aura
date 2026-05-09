// Generates favicon SVG (modern browsers) + PNG fallbacks (32, 192, 512)
// + apple-touch-icon (180). Lightbulb glyph in brand colors.
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, '..', 'public');
if (!existsSync(PUBLIC_DIR)) mkdirSync(PUBLIC_DIR, { recursive: true });

// SVG favicon — vector, scales perfectly. Lightbulb glyph adapted from
// lucide-react's source. Stroke width tuned for small sizes.
const SVG_FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#4285F4"/>
  <g transform="translate(32 33)" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <!-- lightbulb body -->
    <path d="M-12 -2 a12 12 0 1 1 24 0 c0 5 -3 8 -5 11 v3 h-14 v-3 c-2 -3 -5 -6 -5 -11z"/>
    <!-- screw threads -->
    <line x1="-7" y1="16" x2="7" y2="16"/>
    <line x1="-5" y1="20" x2="5" y2="20"/>
    <!-- inner glow -->
    <path d="M-4 -2 a4 4 0 0 1 8 0" fill="#FFA726" stroke="#FFA726"/>
  </g>
</svg>`.trim();

writeFileSync(resolve(PUBLIC_DIR, 'icon.svg'), SVG_FAVICON);
console.log('✅ icon.svg');

// Render PNG fallbacks at various sizes by drawing with @napi-rs/canvas.
// Re-implementing the same shape since canvas can't render SVG strings
// without sharp/librsvg (which we explicitly avoid for tofu reasons).
function renderPng(size) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');
  const s = size / 64; // scale relative to 64x64 design

  // rounded background
  ctx.fillStyle = '#4285F4';
  roundRect(ctx, 0, 0, size, size, 14 * s);
  ctx.fill();

  ctx.translate(32 * s, 33 * s);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3.2 * s;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Bulb dome (a circle, then a rectangular base)
  ctx.beginPath();
  ctx.arc(0, -2 * s, 12 * s, Math.PI, 0, false);
  // tapering down to a flat base
  ctx.lineTo(7 * s, 9 * s);
  ctx.lineTo(7 * s, 12 * s);
  ctx.lineTo(-7 * s, 12 * s);
  ctx.lineTo(-7 * s, 9 * s);
  ctx.closePath();
  ctx.stroke();

  // screw threads
  ctx.beginPath();
  ctx.moveTo(-7 * s, 16 * s);
  ctx.lineTo(7 * s, 16 * s);
  ctx.moveTo(-5 * s, 20 * s);
  ctx.lineTo(5 * s, 20 * s);
  ctx.stroke();

  // inner orange glow
  ctx.fillStyle = '#FFA726';
  ctx.beginPath();
  ctx.arc(0, 0, 4.5 * s, 0, Math.PI * 2);
  ctx.fill();

  return c.toBuffer('image/png');
}

const SIZES = [32, 180, 192, 512];
const NAMES = {
  32: 'icon-32.png',
  180: 'apple-touch-icon.png',
  192: 'icon-192.png',
  512: 'icon-512.png',
};

for (const size of SIZES) {
  const buf = renderPng(size);
  const name = NAMES[size];
  writeFileSync(resolve(PUBLIC_DIR, name), buf);
  console.log(`✅ ${name} (${size}x${size}, ${(buf.length/1024).toFixed(1)} KB)`);
}

// Also write web app manifest (basic; basePath-aware via Next.js)
const manifest = {
  name: '5W1H 靈感發射器 Pro',
  short_name: '5W1H',
  description: '隨時隨地，點燃你的創意火花！',
  start_url: '/Aura/',
  display: 'standalone',
  background_color: '#F5F5F5',
  theme_color: '#4285F4',
  icons: [
    { src: '/Aura/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/Aura/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/Aura/icon.svg', sizes: 'any', type: 'image/svg+xml' },
  ],
};
writeFileSync(resolve(PUBLIC_DIR, 'site.webmanifest'), JSON.stringify(manifest, null, 2));
console.log('✅ site.webmanifest');

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
