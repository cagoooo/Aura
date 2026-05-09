// Generates public/og-preview.png — 1200x630 social card.
// Uses @napi-rs/canvas with bundled font (no system font dependency,
// works identically on Windows / Linux CI).
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, '..', 'public');
const OUTPUT = resolve(PUBLIC_DIR, 'og-preview.png');
const FONT_PATH = resolve(__dirname, 'fonts', 'NotoSansTC-Subset.ttf');

if (!existsSync(FONT_PATH)) {
  console.error('❌ Subset font missing. Run: npm run subset-og-font');
  process.exit(1);
}
if (!existsSync(PUBLIC_DIR)) mkdirSync(PUBLIC_DIR, { recursive: true });

GlobalFonts.registerFromPath(FONT_PATH, 'NotoSansTC');

const W = 1200, H = 630;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// ── Background: brand-blue → softer-blue gradient ──────────────────────────
const bgGrad = ctx.createLinearGradient(0, 0, W, H);
bgGrad.addColorStop(0, '#4285F4');     // primary blue
bgGrad.addColorStop(0.6, '#5B9BFF');
bgGrad.addColorStop(1, '#7FB3FF');
ctx.fillStyle = bgGrad;
ctx.fillRect(0, 0, W, H);

// Subtle decorative dots on the right side
ctx.fillStyle = 'rgba(255,255,255,0.08)';
for (let i = 0; i < 35; i++) {
  const x = 700 + Math.random() * 480;
  const y = 50 + Math.random() * 530;
  const r = 2 + Math.random() * 4;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// ── Lightbulb illustration (left side, hand-drawn from lucide path) ────────
const cx = 240, cy = H / 2 - 30;
const bulbR = 110;

// Glow halo
const glow = ctx.createRadialGradient(cx, cy, 30, cx, cy, 200);
glow.addColorStop(0, 'rgba(255,167,38,0.55)');   // accent orange
glow.addColorStop(1, 'rgba(255,167,38,0)');
ctx.fillStyle = glow;
ctx.beginPath();
ctx.arc(cx, cy, 200, 0, Math.PI * 2);
ctx.fill();

// Bulb body (white circle)
ctx.fillStyle = '#FFFFFF';
ctx.beginPath();
ctx.arc(cx, cy, bulbR, 0, Math.PI * 2);
ctx.fill();

// Filament/ray inside bulb (orange accent)
ctx.fillStyle = '#FFA726';
ctx.beginPath();
ctx.arc(cx, cy, bulbR * 0.45, 0, Math.PI * 2);
ctx.fill();

// Bulb base (screw cap)
ctx.fillStyle = '#FFFFFF';
roundRect(ctx, cx - 40, cy + bulbR - 5, 80, 32, 6);
ctx.fill();
ctx.fillStyle = 'rgba(0,0,0,0.15)';
ctx.fillRect(cx - 40, cy + bulbR + 8, 80, 3);
ctx.fillRect(cx - 40, cy + bulbR + 16, 80, 3);

// Light rays
ctx.strokeStyle = '#FFD688';
ctx.lineWidth = 6;
ctx.lineCap = 'round';
const rays = 8;
const rayInner = bulbR + 30;
const rayOuter = bulbR + 70;
for (let i = 0; i < rays; i++) {
  const a = (i / rays) * Math.PI * 2 - Math.PI / 2;
  // skip rays that overlap the screw cap (bottom 90deg cone)
  if (a > Math.PI * 0.3 && a < Math.PI * 0.7) continue;
  const x1 = cx + Math.cos(a) * rayInner;
  const y1 = cy + Math.sin(a) * rayInner;
  const x2 = cx + Math.cos(a) * rayOuter;
  const y2 = cy + Math.sin(a) * rayOuter;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// ── Right column: title + subtitle + author ────────────────────────────────
const textX = 470;

// Big "5W1H" badge
ctx.fillStyle = '#FFA726';
roundRect(ctx, textX, 130, 200, 70, 14);
ctx.fill();
ctx.fillStyle = '#1A1A1A';
ctx.font = '900 50px "NotoSansTC"';
ctx.textBaseline = 'middle';
ctx.fillText('5W1H', textX + 30, 165);

// Main title
ctx.fillStyle = '#FFFFFF';
ctx.font = '900 88px "NotoSansTC"';
ctx.textBaseline = 'alphabetic';
ctx.fillText('靈感發射器', textX, 290);

// Pro badge — gold gradient pill positioned next to the main title
const titleWidth = ctx.measureText('靈感發射器').width;
const proBadgeX = textX + titleWidth + 20;
const proBadgeY = 235;
const proBadgeW = 110;
const proBadgeH = 56;
const proGrad = ctx.createLinearGradient(proBadgeX, proBadgeY, proBadgeX + proBadgeW, proBadgeY + proBadgeH);
proGrad.addColorStop(0, '#FBBF24');   // amber-400
proGrad.addColorStop(0.5, '#F59E0B'); // amber-500
proGrad.addColorStop(1, '#D97706');   // amber-600
ctx.fillStyle = proGrad;
roundRect(ctx, proBadgeX, proBadgeY, proBadgeW, proBadgeH, 10);
ctx.fill();
// Subtle highlight on top half for shine
ctx.fillStyle = 'rgba(255,255,255,0.18)';
roundRect(ctx, proBadgeX, proBadgeY, proBadgeW, proBadgeH / 2, 10);
ctx.fill();
// PRO text
ctx.fillStyle = '#FFFFFF';
ctx.font = '900 32px "NotoSansTC"';
ctx.textBaseline = 'middle';
ctx.fillText('PRO', proBadgeX + 22, proBadgeY + proBadgeH / 2 + 1);
ctx.textBaseline = 'alphabetic';

// Subtitle line 1
ctx.fillStyle = 'rgba(255,255,255,0.95)';
ctx.font = '700 32px "NotoSansTC"';
ctx.fillText('點燃你的創意火花！', textX, 360);

// Subtitle line 2
ctx.fillStyle = 'rgba(255,255,255,0.85)';
ctx.font = '500 26px "NotoSansTC"';
ctx.fillText('輕鬆產生故事、劇本、文案的絕妙點子', textX, 405);

// URL pill at the bottom
ctx.fillStyle = 'rgba(0,0,0,0.35)';
roundRect(ctx, textX, 470, 360, 50, 25);
ctx.fill();
ctx.fillStyle = '#FFFFFF';
ctx.font = '700 22px "NotoSansTC"';
ctx.textBaseline = 'middle';
ctx.fillText('cagoooo.github.io/Aura', textX + 24, 495);

// Author footer
ctx.fillStyle = 'rgba(255,255,255,0.7)';
ctx.font = '500 20px "NotoSansTC"';
ctx.textBaseline = 'alphabetic';
ctx.fillText('桃園市石門國小資訊組 · 阿凱老師 設計', textX, 565);

// ── Output ─────────────────────────────────────────────────────────────────
writeFileSync(OUTPUT, canvas.toBuffer('image/png'));
console.log(`✅ OG preview written: ${OUTPUT}`);
console.log(`   Size: 1200x630, ~${Math.round((canvas.toBuffer('image/png').length)/1024)} KB`);

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
