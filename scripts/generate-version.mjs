// Writes public/version.json at build time. The frontend polls this file
// every few minutes to detect that a new deploy has shipped (e.g., new
// JS bundle hashes are now live on GitHub Pages) and prompts the user
// to refresh.
//
// Without this, users sitting on an old tab keep using stale code until
// they manually hard-reload — which is invisible on GitHub Pages because
// there is no Service Worker version negotiation.
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, '..', 'public');
const OUTPUT = resolve(PUBLIC_DIR, 'version.json');

if (!existsSync(PUBLIC_DIR)) mkdirSync(PUBLIC_DIR, { recursive: true });

// CI passes NEXT_PUBLIC_BUILD_ID = github.sha; locally we generate a
// timestamp so dev builds don't all collide.
const buildId = process.env.NEXT_PUBLIC_BUILD_ID || `dev-${Date.now()}`;
const buildTime = new Date().toISOString();

const payload = {
  buildId,
  buildTime,
  // Free-form note for human inspection in DevTools
  note: 'Polled every few minutes by the running app. If buildId changes, prompt user to refresh.',
};

writeFileSync(OUTPUT, JSON.stringify(payload, null, 2) + '\n');
console.log(`✅ version.json written: buildId=${buildId.slice(0, 12)}... buildTime=${buildTime}`);
