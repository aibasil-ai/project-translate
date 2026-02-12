# Project Translator (Traditional Chinese)

一個使用 `Next.js` 建置的文件翻譯系統，提供標準 SaaS 風格操作介面，支援以下兩種輸入方式：

1. 選擇本機專案資料夾（資料夾內多檔上傳）
2. 輸入公開 GitHub 倉庫網址（自動 clone）

系統會將指定副檔名文件翻譯為目標語言（預設繁體中文），並輸出：

- 翻譯結果檔案（伺服器端 output）
- 可下載 ZIP
- 可同步到你指定的本機輸出目錄

> 設計重點：**翻譯結果永遠輸出到 `output`，不覆寫 `input` 原始檔。**

## Tech Stack

- Next.js 16 (App Router, Route Handlers)
- TypeScript
- Vitest + Testing Library
- Archiver（ZIP 輸出）

## 支援翻譯引擎

- `openai`（已實作）
- `gemini`（已實作，可擴充模型）
- `local`（Adapter 骨架，預設 fallback，不設定 endpoint 時回傳前綴字串）

## 快速開始

### 0) 確認 Node.js 版本

本專案使用 Next.js 16，需 Node.js `>=20.9.0`。

```bash
node -v
```

若你使用 `nvm`，可直接套用專案版本：

```bash
nvm use
```

### 1) 安裝依賴

```bash
npm install
```

### 2) 設定環境變數

```bash
cp .env.example .env.local
```

再依需求填入 API 金鑰（至少填你要使用的 provider）。

### 3) 啟動開發環境

```bash
npm run dev
```

開啟 `http://localhost:3000`。

### 4) 若出現「無法連線 localhost」

若你的環境有設定 `HTTP_PROXY` / `http_proxy`，可能將本機流量錯誤導到 proxy，導致連不上 `localhost:3000`。

先檢查：

```bash
env | grep -i proxy
```

臨時排除本機位址：

```bash
export NO_PROXY=localhost,127.0.0.1
export no_proxy=localhost,127.0.0.1
```

再測試：

```bash
curl -I http://localhost:3000
```

## 介面導覽（SaaS）

目前 UI 為控制台型介面，包含：

- 側邊導覽：`總覽儀表板`、`建立翻譯任務`、`任務狀態中心`
- Topbar 狀態摘要：引擎可用數、任務狀態徽章
- 工作區雙卡片：左側任務建立表單、右側任務執行狀態
- 響應式導覽：小螢幕可折疊側邊欄，支援錨點切換與高亮

## 使用方式

### A. 本機專案資料夾

1. 在 `資料來源` 選 `本機專案資料夾`
2. 選擇翻譯引擎與翻譯模型
3. 選擇目標語言（含 `日語 (ja-JP)`）
4. 設定 `輸出目錄路徑`（或按 `選擇輸出目錄`）
5. 調整 `可翻譯副檔名（逗號分隔）`（預設 `.md,.txt,.rst,.adoc`）
6. 選擇專案資料夾
7. 按 `建立翻譯任務`
8. 在 `任務執行狀態` 追蹤進度，完成後可下載 ZIP

### B. GitHub 倉庫網址

1. 在 `資料來源` 選 `GitHub 倉庫網址`
2. 填入公開倉庫網址（格式 `https://github.com/owner/repo`）
3. 選擇翻譯引擎、模型與目標語言
4. 設定 `輸出目錄路徑`（或按 `選擇輸出目錄`）
5. 按 `建立翻譯任務`
6. 右側 `任務執行狀態` 會即時更新進度

## 測試與驗證

```bash
npm test
npm run lint
npm run build
```

## API 概覽

- `POST /api/jobs`
  - `multipart/form-data`：建立 folder 任務
  - `application/json`：建立 github 任務
- `GET /api/jobs/:id`：查詢任務狀態
- `GET /api/jobs/:id/tree`：取得翻譯檔案樹
- `GET /api/jobs/:id/download`：下載 ZIP
- `GET /api/jobs/:id/file?path=...`：讀取單一翻譯檔

## 目前限制

- GitHub 只支援公開倉庫
- 任務儲存在記憶體（process restart 會遺失狀態）
- 以單機背景工作處理，不含分散式 queue
- 有上傳大小與檔案數限制（避免濫用）

## 後續可擴充

- 私有倉庫（GitHub token / OAuth）
- 任務佇列（Redis/BullMQ）
- 更完整的 local model provider（如 Ollama）
- 任務清理排程與持久化儲存
