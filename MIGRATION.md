# 遷移到 GitHub Pages + Firebase Cloud Functions（Serverless）

> **目標架構**：靜態前端推到 GitHub Pages（免費、永久）＋ Genkit AI 邏輯搬到 Firebase Cloud Functions（依用量付費，個人小流量幾乎免費），完全擺脫 Firebase App Hosting / Vercel 等付費部署。

---

## 一、可行性結論：✅ 可以遷移，但需要動 4 個地方

目前的卡點是 **Next.js Server Actions 不能靜態匯出**（`'use server'` 必須有 Node runtime）。所以核心改動是：

| 階段 | 動作 |
| --- | --- |
| ① 改架構 | 把 4 個 Genkit flow 從 Server Action → 包成 4 支 Firebase Callable Functions |
| ② 改前端呼叫方式 | 把 client 直接 `import { randomElementGenerate }` 改成 `httpsCallable(functions, 'randomElementGenerate')` 或 `fetch(API_URL)` |
| ③ Next.js 靜態化 | `next.config.ts` 加 `output: 'export'`、`images.unoptimized: true`，產出 `out/` 給 GitHub Pages |
| ④ CI 部署 | 兩條 GitHub Actions：(a) build & push `out/` → `gh-pages` 分支；(b) `firebase deploy --only functions` |

預估總時間：**2~3 小時**（含本機測通 + 第一次部署）。

---

## 二、為什麼選這個架構

| 比較項 | 目前 (Firebase App Hosting) | 遷移後 (GitHub Pages + Functions) |
| --- | --- | --- |
| 前端費用 | App Hosting 免費額度有限，超過會收錢 | **GitHub Pages 永久免費** |
| 後端費用 | App Hosting 流量+運算都計費 | Functions 免費 2M 次/月 (Spark plan) |
| 冷啟動 | App Hosting Edge runtime 較快 | Cloud Functions 第一次冷啟 1~3 秒 |
| 部署複雜度 | `firebase deploy` 一鍵 | 多兩條 GitHub Actions（但純 push 觸發） |
| 適用情境 | 高流量正式產品 | **個人/教學/校園專案**（最佳） |

對阿凱老師的教學專案來說，第二種完勝。

---

## 三、遷移計畫（逐步）

### Step 0｜先 fork / push 到 GitHub
```powershell
# 在 H:\Aura\ 主 repo 操作
git push -u origin main
# 或建一個新 repo
gh repo create cagoooo/aura-5w1h --public --source=. --remote=origin --push
```

> **注意**：阿凱老師的 GitHub 帳號是 `cagoooo`，gh CLI 已認證好，預設就會用對。

---

### Step 1｜把 4 個 flow 搬到 `functions/` 並包成 Callable

#### 1-1 安裝 functions 工具
```powershell
firebase init functions --account=ipad@mail2.smes.tyc.edu.tw
# 選 TypeScript / 不要 ESLint blocking / 安裝依賴
```
這會建立 `functions/` 資料夾，含 `functions/src/index.ts` 與獨立的 `functions/package.json`。

#### 1-2 在 `functions/` 安裝 Genkit
```powershell
cd functions
npm install genkit @genkit-ai/googleai zod
npm install --save-dev typescript
```

#### 1-3 把 `src/ai/` 整包複製到 `functions/src/ai/`
直接 copy `src/ai/genkit.ts` 與 `src/ai/flows/` 進去，**只需把每個 flow 檔最頂端的 `'use server'` 拿掉**（Functions 不需要這個指示）。

#### 1-4 在 `functions/src/index.ts` 暴露 4 支 Callable
```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { randomElementGenerate } from './ai/flows/random-element-generation';
import { grammarImprovement } from './ai/flows/grammar-improvement';
import { consistencyCheck } from './ai/flows/consistency-check';
import { storySynthesis } from './ai/flows/story-synthesis';

setGlobalOptions({
  region: 'asia-east1',          // 台灣最近
  maxInstances: 10,              // 防爆預算
  memory: '512MiB',
  timeoutSeconds: 60,
  secrets: ['GEMINI_API_KEY'],   // 用 Secret Manager 管 Key
});

const wrap = <T, R>(fn: (input: T) => Promise<R>) =>
  onCall<T, Promise<R>>(async (req) => {
    try {
      return await fn(req.data);
    } catch (e: any) {
      console.error(e);
      throw new HttpsError('internal', e?.message ?? 'AI flow failed');
    }
  });

export const randomElement = wrap(randomElementGenerate);
export const grammarImprove = wrap(grammarImprovement);
export const checkConsistency = wrap(consistencyCheck);
export const synthesizeStory = wrap(storySynthesis);
```

#### 1-5 在 `functions/src/ai/genkit.ts` 改成讀環境變數
```typescript
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
  model: 'googleai/gemini-2.0-flash',
});
```

#### 1-6 把 `GEMINI_API_KEY` 寫進 Firebase Secrets（**不要寫在 chat / repo**）
參考 skill `gcp-api-key-secure-create`，用 stdin 灌入：
```powershell
firebase functions:secrets:set GEMINI_API_KEY --account=ipad@mail2.smes.tyc.edu.tw
# 互動視窗會問你貼上 key（只貼一次）
```

#### 1-7 本機測 emulator
```powershell
cd functions
npm run build
firebase emulators:start --only functions --account=ipad@mail2.smes.tyc.edu.tw
```

---

### Step 2｜前端改成呼叫 Callable

#### 2-1 安裝 Firebase Web SDK（已在 dependencies 裡了）
`firebase: ^11.8.1` 已存在，無需再裝。

#### 2-2 新增 `src/lib/firebase.ts`
```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FB_APP_ID!,
};

const app = getApps().length ? getApps()[0] : initializeApp(config);
export const functions = getFunctions(app, 'asia-east1');

export const callRandomElement   = httpsCallable(functions, 'randomElement');
export const callGrammarImprove  = httpsCallable(functions, 'grammarImprove');
export const callCheckConsistency = httpsCallable(functions, 'checkConsistency');
export const callSynthesizeStory  = httpsCallable(functions, 'synthesizeStory');
```

#### 2-3 改 `inspiration-generator-client.tsx`
把目前的：
```tsx
import { randomElementGenerate } from '@/ai/flows/random-element-generation';
// ...
const result = await randomElementGenerate(input);
```
改成：
```tsx
import { callRandomElement } from '@/lib/firebase';
// ...
const result = (await callRandomElement(input)).data as RandomElementGenerationOutput;
```
其他三個 flow 同模式。

#### 2-4 把 `src/ai/` 從前端 import 圖移除
把 4 個 flow 檔的 `'use server'` 刪掉、或乾脆從 `src/ai/` 拿掉（type 仍可從 `functions/src/ai/...` 共用，或前端各自再宣告一份 type）。

---

### Step 3｜Next.js 靜態化

#### 3-1 改 `next.config.ts`
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',                  // ← 關鍵
  basePath: '/aura-5w1h',            // 你的 repo 名（部署到 cagoooo.github.io/aura-5w1h）
  trailingSlash: true,
  images: {
    unoptimized: true,               // 靜態匯出不能用 next/image optimizer
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
    ],
  },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
```

#### 3-2 處理目前用到的「不支援 export」的 API
逐一檢查：
- ✅ `useState / useEffect` — OK
- ✅ `Server Action import` — **要改掉**（已在 Step 2 處理）
- ✅ `next/image` — 用 `unoptimized: true` 即可
- ✅ `next/link` — OK
- ✅ Google Fonts (`Geist / Geist_Mono`) — `next/font/google` 在 export 模式下需要打包字型檔，OK 不用改

#### 3-3 把 `apphosting.yaml` 與 `.idx/` 留著還是刪？
- `apphosting.yaml`：留著沒影響（GitHub Pages 不讀），純粹當文件
- `.idx/dev.nix`：留著，讓使用者也能繼續在 Firebase Studio 開發

---

### Step 4｜兩條 GitHub Actions

#### 4-1 `.github/workflows/deploy-pages.yml`（部署前端）
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - name: Build static site
        env:
          NEXT_PUBLIC_FB_API_KEY:     ${{ secrets.FB_API_KEY }}
          NEXT_PUBLIC_FB_AUTH_DOMAIN: ${{ secrets.FB_AUTH_DOMAIN }}
          NEXT_PUBLIC_FB_PROJECT_ID:  ${{ secrets.FB_PROJECT_ID }}
          NEXT_PUBLIC_FB_APP_ID:      ${{ secrets.FB_APP_ID }}
        run: npm run build
      - name: Add .nojekyll
        run: touch out/.nojekyll
      - uses: actions/upload-pages-artifact@v3
        with: { path: ./out }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

#### 4-2 `.github/workflows/deploy-functions.yml`（部署後端）
```yaml
name: Deploy Cloud Functions

on:
  push:
    branches: [main]
    paths:
      - 'functions/**'
      - '.github/workflows/deploy-functions.yml'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: functions/package-lock.json }
      - run: npm ci
        working-directory: functions
      - run: npm run build
        working-directory: functions
      - uses: w9jds/firebase-action@master
        with:
          args: deploy --only functions --project default
        env:
          GCP_SA_KEY: ${{ secrets.GCP_SA_KEY }}
```

> 部署 Functions 用 service account 比較穩。Service account 建立詳見 skill `firebase-stack-automation`。

#### 4-3 在 GitHub repo 設 Secrets
到 `Settings → Secrets and variables → Actions` 新增：
- `FB_API_KEY` / `FB_AUTH_DOMAIN` / `FB_PROJECT_ID` / `FB_APP_ID` — 從 Firebase Console → 專案設定 → 一般 → 您的應用程式
- `GCP_SA_KEY` — service account JSON 整包貼上

#### 4-4 啟用 GitHub Pages
```powershell
gh api -X POST repos/cagoooo/aura-5w1h/pages -f "source[branch]=main" -f "source[path]=/"
# 或在 Settings → Pages → Source 改成 "GitHub Actions"
```
首次推上去後到 `https://cagoooo.github.io/aura-5w1h/` 看畫面。

---

## 四、遷移後的目錄結構

```
aura-5w1h/
├─ .github/workflows/
│  ├─ deploy-pages.yml        # 前端 → GitHub Pages
│  └─ deploy-functions.yml    # 後端 → Cloud Functions
├─ functions/                 # ← 新增整個資料夾
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ src/
│     ├─ index.ts             # 4 支 Callable Function entry
│     └─ ai/
│        ├─ genkit.ts
│        └─ flows/...         # 4 個 flow（從 src/ai 搬過來）
├─ src/                       # 前端（保留 Next.js）
│  ├─ app/
│  ├─ components/
│  ├─ hooks/
│  └─ lib/
│     ├─ firebase.ts          # ← 新增
│     ├─ constants.ts
│     └─ utils.ts
├─ next.config.ts             # 加 output: 'export'
├─ firebase.json              # firebase init 後產生
├─ .firebaserc                # 設好 default project
└─ ...
```

---

## 五、本機完整跑流程（驗收）
```powershell
# 1. 後端：跑 emulator
cd functions; npm run build
firebase emulators:start --only functions --account=ipad@mail2.smes.tyc.edu.tw

# 2. 前端：在 firebase.ts 加上 if (process.env.NODE_ENV === 'development') connectFunctionsEmulator(functions, 'localhost', 5001)
cd ..
npm run dev
# 打開 http://localhost:9002 點按鈕 → 看 emulator log 應該有 4 支 function 被打到
```

驗收清單：
- [ ] 全部隨機按下去，6 個欄位陸續出現新內容
- [ ] 潤飾語法、檢查一致性、合成內容皆正常運作
- [ ] 撒花動畫沒壞
- [ ] DevTools Network 看到的是 `https://asia-east1-<project>.cloudfunctions.net/...` 而非 `_next/...`
- [ ] `npm run build` 產出 `out/` 資料夾，內含 `index.html`

---

## 六、注意事項與雷區

1. **`'use server'` 不能殘留**：Next.js export 模式下若還有 server actions 會 build 失敗。把 `src/ai/flows/*.ts` 全部移走或刪 `'use server'` 行。
2. **`basePath` 要對**：GitHub Pages 部署在 `cagoooo.github.io/<repo-name>/`，`basePath` 要設一致，否則 CSS / JS 會 404。如果用 custom domain 才不用設。
3. **CORS**：Callable Functions 預設處理好 CORS，HTTPS Function 才要自己設。
4. **冷啟動**：第一次按按鈕可能要等 1~3 秒，可以用 `minInstances: 1` 但會收錢（個人專案不建議）。
5. **API Key 防濫用**：Functions 仍可被任何人呼叫，必須加 Cloudflare Turnstile / Firebase App Check（見 `OPTIMIZATION.md` 第 3 點）。
6. **Genkit Dev UI 還能用嗎？**：可以，留著 `npm run genkit:dev` 在 functions/ 裡跑，純偵錯 prompt 用。
7. **音效檔位置**：建立 `public/sounds/confetti-short.mp3` `public/sounds/confetti-grand.mp3`，跟著靜態匯出走。
8. **Firebase 兩個帳號**：教學用專案請 `--account=ipad@mail2.smes.tyc.edu.tw`，cagooo@gmail.com 是 GitHub 用。

---

## 七、關聯 Claude Code Skills

如果你之後請 Claude 自動跑這個遷移，這些 skill 會自動觸發：

- `firebase-studio-static-migration` — 把 Firebase Studio 專案遷成 GitHub Pages + Cloud Functions（**最相關**）
- `firebase-stack-automation` — 用 firebase + gcloud + gh CLI 三角自動化（service account、Secret 設定）
- `gcp-api-key-secure-create` — Gemini API Key 用 stdin 安全注入 Firebase Secrets，不外洩
- `github-pages-auto-deploy` — push 完自動啟用 GitHub Pages
- `firebase-multi-app-safety` — 如果這個專案要塞進「已有應用」的 Firebase 專案，避免覆蓋既有 Functions
- `cloudflare-turnstile-integration` — 之後加防爆機制
