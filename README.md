# Project Translator (Traditional Chinese)

一個使用 `Next.js` 建置的網頁系統，支援以下兩種輸入方式：

1. 選取本機專案資料夾（資料夾內多檔上傳）
2. 輸入公開 GitHub repo URL（自動 clone）

系統會將指定副檔名文件翻譯成繁體中文，並輸出：

- 翻譯後資料夾（伺服器端 output）
- 可下載 ZIP

> 設計重點：**翻譯永遠在 `output` 目錄，不覆寫 `input` 原始檔。**

## Tech Stack

- Next.js 16 (App Router, Route Handlers)
- TypeScript
- Vitest + Testing Library
- Archiver (ZIP 輸出)

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

再依需求填入 API 金鑰（至少填你要用的 provider）。

### 3) 啟動開發環境

```bash
npm run dev
```

開啟 `http://localhost:3000`。

### 4) 若出現「無法連線 localhost」

若你的環境有設定 `HTTP_PROXY` / `http_proxy`，有機會把本機流量錯誤導到 proxy，導致連不上 `localhost:3000`。

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

## 使用方式

### A. 本機專案資料夾

1. 資料來源選 `本機專案資料夾`
2. 選翻譯引擎
3. 選擇目標語言（含 `日語 (ja-JP)`）
4. **按鈕選擇本機 output 輸出資料夾（必填）**
5. 調整副檔名白名單（預設 `.md,.txt,.rst,.adoc`）
6. 選取資料夾並送出
7. 在任務狀態查看進度條百分比，完成後下載 ZIP（翻譯檔案會輸出到你指定的路徑）

### B. GitHub Repo URL

1. 資料來源選 `GitHub Repo URL`
2. 填入公開 repo（格式 `https://github.com/owner/repo`）
3. 選擇目標語言（含 `日語 (ja-JP)`）
4. **按鈕選擇本機 output 輸出資料夾（必填）**
5. 送出後系統會 clone 並翻譯，右側可看到進度條

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

- GitHub 僅支援公開 repo
- 任務儲存在記憶體（process restart 會遺失狀態）
- 以單機背景工作處理，不含分散式 queue
- 有上傳大小與檔案數限制（避免濫用）

## 後續可擴充

- 私有 repo（GitHub token / OAuth）
- 任務佇列（Redis/BullMQ）
- 更完整的 local model provider（如 Ollama）
- 任務清理排程與持久化儲存
