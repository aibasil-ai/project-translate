# SaaS 介面與完整 UI/UX 重設 V2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將翻譯系統升級為標準 SaaS 控制台體驗，新增側邊導覽、狀態徽章分級與更完整的資訊架構，並保留既有功能流程。

**Architecture:** 以 `TranslatorApp` 重構頁面 IA（Sidebar + Main Workspace），`JobStatus` 導入狀態徽章語意 class（running/completed/failed/cancelled/queued），`globals.css` 建立一致設計 token、可及性 focus 與 responsive 規則。

**Tech Stack:** Next.js 16、React 19、TypeScript、Vitest、Testing Library

---

### Task 1: TDD 建立新版 UX 驗收條件（RED）

**Files:**
- Modify: `src/components/__tests__/translator-app.test.tsx`
- Modify: `src/components/__tests__/job-status.test.tsx`

**Step 1: 新增導覽存在與 active state 測試**
- 驗證 `navigation[aria-label="控制台導覽"]` 存在
- 驗證 `總覽儀表板` 為 `aria-current="page"`

**Step 2: 新增狀態 badge class 測試**
- `running -> status-running`
- `completed -> status-completed`
- `failed -> status-failed`

**Step 3: 確認 RED**
Run: `npx -y node@20 node_modules/vitest/vitest.mjs run src/components/__tests__/translator-app.test.tsx src/components/__tests__/job-status.test.tsx`
Expected: FAIL（改版前不存在對應 UI 結構與 class）

---

### Task 2: 重構 `TranslatorApp` 資訊架構與導覽

**Files:**
- Modify: `src/components/translator-app.tsx`

**Step 1: 建立側邊導覽與主版面結構**
- `saas-layout`：sidebar + main
- `saas-nav-link`：active state

**Step 2: 重排 topbar/overview/workspace 區塊**
- Topbar 顯示系統標題與即時狀態 chip
- Overview 顯示來源/狀態/引擎可用數

**Step 3: 保留原功能邏輯**
- `JobForm`、`JobStatus` props 與既有流程保持一致

**Step 4: 驗證 GREEN**
Run: `npx -y node@20 node_modules/vitest/vitest.mjs run src/components/__tests__/translator-app.test.tsx`
Expected: PASS

---

### Task 3: 重設 `JobStatus` 狀態視覺語意

**Files:**
- Modify: `src/components/job-status.tsx`

**Step 1: 增加 status -> class map**
- 轉成 badge 顯示與語意 class

**Step 2: 保留進度與錯誤資訊**
- 不移除任何既有資訊項目

**Step 3: 驗證 GREEN**
Run: `npx -y node@20 node_modules/vitest/vitest.mjs run src/components/__tests__/job-status.test.tsx`
Expected: PASS

---

### Task 4: 完整 UI/UX 視覺系統重設

**Files:**
- Modify: `src/app/globals.css`

**Step 1: 設計 token 升級**
- 色彩、陰影、圓角、狀態色 token

**Step 2: SaaS 版型與元件樣式**
- sidebar、topbar、metric cards、workspace cards
- nav active / hover / focus

**Step 3: a11y 與可用性**
- Focus ring
- `prefers-reduced-motion`
- 響應式斷點：桌機/平板/手機

**Step 4: 迴歸元件測試**
Run: `npx -y node@20 node_modules/vitest/vitest.mjs run src/components/__tests__/job-form.test.tsx src/components/__tests__/translator-app.test.tsx src/components/__tests__/job-status.test.tsx`
Expected: PASS

---

### Task 4B: 導覽互動強化（Scroll Spy + 可折疊 Sidebar）

**Files:**
- Modify: `src/components/translator-app.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/__tests__/translator-app.test.tsx`

**Step 1: 新增可折疊 Sidebar 按鈕與抽屜狀態**
- 提供 `切換導覽選單` 按鈕
- 以 `aria-expanded` 與 `data-sidebar-open` 呈現可見狀態

**Step 2: 新增 Scroll Spy 與 Hash 同步 active state**
- `hashchange` 更新 active 導覽
- 使用 `IntersectionObserver` 追蹤當前區塊

**Step 3: 響應式抽屜與 backdrop**
- 平板/手機寬度改為抽屜側邊欄
- 支援 backdrop 點擊關閉

**Step 4: 驗證測試**
Run: `npx -y node@20 node_modules/vitest/vitest.mjs run src/components/__tests__/translator-app.test.tsx`
Expected: PASS

---

### Task 5: 全量驗證

**Files:**
- Verify: 全專案

**Step 1: Run Tests**
`npx -y node@20 node_modules/vitest/vitest.mjs run`

**Step 2: Run Lint**
`npx -y node@20 node_modules/eslint/bin/eslint.js`

**Step 3: Run Build**
`npm run build`
