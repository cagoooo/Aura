# 後續優化改良建議

> 給「5W1H 靈感發射器」未來迭代的方向。每一條都附：**為什麼要做、難度、預估工時、關聯 skill / 工具**，可依優先順序逐項挑選。

---

## 🔥 優先級 P0（強烈建議盡快做）

### 1. 加上 Cloudflare Turnstile 防 Bot 打爆 Gemini quota
**為什麼**：免費 Gemini 每分鐘 15 次、每天 1500 次。一旦上線網址流出，被腳本連點一波就掛。
**難度**：⭐⭐ ｜**工時**：30 分鐘
**做法**：
- 申請 Cloudflare Turnstile（免費、無需 Google 帳號）
- 前端在「全部隨機 / 合成內容」這類重操作前加無感驗證 widget
- Cloud Functions 在處理 callable 前 verify token
**關聯 skill**：`cloudflare-turnstile-integration`

### 2. 固定 Cloud Functions 預算上限（避免帳單意外）
**為什麼**：Functions 免費額度雖大，但若被 DDoS 仍會超額。
**難度**：⭐ ｜**工時**：5 分鐘
**做法**：
```bash
# 在 GCP Console → Billing → Budgets & alerts 設一個 NT$30/月 上限通知
# 並在 setGlobalOptions 設定：
maxInstances: 5,        # 同時併發上限
timeoutSeconds: 30,     # 縮短，避免吊死
```

### 3. 補上音效檔（目前 repo 沒有 `public/sounds/`）
**為什麼**：程式碼已有 `new Audio('/sounds/confetti-short.mp3').play()`，但檔案根本不存在 → 永遠走 catch warn。
**難度**：⭐ ｜**工時**：10 分鐘
**做法**：到 [Mixkit](https://mixkit.co/free-sound-effects/win/) 或 [Pixabay](https://pixabay.com/sound-effects/search/confetti/) 下載 CC0 音效，命名為 `confetti-short.mp3` / `confetti-grand.mp3`，放進 `public/sounds/`。

### 4. 把 `next.config.ts` 的 `ignoreBuildErrors: true` 拿掉
**為什麼**：等於關掉 TypeScript 的安全網，未來 bug 都會偷溜進 production。
**難度**：⭐⭐ ｜**工時**：30~60 分鐘（要修現有 type 錯誤）
**做法**：先跑 `npm run typecheck` 看到底有幾個錯，逐一修掉，再把 `ignoreBuildErrors` 與 `eslint.ignoreDuringBuilds` 改 `false`。

---

## ⭐ 優先級 P1（中期內值得做）

### 5. 加入 Footer 作者連結 + 「回主頁」入口（後台頁未來才會用到）
**為什麼**：阿凱老師的所有自製站都應該掛上「Made with ❤️ by 阿凱老師」並連到學校教師頁。
**目前狀態**：`app-footer.tsx` 已有 `桃園市石門國小資訊組 阿凱老師 設計` + 學校官網連結，**已合格** ✅
**可加強**：把連結改成阿凱老師個人教師頁（如果有）。
**關聯 skill**：`akai-author-footer`

### 6. PWA 快取避雷（部署後讀不到新版）
**為什麼**：未來 Service Worker 上線後，使用者會卡在舊版。
**難度**：⭐⭐ ｜**工時**：20 分鐘
**做法**：build-time 灌一個 `BUILD_HASH` 環境變數進前端，每次部署自動 cache-bust。
**關聯 skill**：`pwa-cache-bust`

### 7. 用 Supabase 或 Firestore 存「使用者愛用點子」
**為什麼**：目前 `recentSessionSuggestions` 只存記憶體，重整就掉。
**難度**：⭐⭐⭐ ｜**工時**：2~4 小時
**做法**：
- 路線 A（簡單）：localStorage 快取最近 50 筆
- 路線 B（雲端同步）：Supabase + Google OAuth 登入
**關聯 skill**：`supabase-google-oauth-integration`、`supabase-secrets-for-browser-apis`

### 8. 加入「分享卡片」：把合成的故事直接做成 OG image
**為什麼**：使用者合成完故事，希望直接分享到 LINE / FB，但沒有預覽圖會很醜。
**難度**：⭐⭐⭐ ｜**工時**：1 小時
**做法**：
- 用 `@vercel/og` 或 `satori` 在 Cloud Function 動態產生 1200x630 PNG
- 中文字體要嵌入 noto-sans-tc，不然會出現方框 (tofu)
**關聯 skill**：`og-social-preview-zh`

### 9. PDF 匯出功能（合成完的故事一鍵下載）
**為什麼**：教學現場老師很常要匯出。
**難度**：⭐⭐ ｜**工時**：30 分鐘
**做法**：用 `window.print()` + `@media print` CSS（**絕對不要**用 html2pdf / jsPDF，會出一堆中文字切半問題）
**關聯 skill**：`pdf-export-print-best-practice`

### 10. 「📖 使用說明」彈窗（onboarding）
**為什麼**：第一次進來的老師不知道從哪開始。
**難度**：⭐⭐ ｜**工時**：30 分鐘
**做法**：用 shadcn `Dialog` 包一個 4 步驟教學，第一次 visit 自動跳出，加 localStorage flag 不再跳。
**關聯 skill**：`teaching-app-quickstart`

---

## 🌱 優先級 P2（長期改良）

### 11. 升級 Gemini 模型到 2.5 Flash / 2.5 Pro
**為什麼**：2.0 Flash 已是上一代，2.5 系列在中文創意上明顯更好（且免費層仍可用）。
**難度**：⭐ ｜**工時**：5 分鐘
**做法**：改 `src/ai/genkit.ts`（或遷移後的 `functions/src/ai/genkit.ts`）：
```ts
model: 'googleai/gemini-2.5-flash',  // 或 'gemini-2.5-pro'
```
**關聯 skill**：`gemini-api-integration`、`gemini-free-tier-first`

### 12. 把 4 個 flow 改成「平行執行」而不是循序
**為什麼**：目前「全部隨機」會跑 6 次循序 await，等很久（約 6~12 秒）。改 `Promise.all` 大概 2~3 秒搞定。
**難度**：⭐⭐ ｜**工時**：30 分鐘
**做法**：
```ts
const results = await Promise.all(
  elementsToProcessKeys.map(key => callRandomElement({...})),
);
```
**注意**：要重新處理 `recentSessionSuggestions` 防重複邏輯（並行時各自的 `existingOptions` 還是舊的 — 可接受，因為 Gemini temperature=1.0 已夠隨機）。

### 13. 加入「主題模式」切換
**為什麼**：目前只有單一配色，學生喜歡可換主題。
**難度**：⭐⭐ ｜**工時**：1~2 小時
**做法**：
- 用 `next-themes` 換深淺色（`globals.css` 的 `.dark` 已備好）
- 再做 3~5 套兒童 / 文青 / 科技風主題切換

### 14. 多模態：上傳一張圖片，AI 自動推測 5W1H
**為什麼**：教學現場給張圖讓學生編故事是經典練習。
**難度**：⭐⭐⭐⭐ ｜**工時**：3~4 小時
**做法**：
- 前端 `<input type="file">` + 壓圖
- 上傳到 Firebase Storage（或直接 base64 走 Functions）
- Functions 用 `gemini-2.5-flash` 看圖 → 產生 6 個欄位
- 前端 prefill

### 15. 把產出的故事丟進 NotebookLM 或 Gamma 做衍生
**為什麼**：可以一鍵變成簡報 / 朗讀音檔 / 資訊圖表。
**難度**：⭐⭐⭐ ｜**工時**：2~3 小時
**做法**：用 NotebookLM MCP 或 Gamma API
**關聯 skill**：`teaching-cockpit`

### 16. 結果存進 Firestore + 公開分享頁
**為什麼**：目前合成完關掉就沒了，無法產生「永久連結」。
**難度**：⭐⭐⭐ ｜**工時**：2~3 小時
**做法**：
- 合成成功時把 `{ title, story, w1h }` 存 Firestore，產生 `/s/<id>` 路由
- 因為前端是 GitHub Pages 靜態，要做 Hash routing（`/#/s/<id>`）或 Firebase Hosting 接管特定路徑

### 17. 加入「教學模式」：老師後台
**為什麼**：老師可看誰寫了什麼、誰按了幾次。
**難度**：⭐⭐⭐⭐ ｜**工時**：1~2 天
**做法**：
- 前端加 `/admin` 路由（鎖 Google OAuth + email allowlist）
- Firestore 存匿名統計
- 一定要加「回主頁」按鈕（重要！）
**關聯 skill**：`admin-route-back-to-home`、`firebase-admin-password-recovery`

### 18. CI 自動化：PR 自動跑 typecheck + build smoke test
**為什麼**：避免 broken commit 進 main。
**難度**：⭐⭐ ｜**工時**：30 分鐘
**做法**：在 `.github/workflows/` 加一條 `ci.yml`，PR 觸發 `npm run typecheck && npm run build`。
**關聯 skill**：`firebase-ci-troubleshooter`

---

## 💎 體驗微調（可零碎挑著做）

### 19. 卡片動效升級
- 隨機產生時加打字機動效（逐字浮現）
- 鎖定動作加粒子閃光
- 滑鼠 hover 時卡片浮起 + tilt 3D

### 20. 微互動補強
- 「全部隨機」按鈕長按 → 變成「全部解鎖再隨機」
- 觸控長按卡片 → 浮現右鍵選單（複製 / 鎖定 / 變色）
- 鍵盤快捷鍵：`Space` 全部隨機 / `G` 潤飾 / `C` 一致性 / `S` 合成

### 21. 結果導出格式
- 一鍵複製 markdown
- 一鍵複製成 LINE 訊息純文字
- 一鍵分享到 X / Threads（Web Share API）

### 22. Accessibility (A11y) 強化
- 所有按鈕都已有 aria-label ✅，但卡片整體還可加 `role="region"` + `aria-labelledby`
- 撒花動畫尊重 `prefers-reduced-motion`
- 鎖定狀態用 `aria-pressed` 而非只靠 icon

### 23. 國際化（i18n）
- 加英 / 日切換，把 `constants.ts` 拆 locale 檔
- prompt 也要切換語言版本（不然會回中文）

---

## 📊 一頁式優先順序總表

| # | 項目 | 優先級 | 工時 | 收益 |
| --- | --- | --- | --- | --- |
| 2 | 設 Cloud Functions 預算上限 | 🔥 P0 | 5 min | 防破產 |
| 3 | 補音效檔 | 🔥 P0 | 10 min | 修 bug |
| 1 | Cloudflare Turnstile | 🔥 P0 | 30 min | 防 Bot |
| 11 | 升級 Gemini 2.5 | ⭐ P2 | 5 min | 內容更好 |
| 4 | 拿掉 ignoreBuildErrors | 🔥 P0 | 30~60 min | 程式碼穩定 |
| 12 | 並行隨機產生 | ⭐ P2 | 30 min | 速度 ×3 |
| 9 | PDF 匯出 | ⭐ P1 | 30 min | 教學體驗 |
| 10 | 使用說明彈窗 | ⭐ P1 | 30 min | 新手友善 |
| 6 | PWA cache-bust | ⭐ P1 | 20 min | 更新生效 |
| 14 | 多模態看圖 | ⭐ P2 | 3~4 hr | 殺手級功能 |
| 17 | 老師後台 | ⭐ P2 | 1~2 day | 校園推廣 |

---

## 🚦 我建議的下一步走法

1. **第一波（半小時搞定）**：項 #2 預算上限 → #3 音效檔 → #11 升 2.5 模型
2. **第二波（一個下午）**：把專案先按 `MIGRATION.md` 遷上 GitHub Pages + Functions，正式上線
3. **第三波（上線一週後）**：#1 Turnstile（看到 quota 開始燒就馬上做）+ #12 並行優化（讓全部隨機從 8 秒變 3 秒）
4. **第四波（教學現場開始用）**：#9 PDF 匯出 + #10 使用說明彈窗
5. **第五波（玩出殺手鐧）**：#14 看圖編故事 → 一鍵丟 NotebookLM 變簡報 (#15)

每一波都很 modular，可以隨意跳號。
