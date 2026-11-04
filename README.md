# 5W1H 靈感發射器 PRO版（Aura）

🌐 **線上使用：[5W1H 靈感發射器 PRO版](https://cagoooo.github.io/Aura/)**

> 📌 **目前版本：v0.2.0**（依據 `package.json`）

用 5W1H（What／Who／When／Where／Why／How）框架發想故事與教學設計的 AI 小幫手。前端是 Next.js 靜態網站（GitHub Pages），AI 功能放在 Firebase Cloud Functions 後端，以 Genkit 呼叫 Gemini 2.5 Flash，金鑰不會出現在前端。

**後端函式**（`functions/src/index.ts`）：隨機產生 5W1H 元素（`randomElement`／`randomElementBulk`）、語句潤飾（`grammarImprove`／`grammarImproveBulk`）、一致性檢查（`checkConsistency`）、把六個元素合成故事（`synthesizeStory`）、看圖發想（`analyzeImage`），以及故事分享連結的儲存與讀取（`saveStory`／`getStory`）。

**部署**：
- 前端：push 到 `main` 由 `.github/workflows/deploy-pages.yml` 自動部署到 GitHub Pages。
- Cloud Functions：執行環境為 **Node.js 22**（`functions/package.json`，2026-09-29 由 Node 20 升級）。`deploy-functions.yml` 只保留手動觸發，平常改用 Firebase CLI 部署 `--only functions`。

---

<!-- BEGIN:PROJECT_GUIDE -->
## 專案導覽

5W1H 靈感發射器

- 專案定位：實用工具／自動化原型
- Repository：`cagoooo/Aura`
- 可見性：公開
- 主要技術：TypeScript、React、Next.js、Firebase、Tailwind CSS
- 線上入口：<https://cagoooo.github.io/Aura/>

### 可以怎麼應用

- 解決特定工作流程中的重複操作或資訊整理需求
- 作為相近工具的功能原型與程式碼參考
- 串接新的資料來源、服務或介面後延伸到其他情境

這些是依目前專案定位整理的延伸方向，不代表所有情境都已內建完成；實作前請先確認現有功能與資料格式。

### 技術與專案結構

- `README.md`
- `docs`
- `firebase.json`
- `functions`
- `package.json`
- `public`
- `scripts`
- `src`

檔案結構會隨版本演進；若本節與程式碼不一致，以目前預設分支的原始碼為準。

### 本機執行

```bash
npm install
# dev
npm run dev
# start
npm run start
# build
npm run build
# lint
npm run lint
```
請以 `package.json` 的 `scripts` 為準；若專案需要雲端服務，請先建立自己的環境變數與測試專案。

### 給 AI Agent 的接手指南

1. 先閱讀本 README、`AGENTS.md`（若有）、套件腳本與部署設定。
2. 先從入口檔、設定檔與資料流確認真實行為，不要只依 repo 名稱推測。
3. 修改前檢查環境變數、外部服務、檔案格式與失敗處理。
4. 完成後執行既有檢查，並以最小可重現案例驗證主要流程。
5. 不要捏造尚未存在的功能；README 與實作有落差時，應同時更新文件。
6. 提交前只納入本次任務檔案，並記錄實際執行過的驗證。

### 安全與資料注意事項

- 不要提交 `.env`、服務帳號、API 金鑰、token、學生個資或正式環境匯出資料。
- 使用 Firebase、Supabase、Google API 或其他雲端服務時，請建立自己的測試專案並套用最小權限。
- 若要公開衍生作品，請先確認程式碼、圖片、音訊、字型與教材內容的授權。

### 貢獻與客製化

歡迎依教學現場、活動或工作流程需求進行 fork／客製化。建議在變更說明中交代使用情境、主要修改、測試方式，以及是否影響資料格式或部署設定。
<!-- END:PROJECT_GUIDE -->

<!-- akai-edu-tools:backlink -->

---

## 🔗 阿凱老師教育工具集

這個專案是[阿凱老師教育工具集](https://cagoooo.github.io/Akai/)的 **#92 5W1H 靈感發射器 PRO版**，由桃園市龍潭區石門國民小學阿凱老師開發。

- 工具介紹頁：[https://cagoooo.github.io/Akai/tool/92/](https://cagoooo.github.io/Akai/tool/92/)
- 線上使用：[https://cagoooo.github.io/Aura/](https://cagoooo.github.io/Aura/)
- 教學情境文章：[https://cagoooo.github.io/Akai/blog/inspire-92-5w1h-pro-writing/](https://cagoooo.github.io/Akai/blog/inspire-92-5w1h-pro-writing/)
- 全部工具（上百個教育工具與原始碼）：[https://cagoooo.github.io/Akai/](https://cagoooo.github.io/Akai/)

想改造成自己的版本？到上面的教學情境文章，按左下角「複製 AI 開發提示詞」，貼給 ChatGPT、Claude、Gemini 等 AI 助手，就能參考這份原始碼開始規劃。
