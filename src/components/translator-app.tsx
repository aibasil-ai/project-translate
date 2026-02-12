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
    throw new Error('尚未取得 output 資料夾寫入權限，請重新點選「選擇本機資料夾」並允許寫入。');
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

  const activeJobId = job?.id ?? null;
  const activeJobStatus = job?.status ?? null;
  const isJobActive = activeJobStatus === 'queued' || activeJobStatus === 'running';

  async function refreshJob(jobId: string) {
    const response = await fetch(`/api/jobs/${jobId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(typeof data?.error === 'string' ? data.error : '無法取得任務狀態');
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
      setUploadNotice('翻譯任務完成，但沒有可輸出的檔案。');
      return;
    }

    await ensureOutputDirectoryWritable(outputDirectoryHandle);

    setUploadNotice('正在將翻譯結果同步到你選擇的本機資料夾...');

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
          throw new Error('瀏覽器需要使用者操作才能授權寫入，請重新點選「選擇本機資料夾」後再開始翻譯。');
        }

        throw error;
      }
    }

    setUploadNotice(`已將 ${translatedFiles.length} 個檔案輸出到你選擇的本機資料夾。`);
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
        throw new Error(typeof data?.error === 'string' ? data.error : '建立任務失敗');
      }

      setJob(data.job as JobPublicView);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '提交任務失敗');
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
        throw new Error(typeof data?.error === 'string' ? data.error : '停止翻譯失敗');
      }

      setJob(data.job as JobPublicView);
      setUploadNotice('已停止本次翻譯任務。');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '停止翻譯失敗');
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

    if (activeJobStatus !== 'queued' && activeJobStatus !== 'running') {
      return;
    }

    let cancelled = false;

    const interval = setInterval(() => {
      void refreshJob(activeJobId).catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : '輪詢任務狀態失敗');
        }
      });
    }, 1500);

    void refreshJob(activeJobId).catch((error) => {
      if (!cancelled) {
        setErrorMessage(error instanceof Error ? error.message : '輪詢任務狀態失敗');
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
          setErrorMessage(error instanceof Error ? error.message : '載入檔案樹失敗');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeJobId, activeJobStatus, pickedOutputDirectoryHandle, syncedOutputJobId]);

  return (
    <main className="container">
      <h1>專案文件繁體中文翻譯系統</h1>
      <p className="subtitle">
        支援上傳本機專案資料夾或輸入 GitHub Repo URL，翻譯結果輸出至新資料夾與 ZIP，且不覆寫原始檔案。
      </p>
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
    </main>
  );
}
