# SaaS 風格操作介面改版 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將現有翻譯系統介面改為標準 SaaS 風格，保留既有業務流程與 API 互動行為。

**Architecture:** 以 `TranslatorApp` 作為頁面骨架重構入口，新增 SaaS 常見的 topbar、hero 與 dashboard 內容區。`JobForm`、`JobStatus` 維持功能邏輯，以全域樣式 token 與元件 class 重塑視覺一致性，避免牽動後端流程。

**Tech Stack:** Next.js 16、React 19、TypeScript、Vitest、Testing Library

---

### Task 1: 建立 SaaS 介面驗收測試（RED）

**Files:**
- Create: `src/components/__tests__/translator-app.test.tsx`
- Reference: `src/components/translator-app.tsx`

**Step 1: 寫出失敗測試，定義 SaaS 骨架**

```tsx
it('renders saas dashboard shell with topbar and workspace sections', () => {
  render(<TranslatorApp />);
  expect(screen.getByText('Project Translate SaaS Console')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '專案文件翻譯控制台' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '翻譯工作區' })).toBeInTheDocument();
});
```

**Step 2: 執行單測確認失敗**

Run: `npm test -- src/components/__tests__/translator-app.test.tsx`
Expected: FAIL，因為頁面尚未有新 SaaS 標題與區塊。

---

### Task 2: 重構 `TranslatorApp` 版面結構（GREEN）

**Files:**
- Modify: `src/components/translator-app.tsx`

**Step 1: 加入 SaaS topbar 與 hero 內容**

```tsx
<header className="saas-topbar">...</header>
<section className="saas-hero">...</section>
<section className="saas-workspace">...</section>
```

**Step 2: 保持原有 `JobForm` / `JobStatus` 串接**

```tsx
<JobForm ... />
<JobStatus ... />
```

**Step 3: 執行測試確認轉綠**

Run: `npm test -- src/components/__tests__/translator-app.test.tsx`
Expected: PASS。

---

### Task 3: 套用標準 SaaS 視覺語言

**Files:**
- Modify: `src/app/globals.css`

**Step 1: 建立 SaaS token 與卡片層級**

```css
:root {
  --bg-subtle: #f8fafc;
  --brand-600: #4f46e5;
  --card-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
}
```

**Step 2: 定義 topbar、hero、workspace、card 樣式**

```css
.saas-shell { ... }
.saas-topbar { ... }
.saas-hero { ... }
.saas-workspace { ... }
```

**Step 3: 強化表單與按鈕可用性樣式**

```css
input:focus,
select:focus,
button:focus-visible { ... }
```

**Step 4: 執行現有元件測試**

Run: `npm test -- src/components/__tests__/job-form.test.tsx src/components/__tests__/job-status.test.tsx`
Expected: PASS，代表改版未破壞原互動。

---

### Task 4: 全量驗證與收斂

**Files:**
- Verify: 全專案

**Step 1: 執行完整測試**

Run: `npm test`
Expected: PASS。

**Step 2: 執行 lint**

Run: `npm run lint`
Expected: PASS。

**Step 3: 執行建置**

Run: `npm run build`
Expected: PASS。
