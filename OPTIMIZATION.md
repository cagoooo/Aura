# 後續優化改良建議

> 給「5W1H 靈感發射器」未來迭代的方向。每一條都附：**為什麼要做、難度、預估工時、收益**，可依優先順序逐項挑選。
>
> 最後更新：2026-05-08（路線 B 遷移完成 + bulk endpoint 加速）

---

## ✅ 已完成（截至 2026-05-08）

從原始 OPTIMIZATION.md → 至今實際做掉的項目：

| # | 原項目 | 完成內容 |
| --- | --- | --- |
| **架構遷移** | — | 從 Firebase Studio Server Actions → GitHub Pages + Firebase Cloud Functions（路線 B），現址 [https://cagoooo.github.io/Aura/](https://cagoooo.github.io/Aura/) |
| 1 | Cloudflare Turnstile | 前端 invisible widget + server-side verify（Functions 內），含 race condition 修正（widget readiness）+ token 序列化（FIFO 防 duplicate）|
| 2 | Cloud Functions 預算上限 | `scripts/setup-budget.ps1` 已備好，可直接跑 |
| 3 | 音效檔 | `public/sounds/confetti-{short,grand}.mp3` 用 ffmpeg 合成 + repo |
| 4 | 並行隨機產生 | bulk endpoint + Promise.all → 6-10s 降到 ~3s |
| 11 | 升級 Gemini 模型 | 2.0-flash 已被 deprecated，升到 **2.5-flash** |
| **附加 1** | favicon + OG 預覽圖 | 用 `@napi-rs/canvas` + Noto Sans TC subset（138 KB），FB/LINE 卡片中文不變方框，cache-bust 用 `?v=<git-sha>` |
| **附加 2** | footer-year-update skill | 新建 `~/.claude/skills/footer-year-update`，未來自動掃過期版權年份；同時把 `© 2025` 修成 `© 2026` |
| **附加 3** | 樂觀 UI（Optimistic UI）| 載入瞬間用 `constants.ts` 預設範例填卡片，AI 結果回來無痛 swap → 0s 感知延遲 |
| **附加 4** | 完整文件 | `USAGE.md` `MIGRATION.md` `OPTIMIZATION.md`（本檔）|

---

## 🔥 第一波（近期內值得做，總工時 ~2 小時）

### 1. 把「潤飾語法」「合成內容」「檢查一致性」也 bulk 化／優化
**為什麼**：目前 bulk 只用在「初始載入」和「全部隨機」。其他三顆主操作按鈕仍可加速：
- **潤飾語法**：6 張卡的潤飾仍是循序 6 次 server call，可比照 bulk 模式（新 endpoint `grammarImproveBulk`）
- **合成內容**：本來就只有 1 次 call，但可以加 streaming（SSE 把 token 流下來），讓使用者看到故事一字一字浮出
- **檢查一致性**：1 次 call、~2-3 秒，OK 不急

**難度**：⭐⭐ ｜**工時**：30~45 分鐘
**收益**：「潤飾語法」從 ~6s 降到 ~2-3s

### 2. 把 functions 的部署也接上 GitHub Actions（自動化）
**為什麼**：目前 `deploy-functions.yml` 是 `workflow_dispatch` 手動觸發，要改後端就得本機 `firebase deploy`。
**難度**：⭐⭐⭐ ｜**工時**：30 分鐘
**做法**：
1. 建一個 service account 並下載 JSON：
   ```bash
   gcloud iam service-accounts create gh-deployer --project=aura-2sg5o --account=ipad@mail2.smes.tyc.edu.tw
   gcloud projects add-iam-policy-binding aura-2sg5o --member="serviceAccount:gh-deployer@aura-2sg5o.iam.gserviceaccount.com" --role="roles/firebase.admin" --account=ipad@mail2.smes.tyc.edu.tw
   gcloud projects add-iam-policy-binding aura-2sg5o --member="serviceAccount:gh-deployer@aura-2sg5o.iam.gserviceaccount.com" --role="roles/cloudfunctions.admin" --account=ipad@mail2.smes.tyc.edu.tw
   gcloud iam service-accounts keys create gh-sa.json --iam-account=gh-deployer@aura-2sg5o.iam.gserviceaccount.com --account=ipad@mail2.smes.tyc.edu.tw
   ```
2. `gh secret set FIREBASE_SERVICE_ACCOUNT_AURA --repo=cagoooo/Aura < gh-sa.json`
3. 立刻 `rm -f gh-sa.json`（**不要 commit / 不要留**）
4. 修 `.github/workflows/deploy-functions.yml` 加 `on: push: paths: ['functions/**']`

**關聯 skill**：`firebase-stack-automation`、`gcp-api-key-secure-create`（同樣的 stdin pipe 概念）

### 3. 跑預算腳本（防 GCP 帳單異常）
**為什麼**：Functions 上線了，使用量會增加，沒設預算上限的話被打爆會收錢。
**難度**：⭐ ｜**工時**：5 分鐘
**做法**：
```powershell
.\scripts\setup-budget.ps1 -ProjectId aura-2sg5o -MonthlyBudgetTWD 100
```
> 阿凱老師教學用流量小，月度上限 NT$100 綽綽有餘，超過會 email 警告。

### 4. 把 `next.config.ts` 的 `ignoreBuildErrors: true` 拿掉
**為什麼**：等於關掉 TypeScript 安全網，未來 bug 會偷溜進 production。
**難度**：⭐⭐ ｜**工時**：30~60 分鐘
**做法**：先 `npm run typecheck`，逐一修錯後改 `false`。

---

## ⭐ 第二波（一個下午，提升「教學現場」可用度）

### 5. 「📖 使用說明」彈窗 onboarding
**為什麼**：第一次進來的家長、學生不知道「鎖定」「全部隨機」「合成內容」是什麼意思。
**難度**：⭐⭐ ｜**工時**：30 分鐘
**做法**：4 步驟教學 Dialog，第一次 visit 自動跳出 + localStorage flag 不再跳。
**關聯 skill**：`teaching-app-quickstart`

### 6. PDF 匯出（合成完的故事一鍵存檔）
**為什麼**：教學現場老師很常要把產出印出來貼學生作業簿。
**難度**：⭐⭐ ｜**工時**：30 分鐘
**做法**：用 `window.print()` + `@media print` CSS 隱藏非故事區域。**不要用 jsPDF/html2pdf**（中文切半）。
**關聯 skill**：`pdf-export-print-best-practice`

### 7. 鍵盤快捷鍵
**為什麼**：老師熟練後想快速操作。
**難度**：⭐ ｜**工時**：15 分鐘
**做法**：
- `Space` 全部隨機
- `G` 潤飾語法
- `C` 檢查一致性
- `S` 合成內容
- `1-6` 鎖定 / 解鎖對應卡片

### 8. 「複製到剪貼簿」做進步
**為什麼**：目前合成完只能複製整段，常用情境包括：
- 純複製 6 個 W1H（不含合成故事）
- 複製成 markdown 格式
- 複製成 LINE 訊息友善排版（emoji 開頭）

**難度**：⭐ ｜**工時**：20 分鐘
**做法**：在合成卡的 「複製」按鈕旁加 dropdown，列三種格式。

### 9. 內容打字機動效（streaming UI）
**為什麼**：合成故事 ~5-10s 才回完整，使用者乾等很無聊。
**難度**：⭐⭐⭐ ｜**工時**：1~2 小時
**做法**：
- Backend: 把 `synthesizeStory` 改成 SSE（Server-Sent Events）endpoint
- Frontend: `EventSource` 邊收邊 append 文字
- Genkit 支援 streaming（`generateStream`），改 `runStorySynthesis` 即可

---

## 🌱 第三波（殺手級功能，週末投入時）

### 10. 多模態：上傳一張圖片，AI 自動推測 5W1H
**為什麼**：教學現場「看圖編故事」是經典練習。把圖丟進來、自動填 6 個欄位，學生再修改 → 訓練觀察與想像力。
**難度**：⭐⭐⭐⭐ ｜**工時**：3~4 小時
**做法**：
- 前端 `<input type="file">` + 圖片壓縮（< 1 MB）
- Functions 加 `analyzeImage` endpoint，base64 上傳給 Gemini 2.5 Pro
- prompt 要求 AI 根據圖片直接給 6 個 W1H
- 結果 prefill 6 張卡，使用者再微調

### 11. 把產出的故事一鍵丟去 NotebookLM / Gamma 變簡報
**為什麼**：5W1H 是課堂活動，產出的故事可變成簡報帶到下一節課。
**難度**：⭐⭐⭐ ｜**工時**：2~3 小時
**做法**：
- 「合成內容」結果旁加按鈕「→ 生成簡報」
- 點擊後把故事 + 6 個 W1H 餵進 NotebookLM API（透過 NotebookLM MCP tools）
- 自動產出 5-8 張投影片
**關聯 skill**：`teaching-cockpit`

### 12. 結果存 Firestore + 公開分享頁
**為什麼**：目前合成完關掉就沒了。產出永久連結 `cagoooo.github.io/Aura/s/abc123` 可以分享給同事/家長。
**難度**：⭐⭐⭐ ｜**工時**：2~3 小時
**做法**：
1. Functions 加 `saveStory` endpoint，存 Firestore（含 TTL 60 天自動清）
2. Functions 加 `getStory(id)` endpoint
3. 前端 hash routing `/Aura/#/s/<id>` → fetch + 顯示
4. 「分享」按鈕產 URL 到剪貼簿
5. **必加** OG image 動態生成（用 satori / @vercel/og）讓分享卡有預覽
**關聯 skill**：`og-social-preview-zh`

### 13. 教師後台（`/admin`）
**為什麼**：老師想看「哪些班級用過、產出了什麼故事、按了幾次合成」，做教學成果報告。
**難度**：⭐⭐⭐⭐ ｜**工時**：1~2 天
**做法**：
- 前端 `/Aura/#/admin` route（Hash routing 因為靜態站）
- 鎖 Google OAuth + email allowlist（只有 `ipad@mail2.smes.tyc.edu.tw` + 信任老師清單）
- Firestore 儲存匿名統計（每次合成存個 doc：時間、6 個 W1H、產出長度）
- Recharts 圖表：每日使用量 / 熱門 W1H 主題 / 平均故事長度
- **必加**「回主頁」按鈕在顯眼處（admin-route-back-to-home skill 規定）
**關聯 skill**：`admin-route-back-to-home`、`firebase-admin-password-recovery`

### 14. 跨裝置記憶（Supabase + Google OAuth）
**為什麼**：在學校電腦做的草稿，回家想繼續編輯但已經消失。
**難度**：⭐⭐⭐ ｜**工時**：2~3 小時
**做法**：
- Google OAuth 登入（用 Supabase Auth 比較簡單）
- 自動存 6 張卡 + 鎖定狀態 + 最近合成故事到使用者帳號
- 換裝置打開自動載入
**關聯 skill**：`supabase-google-oauth-integration`

---

## 💎 體驗微調（隨意挑著做）

### 15. Skeleton loader（取代 spinner）
**為什麼**：目前等 AI 是 spinner 圈圈，不夠像「真的在打字」。
**做法**：載入時卡片內顯示 skeleton 線條漸進 shimmer 動畫，更像「AI 在想」。
**工時**：20 分鐘

### 16. AI 結果出現的微動畫
**為什麼**：bulk 換好後 6 張卡同時 update，畫面突兀。
**做法**：用 `framer-motion` 或 CSS `animate-in` 讓 6 張卡的 text 換入有 0-300ms 的 stagger 動畫，cascade 式更新。
**工時**：30 分鐘

### 17. Cold start 友善訊息
**為什麼**：Functions 冷啟動 1-3 秒，第一次按按鈕等很久但沒回饋。
**做法**：第一次 call 超過 1 秒就顯示「AI 正在喚醒，第一次比較慢，後續會很快...」這類 toast。
**工時**：15 分鐘

### 18. 主題切換（兒童 / 文青 / 科技）
**為什麼**：學生喜歡可換主題增加新鮮感。
**做法**：用 `next-themes`，預設 5 套配色（藍 / 粉 / 綠 / 黑 / 復古）。
**工時**：1-2 小時

### 19. A11y（無障礙）強化
**做法**：
- 所有 button 都已有 aria-label ✅
- 卡片整體 + `role="region"` + `aria-labelledby`
- 撒花動畫尊重 `prefers-reduced-motion`
- 鎖定狀態用 `aria-pressed` 而非只靠 icon

### 20. PWA + 離線快取
**為什麼**：上課時若校園網路掉，前端至少還能看到上次內容。
**做法**：加 service worker（用 `@serwist/next` 或 next-pwa），快取 shell + 上次 6 張卡的 JSON。
**注意**：要做好 cache-bust 不然每次部署使用者看到舊版（`pwa-cache-bust` skill）。
**工時**：1-2 小時

### 21. i18n（國際化）
**為什麼**：5W1H 是普世概念，可推向英語/日語使用者。
**做法**：
- 用 `next-intl`，把 `constants.ts` 的 options 拆成 `zh-tw.json` / `en.json` / `ja.json`
- prompt 也要切（不然 AI 永遠回中文）
- 加語言切換器
**工時**：3-4 小時

---

## 🛡️ 安全 / 維運 / SEO（不性感但很重要）

### 22. Firebase App Check
**為什麼**：Turnstile 擋人類偽裝的 bot，App Check 鎖死「只有我的 web 站能 call functions」。雙保險。
**難度**：⭐⭐⭐ ｜**工時**：1 小時
**做法**：
- Firebase Console → App Check → 註冊網站，啟用 reCAPTCHA Enterprise（或重複用 Turnstile）
- Functions `onRequest` 改加 `enforceAppCheck: true`
- 前端 SDK `initializeAppCheck`

### 23. LINE 警報（出錯通知到我手機）
**為什麼**：站掛了 / Quota 爆了沒人會發現，等家長回報太晚。
**難度**：⭐⭐ ｜**工時**：30 分鐘
**做法**：
- Functions 內 catch 重大 error → 推到 LINE 個人帳號
- 阿凱老師的 LINE Bot ID 設成環境變數
**關聯 skill**：`line-messaging-firebase`

### 24. SEO + sitemap
**為什麼**：搜「5W1H 靈感」希望排前面。
**做法**：
- Next.js metadata 已做 ✅
- 加 `app/sitemap.ts` 自動產出 `sitemap.xml`
- 加 `app/robots.ts`（允許 GoogleBot、bingbot；擋 GPTBot、ClaudeBot 隨意）
- 提交 [Google Search Console](https://search.google.com/search-console)
**工時**：30 分鐘

### 25. Analytics（隱私友善）
**為什麼**：知道有沒有人在用、用什麼功能最多 → 教學決策。
**做法**：
- 用 [Plausible](https://plausible.io) / [Umami](https://umami.is)（不像 GA 會跟蹤使用者）
- 一個 `<script>` 標籤就好，不裝 cookie
- 看每日 PV / 哪個按鈕點最多
**工時**：15 分鐘

### 26. README / GitHub Pages 加完整介紹
**為什麼**：repo 是公開的，目前 README 只有 Firebase Studio 的 boilerplate。
**做法**：
- Banner 圖（拿 OG 圖直接用）
- 「線上 Demo」連結置頂
- 教學目標、適用年級、課堂使用情境
- LICENSE（建議 MIT 或 CC-BY-NC 教學用）
**工時**：30 分鐘

---

## 📊 一頁式優先順序總表（依價值/工時比排序）

| # | 項目 | 優先級 | 工時 | 一句話 |
| --- | --- | --- | --- | --- |
| 3 | 跑預算腳本 | 🔥 P0 | 5 min | 防破產 |
| 7 | 鍵盤快捷鍵 | ⭐ P1 | 15 min | 老師熟練後超有感 |
| 25 | Plausible analytics | 🔥 P0 | 15 min | 知道有沒有人在用 |
| 17 | Cold start 友善訊息 | ⭐ P1 | 15 min | 第一次點不要冷場 |
| 5 | 使用說明彈窗 | ⭐ P1 | 30 min | 新使用者體驗 |
| 6 | PDF 匯出 | ⭐ P1 | 30 min | 教學現場必備 |
| 8 | 多格式複製 | ⭐ P1 | 20 min | 分享更方便 |
| 23 | LINE 出錯警報 | ⭐ P1 | 30 min | 站掛了立刻知道 |
| 1 | bulk 化潤飾語法 | ⭐ P1 | 45 min | 從 6s 降到 2-3s |
| 24 | SEO sitemap | ⭐ P1 | 30 min | Google 搜尋找得到 |
| 26 | README 完整介紹 | ⭐ P1 | 30 min | 公開 repo 第一印象 |
| 2 | GitHub Actions 自動部署 functions | ⭐ P1 | 30 min | 後端改完自動上線 |
| 4 | 拿掉 ignoreBuildErrors | ⭐ P1 | 30~60 min | 防 bug 偷溜上線 |
| 9 | 故事打字機動效 | ⭐ P2 | 1~2 hr | 合成過程不無聊 |
| 22 | Firebase App Check | ⭐ P2 | 1 hr | 雙重防爆 |
| 10 | 看圖編故事（多模態）| 🌱 P2 | 3~4 hr | 殺手級功能 |
| 11 | 一鍵生成簡報 | 🌱 P2 | 2~3 hr | 教學鏈無縫接軌 |
| 12 | 故事永久連結 + OG | 🌱 P2 | 2~3 hr | 分享給家長/同事 |
| 14 | 跨裝置記憶 | 🌱 P2 | 2~3 hr | 學校 / 家裡同步 |
| 13 | 教師後台 + 統計 | 🌱 P2 | 1~2 day | 教學成果報告 |
| 21 | i18n 多語 | 🌱 P3 | 3~4 hr | 推向國際 |

---

## 🚦 我建議的下一步走法

**第 1 週（今晚~這週末，~3 小時）**：
- #3（5 min）→ #7（15 min）→ #25（15 min）→ #5（30 min）→ #6（30 min）→ #1（45 min）
- 一個下午能爽爽做完，網站從「能用」變成「老師喜歡用」

**第 2 週（深入打磨，~2 小時）**：
- #2（30 min）→ #4（60 min）→ #23（30 min）
- 開發體驗 + 維運穩定度都拉到 production-grade

**第 3 週（殺手鐧開始長出，~5 小時）**：
- #10（3-4 hr）一個 weekend 做掉看圖編故事
- 配合 #11 把產出鏈到簡報，整個教學流程閉環

**第 4 週以後**：
- #12 / #13 / #14 看實際使用反饋再決定
- 如果家長 / 學生開始大量使用 → 才需要做後台統計

每一波都很 modular，可以隨意跳號或暫停，不影響網站運作。

---

## 💡 從這次 4 小時遷移實戰學到的心得（給未來的自己）

1. **路線 A vs 路線 B 永遠先勸退 B**：除非真的需要 `cagoooo.github.io` URL，App Hosting 一鍵搞定 90% 場景
2. **Turnstile 序列化是必須的**：v2 widget 共用 token 是隱蔽的雷，必須有 FIFO queue + readyPromise
3. **bulk endpoint > 個別 endpoint**：6 個獨立 call 永遠比 1 個 bulk call 慢 + 燒更多 quota
4. **樂觀 UI 是免費的速度**：先填預設、AI 來再 swap，0s 感知優於任何 spinner 設計
5. **Gemini 模型棄用週期短**：每 6-12 月就會棄用一個 model name，要監控 `gemini-api-integration` skill
6. **System reminder 也算 leak**：寫 secret 進 .env.local 會被自動 file-modified diff 帶到 chat → 真要安全直接 user 自己貼 (skill `gcp-api-key-secure-create` 還可以再強化)
7. **每年 1 月 footer 都會被忘記**：所以才有 `footer-year-update` skill
