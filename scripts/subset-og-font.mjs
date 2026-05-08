// Subsets NotoSansTC-Bold.ttf down to only the chars used in OG image,
// turning a 12 MB file into a ~100 KB asset that's safe to commit.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT_IN = resolve(__dirname, 'fonts', 'NotoSansTC-Bold.ttf');
const FONT_OUT = resolve(__dirname, 'fonts', 'NotoSansTC-Subset.ttf');

if (!existsSync(FONT_IN)) {
  console.error(`❌ Source font missing at ${FONT_IN}`);
  console.error('Run: curl -sL -o scripts/fonts/NotoSansTC-Bold.ttf "https://raw.githubusercontent.com/google/fonts/main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf"');
  process.exit(1);
}

// All chars actually used in the OG image and favicon. Keep a wide net
// for occasional copy tweaks; re-run this script if you add new strings.
const USED_TEXT = `
靈感發射器
W H 5
誰什麼事時候地方為如何發生
點燃你的創意火花！
輕鬆產生故事、劇本、文案的絕妙點子
桃園市石門國小資訊組阿凱老師設計
隨機產生潤飾語法檢查一致性合成內容
鎖定解鎖全部下一個
、！，。：·
`;

const chars = Array.from(new Set([
  ...USED_TEXT,
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;!?-_/·+-()[]{}|@#$%&*"\'',
])).join('');

const buffer = readFileSync(FONT_IN);
const subset = await subsetFont(buffer, chars, { targetFormat: 'truetype' });
writeFileSync(FONT_OUT, subset);

console.log(`✅ Subset done: ${(buffer.length/1024/1024).toFixed(2)} MB → ${(subset.length/1024).toFixed(1)} KB`);
console.log(`   Output: ${FONT_OUT}`);
console.log(`   Chars: ${chars.length}`);
