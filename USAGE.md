# 5W1H 靈感發射器 🚀 — 詳細使用說明

> 一個運用 AI 隨機產生並潤飾故事 5W1H 元素（Who / What / When / Where / Why / How），最後合成一段故事的繁體中文創意工具。

---

## 一、專案總覽

| 項目 | 內容 |
| --- | --- |
| **App 名稱** | 5W1H 靈感發射器 🚀 |
| **作者** | 桃園市石門國小資訊組 阿凱老師 |
| **語系** | 繁體中文（台灣用語） |
| **建置平台** | Firebase Studio（Project IDX） |
| **前端框架** | Next.js 15.2.3 (App Router, React 18, Turbopack) |
| **UI** | Tailwind CSS 3 + Radix UI + shadcn 風格元件 |
| **AI 引擎** | Genkit 1.8 + `@genkit-ai/googleai` → `gemini-2.0-flash` |
| **AI 呼叫機制** | Next.js Server Actions（`'use server'`），由 Client 直接 import |
| **既定部署** | Firebase App Hosting（`apphosting.yaml`） |
| **特效** | `canvas-confetti` 撒花 + `/sounds/confetti-*.mp3` 音效 |

---

## 二、核心功能

### 1. 6 張 5W1H 元素卡片
畫面上會列出 6 張卡片，分別對應：

| Key | 標籤 | placeholder |
| --- | --- | --- |
| `who` | 誰 (Who) | 故事的主角是誰？ |
| `what` | 什麼事 (What) | 發生了什麼關鍵事件？ |
| `when` | 什麼時候 (When) | 故事發生在什麼時間點？ |
| `where` | 什麼地方 (Where) | 故事發生的地點是？ |
| `why` | 為什麼 (Why) | 事件發生的原因或動機？ |
| `how` | 如何發生 (How) | 事件是如何進行或解決的？ |

每張卡片都具備：
- **可編輯文字框**（Textarea）— 可手動鍵入或修改內容
- **🎲 隨機產生** — 呼叫 `randomElementGenerationFlow`，由 Gemini 產生與「歷史紀錄」差異化的新點子
- **🔒 鎖定／解鎖** — 鎖定後在「全部隨機」與「潤飾語法」時不被覆寫
- **撒花動畫 + 音效** — 隨機產生成功時觸發

### 2. 上方四顆主操作按鈕

| 按鈕 | 對應 Genkit Flow | 行為 |
| --- | --- | --- |
| **全部隨機** | `randomElementGenerationFlow` ×6 | 依序為所有「未鎖定」項目重新產生內容，並顯示進度條 |
| **潤飾語法** | `grammarImprovementFlow` ×6 | 為每個項目跑一次語法/在地化潤飾，最後彈出對話框列出「原文 vs. 潤飾後」差異 |
| **檢查一致性** | `consistencyCheckFlow` | 整體檢查 6 項是否邏輯前後呼應，若否則回傳結構化建議（問題點 / 建議調整 / 多種替代方案） |
| **合成內容** | `storySynthesisFlow` | 將 6 項合成為一段完整的故事段落 + 標題，成功時觸發大型撒花 |

### 3. 防重複機制（Novelty Self-Correction）
`randomElementGenerationFlow` 會把以下兩者塞進 prompt 的 `existingOptions`，要 AI 產生**完全不同**的新點子：
1. `src/lib/constants.ts` 內的預設範例
2. 該欄位本次 session 最近 5 次的 AI 產出（`recentSessionSuggestions` 狀態）

並在 prompt 中明確要求：
- 避免常見科幻／奇幻濫用題材（外星人、時間旅行、AI、預言、神祇…）
- 主動跨主題探索（日常、心理、荒謬、歷史、哲學、超現實、職人題材…）
- `temperature: 1.0`，逼出更不可預測的輸出
- 嚴格安全設定（4 類 `BLOCK_LOW_AND_ABOVE`），確保內容適合公開平台

### 4. 兩顆懸浮按鈕（右下）
- **🐝 點『石』成金（評語優化）** → 連到阿凱老師的 LINE 官方帳號
- **🦄 創建專屬助手** → 連到 `document-ai-companion-ipad4.replit.app`

兩顆都是 Tailwind 漸層、RWD、hover 放大、focus ring、aria-label 完整。

### 5. 初始載入體驗
頁面首次掛載時會自動為 6 個項目各跑一次 `randomElementGenerate`，讓使用者一進來就看到滿滿靈感、不會看到空白卡片。

---

## 三、檔案結構導讀

```
relaxed-curie-e3a4c6/
├─ apphosting.yaml            # Firebase App Hosting 設定（maxInstances: 1）
├─ next.config.ts             # ignoreBuildErrors / 允許 placehold.co 圖片
├─ tailwind.config.ts
├─ components.json            # shadcn/ui 設定
├─ package.json               # scripts: dev / genkit:dev / build / start / lint / typecheck
├─ .idx/dev.nix               # Firebase Studio 工作區（Node 20 + zulu JDK）
├─ docs/blueprint.md          # 設計藍圖（核心功能、配色）
└─ src/
   ├─ ai/
   │  ├─ genkit.ts            # ai = genkit({ plugins: [googleAI()], model: 'googleai/gemini-2.0-flash' })
   │  ├─ dev.ts               # genkit start 用，import 所有 flow
   │  └─ flows/
   │     ├─ random-element-generation.ts   # 隨機產生單一元素（含防重複 + 安全設定）
   │     ├─ grammar-improvement.ts         # 語法潤飾（在地化台灣用語）
   │     ├─ consistency-check.ts           # 結構化一致性建議
   │     └─ story-synthesis.ts             # 合成故事（含安全設定 + 失敗 fallback）
   ├─ app/
   │  ├─ layout.tsx           # AppHeader + main + AppFooter + 兩顆 FloatingButton + Toaster
   │  ├─ page.tsx             # 只渲染 InspirationGeneratorClient
   │  └─ globals.css          # 主色 #4285F4 / 強調 #FFA726 / 背景 #F5F5F5（HSL 變數）
   ├─ components/
   │  ├─ inspiration-generator-client.tsx  # 主互動元件（核心商業邏輯都在這）
   │  ├─ w1h-element-card.tsx              # 單張卡片
   │  ├─ floating-ad-button.tsx            # LINE CTA
   │  ├─ floating-assistant-button.tsx     # 專屬助手 CTA
   │  ├─ app-header.tsx / app-footer.tsx
   │  └─ ui/...                            # shadcn 系列元件
   ├─ hooks/
   │  ├─ use-mobile.tsx
   │  └─ use-toast.ts
   └─ lib/
      ├─ constants.ts          # W1H_ELEMENTS 預設範例 + ALL_W1H_KEYS
      └─ utils.ts              # cn() helper
```

---

## 四、本機開發

### 1. 安裝依賴
```bash
npm install
```

### 2. 設定環境變數
在專案根目錄建立 `.env`（本地用，**勿** commit；`.gitignore` 已排除）：
```
GOOGLE_GENAI_API_KEY=AIzaSy...你的_Gemini_API_Key
```
取得方式：[Google AI Studio → Get API key](https://aistudio.google.com/apikey)（個人 Gmail 即可，每分鐘 15 次免費額度）。

### 3. 啟動 Next.js 開發伺服器
```bash
npm run dev
```
打開 [http://localhost:9002](http://localhost:9002)（如未指定 `--port`，預設 3000）。

### 4. 啟動 Genkit Dev UI（可選）
```bash
npm run genkit:dev   # 一次性
npm run genkit:watch # 監看 src/ai/dev.ts 改動
```
Genkit Dev UI 通常在 `http://localhost:4000`，可以單獨打 flow 偵錯 prompt。

---

## 五、可用 npm scripts
| Script | 行為 |
| --- | --- |
| `npm run dev` | Next.js 開發模式（Turbopack） |
| `npm run genkit:dev` | 啟動 Genkit Dev UI |
| `npm run genkit:watch` | Genkit Dev UI + 監看模式 |
| `npm run build` | 產出 production build |
| `npm run start` | 跑 production build |
| `npm run lint` | Next.js ESLint |
| `npm run typecheck` | `tsc --noEmit`（注意 `next.config.ts` 已 `ignoreBuildErrors: true`，建置不會擋你） |

---

## 六、Genkit Flow 介面速查

```ts
// 隨機產生單一元素
randomElementGenerate({
  elementType: 'who' | 'what' | 'when' | 'where' | 'why' | 'how',
  elementLabel: string,        // e.g. "誰 (Who)"
  existingOptions: string[],   // 預設範例 + 最近產出
}): Promise<{ generatedText: string }>

// 潤飾單一元素的語法
grammarImprovement({
  elementType, text, elementLabel,
}): Promise<{ refinedText: string }>

// 一致性檢查（吃 6 個元素文字）
consistencyCheck({
  who, what, when, where, why, how,
}): Promise<{
  isConsistent: boolean,
  suggestions: string[],   // 每筆是「關於 X：\n問題點：...\n建議調整：...」
}>

// 合成故事（吃 6 個元素文字）
storySynthesis({
  who, what, when, where, why, how,
}): Promise<{ title: string, story: string }>
```

---

## 七、使用流程示意

```
頁面載入 ──▶ 自動為 6 項各跑一次 randomElementGenerate
            (Toast: 「初始靈感已填入！」)
                       │
                       ▼
        ┌─────────────────────────────────┐
        │  在每張卡片中：手動編輯 / 鎖定 /  │
        │  個別「隨機產生」                 │
        └─────────────────────────────────┘
                       │
       使用者按主操作按鈕 ─┐
                       │
       ┌───────────────┼─────────────────┬─────────────────┐
       ▼               ▼                 ▼                 ▼
  全部隨機         潤飾語法            檢查一致性         合成內容
  進度條 +         進度條 +            撒花 + Alert      大型撒花 +
  逐張更新         彈出 Diff Dialog                        故事 Card
```

---

## 八、常見問題

**Q1：為什麼有時候隨機產生會回到 `constants.ts` 的預設範例？**
A：當 Gemini 因為安全設定阻擋、空回應、或網路錯誤時，flow 會 fallback 到預設範例，避免畫面空白。看 console 的 `console.warn / error` 可以追到原因。

**Q2：合成內容回傳了「內容生成受阻」是什麼？**
A：你的 5W1H 組合可能觸發了 `safetySettings` 的 `BLOCK_LOW_AND_ABOVE`。試著把過於黑暗、暴力、抽象的詞改成中性題材即可。

**Q3：撒花音效沒響？**
A：瀏覽器自動播放政策會擋第一次。需要使用者先有任一互動（按一次按鈕）後才能播 `<audio>`。另外目前 repo 沒有 `public/sounds/` 資料夾，要自行補上 `confetti-short.mp3` 與 `confetti-grand.mp3` 兩個檔。

**Q4：可以換掉 Gemini 模型嗎？**
A：改 `src/ai/genkit.ts` 的 `model` 參數即可，例如 `'googleai/gemini-2.5-flash'`、`'googleai/gemini-2.5-pro'` 等。模型若被 deprecated，flow 會回 404，可參考 skill `gemini-api-integration`。

**Q5：免費額度會被打爆嗎？**
A：Gemini Free tier 每分鐘 15 次、每日 1500 次。本 App 「全部隨機」一次就吃 6 次、「潤飾」吃 6 次、初始載入又 6 次，公開後若有人連點會很容易打到上限。需要 Cloudflare Turnstile / App Check 才安全（見 `OPTIMIZATION.md`）。
