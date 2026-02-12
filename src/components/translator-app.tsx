'use client';

import { useEffect, useState } from 'react';

import {
  JobForm,
  type CredentialPayload,
  type JobFormPayload,
  type OutputDirectoryHandle,
} from '@/components/job-form';
import { JobStatus, type TreeFileItem } from '@/components/job-status';
import type { JobPublicView } from '@/lib/jobs/types';
import {
  fallbackProviderDefaultModels,
  type ProviderDefaultModelMap,
  type ProviderStatusMap,
} from '@/lib/translator/provider-status';
import { partitionUploadFiles } from '@/lib/upload-filter';

const defaultProviderStatus: ProviderStatusMap = {
  openai: false,
  gemini: false,
  local: true,
};

const sidebarNavItems = [
  { id: 'overview', label: '總覽儀表板', icon: 'overview' },
  { id: 'workspace', label: '建立翻譯任務', icon: 'workspace' },
  { id: 'status-center', label: '任務狀態中心', icon: 'status' },
] as const;

type SidebarSectionId = (typeof sidebarNavItems)[number]['id'];

function isSidebarSectionId(value: string): value is SidebarSectionId {
  return sidebarNavItems.some((item) => item.id === value);
}

function SidebarNavIcon({
  icon,
}: {
  icon: (typeof sidebarNavItems)[number]['icon'];
}) {
  if (icon === 'overview') {
    return (
      <svg className="saas-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="8" height="7" rx="2" />
        <rect x="13" y="4" width="8" height="4" rx="2" />
        <rect x="13" y="10" width="8" height="10" rx="2" />
        <rect x="3" y="13" width="8" height="7" rx="2" />
      </svg>
    );
  }

  if (icon === 'workspace') {
    return (
      <svg className="saas-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  }

  return (
    <svg className="saas-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 17.5z" />
      <circle cx="9" cy="10" r="1.2" />
      <path d="M11.5 10h4M8 14h8" />
    </svg>
  );
}

function splitSafeRelativePath(relativePath: string) {
  const pathSegments = relativePath.split('/').filter(Boolean);

  if (pathSegments.length === 0 || pathSegments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error(`無效的輸出檔案路徑：${relativePath}`);
  }

  return pathSegments;
}

async function writeFileToSelectedDirectory(
  outputDirectoryHandle: OutputDirectoryHandle,
  relativePath: string,
  fileContent: ArrayBuffer,
) {
  const pathSegments = splitSafeRelativePath(relativePath);
  const fileName = pathSegments[pathSegments.length - 1];

  if (!fileName) {
    throw new Error(`無效的輸出檔名：${relativePath}`);
  }

  let currentDirectoryHandle = outputDirectoryHandle;

  for (const folderName of pathSegments.slice(0, -1)) {
    currentDirectoryHandle = await currentDirectoryHandle.getDirectoryHandle(folderName, {
      create: true,
    });
  }

  const outputFileHandle = await currentDirectoryHandle.getFileHandle(fileName, {
    create: true,
  });
  const writable = await outputFileHandle.createWritable();

  try {
    await writable.write(new Uint8Array(fileContent));
  } finally {
    await writable.close();
  }
}

function isPermissionActivationError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const normalizedMessage = error.message.toLowerCase();

  return (
    normalizedMessage.includes('user activation is required')
    || normalizedMessage.includes('request permissions')
    || normalizedMessage.includes('permission')
  );
}

async function ensureOutputDirectoryWritable(outputDirectoryHandle: OutputDirectoryHandle) {
  if (!outputDirectoryHandle.queryPermission) {
    return;
  }

  const permissionState = await outputDirectoryHandle.queryPermission({ mode: 'readwrite' });

  if (permissionState !== 'granted') {
    throw new Error('尚未取得輸出目錄寫入權限，請重新點選「選擇輸出目錄」並允許寫入。');
  }
}

export function TranslatorApp() {
  const [job, setJob] = useState<JobPublicView | null>(null);
  const [files, setFiles] = useState<TreeFileItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatusMap>(defaultProviderStatus);
  const [defaultModels, setDefaultModels] = useState<ProviderDefaultModelMap>(
    fallbackProviderDefaultModels,
  );
  const [isProviderStatusLoading, setIsProviderStatusLoading] = useState(true);
  const [pickedOutputDirectoryHandle, setPickedOutputDirectoryHandle] =
    useState<OutputDirectoryHandle | null>(null);
  const [syncedOutputJobId, setSyncedOutputJobId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<SidebarSectionId>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeJobId = job?.id ?? null;
  const activeJobStatus = job?.status ?? null;
  const isJobActive = activeJobStatus === 'queued' || activeJobStatus === 'running';
  const providerReadyCount = Object.values(providerStatus).filter(Boolean).length;
  const totalProviderCount = Object.keys(providerStatus).length;

  const jobStatusLabel = isJobActive
    ? '任務執行中'
    : activeJobStatus === 'completed'
      ? '任務已完成'
      : activeJobStatus === 'failed'
        ? '任務失敗'
        : activeJobStatus === 'cancelled'
          ? '任務已停止'
          : '等待建立任務';

  const statusToneClassName =
    activeJobStatus === 'completed'
      ? 'status-completed'
      : activeJobStatus === 'failed'
        ? 'status-failed'
        : activeJobStatus === 'cancelled'
          ? 'status-cancelled'
          : activeJobStatus === 'running'
            ? 'status-running'
            : 'status-queued';

  async function refreshJob(jobId: string) {
    const response = await fetch(`/api/jobs/${jobId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(typeof data?.error === 'string' ? data.error : '無法取得任務狀態資訊');
    }

    setJob(data.job as JobPublicView);
    return data.job as JobPublicView;
  }

  async function loadTree(jobId: string) {
    const response = await fetch(`/api/jobs/${jobId}/tree`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(typeof data?.error === 'string' ? data.error : '無法取得翻譯檔案清單');
    }

    const translatedFiles = Array.isArray(data.files) ? (data.files as TreeFileItem[]) : [];
    setFiles(translatedFiles);

    return translatedFiles;
  }

  async function syncOutputToSelectedDirectory(
    jobId: string,
    translatedFiles: TreeFileItem[],
    outputDirectoryHandle: OutputDirectoryHandle,
  ) {
    if (translatedFiles.length === 0) {
      setUploadNotice('翻譯任務已完成，但沒有可輸出的檔案。');
      return;
    }

    await ensureOutputDirectoryWritable(outputDirectoryHandle);

    setUploadNotice('正在將翻譯結果同步到你選擇的輸出目錄...');

    for (const translatedFile of translatedFiles) {
      const response = await fetch(`/api/jobs/${jobId}/file?path=${encodeURIComponent(translatedFile.path)}`);

      if (!response.ok) {
        let fetchErrorMessage = '讀取翻譯檔案失敗';

        try {
          const payload = await response.json();
          if (typeof payload?.error === 'string') {
            fetchErrorMessage = payload.error;
          }
        } catch {
          // Ignore JSON parse errors and keep fallback message.
        }

        throw new Error(`${translatedFile.path}: ${fetchErrorMessage}`);
      }

      const fileContent = await response.arrayBuffer();

      try {
        await writeFileToSelectedDirectory(outputDirectoryHandle, translatedFile.path, fileContent);
      } catch (error) {
        if (isPermissionActivationError(error)) {
          throw new Error('瀏覽器需要使用者操作才能授權寫入，請重新點選「選擇輸出目錄」後再建立任務。');
        }

        throw error;
      }
    }

    setUploadNotice(`已將 ${translatedFiles.length} 個檔案輸出到你選擇的輸出目錄。`);
  }

  async function loadProviderStatus() {
    try {
      setIsProviderStatusLoading(true);
      const response = await fetch('/api/translator-status');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : '無法讀取翻譯引擎設定');
      }

      if (data?.providerStatus) {
        setProviderStatus(data.providerStatus as ProviderStatusMap);
      }

      if (data?.defaultModels) {
        setDefaultModels(data.defaultModels as ProviderDefaultModelMap);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '讀取翻譯引擎設定失敗');
      setProviderStatus(defaultProviderStatus);
      setDefaultModels(fallbackProviderDefaultModels);
    } finally {
      setIsProviderStatusLoading(false);
    }
  }

  async function handleSaveCredentials(payload: CredentialPayload) {
    const response = await fetch('/api/translator-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(typeof data?.error === 'string' ? data.error : '無法儲存金鑰設定');
    }

    if (data?.providerStatus) {
      setProviderStatus(data.providerStatus as ProviderStatusMap);
    }

    if (data?.defaultModels) {
      setDefaultModels(data.defaultModels as ProviderDefaultModelMap);
    }
  }

  async function handleSubmit(payload: JobFormPayload) {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setUploadNotice(null);
      setFiles([]);
      setPickedOutputDirectoryHandle(payload.outputDirectoryHandle ?? null);
      setSyncedOutputJobId(null);

      let response: Response;

      if (payload.sourceType === 'folder') {
        const { accepted, skipped } = partitionUploadFiles(payload.files ?? []);

        if (skipped.length > 0) {
          setUploadNotice(
            `已自動略過 ${skipped.length} 個檔案（node_modules/.git/.next/.turbo/dist/build）。`,
          );
        }

        if (accepted.length === 0) {
          throw new Error('沒有可上傳翻譯的檔案，請確認資料夾內容。');
        }

        const formData = new FormData();
        formData.set('sourceType', 'folder');
        formData.set('translator', payload.translator);
        formData.set('model', payload.model);
        formData.set('targetLanguage', payload.targetLanguage);
        formData.set('outputFolder', payload.outputFolder);
        formData.set('allowedExtensions', payload.allowedExtensions);

        for (const entry of accepted) {
          formData.append('files', entry.file);
          formData.append('paths', entry.path);
        }

        response = await fetch('/api/jobs', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('/api/jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourceType: 'github',
            repoUrl: payload.repoUrl,
            translator: payload.translator,
            model: payload.model,
            targetLanguage: payload.targetLanguage,
            outputFolder: payload.outputFolder,
            allowedExtensions: payload.allowedExtensions,
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : '建立翻譯任務失敗');
      }

      setJob(data.job as JobPublicView);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '建立翻譯任務失敗');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStopJob() {
    if (!activeJobId || (activeJobStatus !== 'queued' && activeJobStatus !== 'running')) {
      return;
    }

    try {
      setIsStopping(true);
      setErrorMessage(null);

      const response = await fetch(`/api/jobs/${activeJobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'cancel' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : '停止任務失敗');
      }

      setJob(data.job as JobPublicView);
      setUploadNotice('已停止本次翻譯任務。');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '停止任務失敗');
    } finally {
      setIsStopping(false);
    }
  }

  useEffect(() => {
    void loadProviderStatus();
  }, []);

  useEffect(() => {
    if (!activeJobId) {
      return;
    }

    if (activeJobStatus === 'queued' || activeJobStatus === 'running') {
      setFiles([]);
    }
  }, [activeJobId, activeJobStatus]);

  useEffect(() => {
    if (!activeJobId) {
      return;
    }

    if (activeJobStatus !== 'queued' && activeJobStatus !== 'running') {
      return;
    }

    let cancelled = false;

    const interval = setInterval(() => {
      void refreshJob(activeJobId).catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : '更新任務狀態失敗');
        }
      });
    }, 1500);

    void refreshJob(activeJobId).catch((error) => {
      if (!cancelled) {
        setErrorMessage(error instanceof Error ? error.message : '更新任務狀態失敗');
      }
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeJobId, activeJobStatus]);

  useEffect(() => {
    if (!activeJobId || activeJobStatus !== 'completed') {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const translatedFiles = await loadTree(activeJobId);

        if (cancelled) {
          return;
        }

        if (!pickedOutputDirectoryHandle || syncedOutputJobId === activeJobId) {
          return;
        }

        await syncOutputToSelectedDirectory(activeJobId, translatedFiles, pickedOutputDirectoryHandle);

        if (!cancelled) {
          setSyncedOutputJobId(activeJobId);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : '載入輸出檔案清單失敗');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeJobId, activeJobStatus, pickedOutputDirectoryHandle, syncedOutputJobId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    function syncActiveSectionFromHash() {
      const hashId = window.location.hash.replace('#', '');

      if (isSidebarSectionId(hashId)) {
        setActiveSectionId(hashId);
      }
    }

    syncActiveSectionFromHash();
    window.addEventListener('hashchange', syncActiveSectionFromHash);

    return () => {
      window.removeEventListener('hashchange', syncActiveSectionFromHash);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') {
      return;
    }

    const observedSections = sidebarNavItems
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => section instanceof HTMLElement);

    if (observedSections.length === 0) {
      return;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

        const topEntry = visibleEntries[0];

        if (topEntry && isSidebarSectionId(topEntry.target.id)) {
          setActiveSectionId(topEntry.target.id);
        }
      },
      {
        rootMargin: '-25% 0px -60% 0px',
        threshold: [0.2, 0.35, 0.6],
      },
    );

    for (const section of observedSections) {
      observer.observe(section);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 1181px)');

    function closeSidebarWhenDesktop(event?: MediaQueryListEvent) {
      if ((event?.matches ?? mediaQuery.matches) && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    }

    closeSidebarWhenDesktop();
    mediaQuery.addEventListener('change', closeSidebarWhenDesktop);

    return () => {
      mediaQuery.removeEventListener('change', closeSidebarWhenDesktop);
    };
  }, [isSidebarOpen]);

  return (
    <main className="saas-shell container">
      <button
        type="button"
        className="sidebar-toggle"
        aria-label="切換導覽選單"
        aria-controls="saas-sidebar"
        aria-expanded={isSidebarOpen}
        onClick={() => {
          setIsSidebarOpen((previousState) => !previousState);
        }}
      >
        導覽選單
      </button>

      <div className={`saas-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <button
          type="button"
          className={`sidebar-backdrop ${isSidebarOpen ? 'is-open' : ''}`}
          aria-label="關閉導覽選單"
          onClick={() => {
            setIsSidebarOpen(false);
          }}
        />

        <aside
          id="saas-sidebar"
          aria-label="控制台側邊欄"
          data-sidebar-open={isSidebarOpen ? 'true' : 'false'}
          className={`saas-sidebar ${isSidebarOpen ? 'is-open' : ''}`}
        >
          <div className="saas-branding saas-sidebar-branding">
            <p className="saas-brand-title">Project Translate 翻譯管理台</p>
            <p className="saas-brand-subtitle">AI 文件在地化作業平台</p>
          </div>

          <nav aria-label="控制台導覽" className="saas-nav">
            {sidebarNavItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`saas-nav-link ${activeSectionId === item.id ? 'is-active' : ''}`}
                aria-current={activeSectionId === item.id ? 'page' : undefined}
                onClick={() => {
                  setActiveSectionId(item.id);
                  setIsSidebarOpen(false);
                }}
              >
                <SidebarNavIcon icon={item.icon} />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>

          <div className="saas-sidebar-footnote">
            <p>最佳化建議</p>
            <strong>先設定金鑰 → 建立任務 → 追蹤進度</strong>
          </div>
        </aside>

        <div className="saas-main">
          <header className="saas-topbar">
            <div className="saas-topbar-content">
              <h1>專案文件翻譯控制台</h1>
              <p className="subtitle">
                提供完整的 SaaS 翻譯工作流程：導覽清晰、任務分區明確、狀態回饋即時，輸出管理一次完成。
              </p>
            </div>
            <div className="saas-topbar-chips" aria-live="polite">
              <span className="chip chip-info">引擎可用 {providerReadyCount}/{totalProviderCount}</span>
              <span className={`chip status-badge ${statusToneClassName}`}>{jobStatusLabel}</span>
            </div>
          </header>

          <section id="overview" className="saas-hero" aria-label="平台概覽">
            <article className="metric-card">
              <p className="metric-label">資料來源</p>
              <p className="metric-value">本機目錄 / GitHub 倉庫</p>
              <p className="metric-description">兩種輸入流皆可共用同一套翻譯流程與輸出策略。</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">目前任務狀態</p>
              <p className="metric-value">{jobStatusLabel}</p>
              <p className="metric-description">執行中任務會自動輪詢；完成後自動整理輸出檔案。</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">翻譯引擎可用數</p>
              <p className="metric-value">
                {providerReadyCount}
                <span className="metric-unit"> / {totalProviderCount}</span>
              </p>
              <p className="metric-description">建議至少啟用一個雲端模型與 Local Adapter 作備援。</p>
            </article>
          </section>

          <section id="workspace" className="saas-workspace" aria-label="翻譯工作區">
            <div className="section-heading">
              <h2>翻譯工作區</h2>
              <p>建立任務、管理金鑰與追蹤任務進度。</p>
            </div>

            <div className="grid">
              <JobForm
                onSubmit={handleSubmit}
                onSaveCredentials={handleSaveCredentials}
                isSubmitting={isSubmitting}
                isJobActive={isJobActive}
                helperMessage={uploadNotice}
                providerStatus={providerStatus}
                defaultModels={defaultModels}
                isProviderStatusLoading={isProviderStatusLoading}
              />

              <div id="status-center" className="status-center-card">
                <JobStatus
                  job={job}
                  files={files}
                  errorMessage={errorMessage}
                  canStopJob={activeJobStatus === 'queued' || activeJobStatus === 'running'}
                  isStoppingJob={isStopping}
                  onStopJob={() => {
                    void handleStopJob();
                  }}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
