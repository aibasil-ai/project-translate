# Project Translation Web System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Next.js web system that accepts either a local project folder upload or a GitHub repository URL, translates supported files to Traditional Chinese, and outputs translated artifacts without modifying original files.

**Architecture:** Use Next.js App Router for both UI and API routes. Implement asynchronous in-memory job orchestration backed by temporary filesystem workspaces (`input`, `output`) per job. Translation providers are implemented through an adapter registry (`openai`, `local`, `gemini`) to support engine switching and future extension.

**Tech Stack:** Next.js 15 + TypeScript, Node.js runtime route handlers, Vitest, React client components, `archiver` for zip output.

---

### Task 1: Initialize project and test harness

**Files:**
- Create: `package.json` (from create-next-app)
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Modify: `tsconfig.json`

**Step 1: Write the failing test**
- Create a minimal test `src/lib/__tests__/sanity.test.ts` asserting test runtime availability.

**Step 2: Run test to verify it fails**
- Run: `npm test`
- Expected: FAIL because test tooling/config is not set.

**Step 3: Write minimal implementation**
- Configure Vitest and scripts so tests execute.

**Step 4: Run test to verify it passes**
- Run: `npm test`
- Expected: PASS for sanity test.

**Step 5: Commit**
- Stage setup files and commit.

### Task 2: Build safe file/path and scan utilities with TDD

**Files:**
- Create: `src/lib/path-safety.ts`
- Create: `src/lib/file-scan.ts`
- Test: `src/lib/__tests__/path-safety.test.ts`
- Test: `src/lib/__tests__/file-scan.test.ts`

**Step 1: Write the failing test**
- Tests for path traversal rejection, safe relative paths, extension filtering, ignored directories, and binary/size gating.

**Step 2: Run test to verify it fails**
- Run: `npm test -- path-safety file-scan`
- Expected: FAIL because modules/functions are missing.

**Step 3: Write minimal implementation**
- Implement safe path normalization and recursive file discovery utilities.

**Step 4: Run test to verify it passes**
- Run: `npm test -- path-safety file-scan`
- Expected: PASS.

**Step 5: Commit**
- Stage utility + tests and commit.

### Task 3: Build translator adapter layer with TDD

**Files:**
- Create: `src/lib/translator/types.ts`
- Create: `src/lib/translator/providers/openai.ts`
- Create: `src/lib/translator/providers/local.ts`
- Create: `src/lib/translator/providers/gemini.ts`
- Create: `src/lib/translator/index.ts`
- Test: `src/lib/__tests__/translator.test.ts`

**Step 1: Write the failing test**
- Validate provider registration, unknown provider error behavior, and adapter dispatch.

**Step 2: Run test to verify it fails**
- Run: `npm test -- translator`
- Expected: FAIL because adapter modules do not exist.

**Step 3: Write minimal implementation**
- Implement provider registry and provider API wrappers.

**Step 4: Run test to verify it passes**
- Run: `npm test -- translator`
- Expected: PASS.

**Step 5: Commit**
- Stage adapter files + tests and commit.

### Task 4: Implement job store and translation pipeline with TDD

**Files:**
- Create: `src/lib/jobs/types.ts`
- Create: `src/lib/jobs/store.ts`
- Create: `src/lib/jobs/pipeline.ts`
- Test: `src/lib/__tests__/pipeline.test.ts`

**Step 1: Write the failing test**
- Cover job lifecycle, progress updates, partial file failures, and no overwrite guarantees (`input` remains unchanged).

**Step 2: Run test to verify it fails**
- Run: `npm test -- pipeline`
- Expected: FAIL because job orchestration is unimplemented.

**Step 3: Write minimal implementation**
- Implement in-memory store and pipeline that reads from input and writes translated output mirror tree.

**Step 4: Run test to verify it passes**
- Run: `npm test -- pipeline`
- Expected: PASS.

**Step 5: Commit**
- Stage pipeline files + tests and commit.

### Task 5: Implement API routes with TDD

**Files:**
- Create: `src/app/api/jobs/route.ts`
- Create: `src/app/api/jobs/[id]/route.ts`
- Create: `src/app/api/jobs/[id]/download/route.ts`
- Create: `src/app/api/jobs/[id]/tree/route.ts`
- Create: `src/app/api/jobs/[id]/file/route.ts`
- Test: `src/lib/__tests__/jobs-api.test.ts`

**Step 1: Write the failing test**
- Cover job creation for folder/github sources, validation failures, status retrieval, and output endpoints.

**Step 2: Run test to verify it fails**
- Run: `npm test -- jobs-api`
- Expected: FAIL due missing handlers.

**Step 3: Write minimal implementation**
- Implement endpoints, background processing kickoff, and zip generation.

**Step 4: Run test to verify it passes**
- Run: `npm test -- jobs-api`
- Expected: PASS.

**Step 5: Commit**
- Stage API route files + tests and commit.

### Task 6: Build web UI workflow with TDD

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/job-form.tsx`
- Create: `src/components/job-status.tsx`
- Test: `src/components/__tests__/job-form.test.tsx`

**Step 1: Write the failing test**
- Verify form mode switching, required fields, payload generation, and polling trigger.

**Step 2: Run test to verify it fails**
- Run: `npm test -- job-form`
- Expected: FAIL because components are absent.

**Step 3: Write minimal implementation**
- Implement client-side form, API calls, polling, and result rendering with download/tree links.

**Step 4: Run test to verify it passes**
- Run: `npm test -- job-form`
- Expected: PASS.

**Step 5: Commit**
- Stage component files + tests and commit.

### Task 7: Documentation and final verification

**Files:**
- Create: `README.md`
- Modify: `.env.example`

**Step 1: Write the failing test**
- Not applicable.

**Step 2: Run verification**
- Run: `npm test`
- Run: `npm run lint`
- Run: `npm run build`
- Expected: all pass.

**Step 3: Write minimal implementation**
- Document setup, env vars, workflow, supported formats, and limitations.

**Step 4: Run full verification again**
- Run: `npm test && npm run lint && npm run build`
- Expected: all green.

**Step 5: Commit**
- Stage docs/config and commit.
