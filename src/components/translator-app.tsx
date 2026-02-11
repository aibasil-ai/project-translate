'use client';

import { useEffect, useState } from 'react';

import {
  JobForm,
  type CredentialPayload,
  type JobFormPayload,
} from '@/components/job-form';
import { JobStatus, type TreeFileItem } from '@/components/job-status';
import type { JobPublicView } from '@/lib/jobs/types';
import type { ProviderStatusMap } from '@/lib/translator/provider-status';
import { partitionUploadFiles } from '@/lib/upload-filter';

const defaultProviderStatus: ProviderStatusMap = {
  openai: false,
  gemini: false,
  local: true,
};

export function TranslatorApp() {
  const [job, setJob] = useState<JobPublicView | null>(null);
  const [files, setFiles] = useState<TreeFileItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatusMap>(defaultProviderStatus);
  const [isProviderStatusLoading, setIsProviderStatusLoading] = useState(true);

  const activeJobId = job?.id ?? null;
  const activeJobStatus = job?.status ?? null;

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

    setFiles(Array.isArray(data.files) ? (data.files as TreeFileItem[]) : []);
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '讀取翻譯引擎設定失敗');
      setProviderStatus(defaultProviderStatus);
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
  }

  async function handleSubmit(payload: JobFormPayload) {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setUploadNotice(null);
      setFiles([]);

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
        formData.set('targetLanguage', payload.targetLanguage);
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
            targetLanguage: payload.targetLanguage,
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

    void loadTree(activeJobId).catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : '載入檔案樹失敗');
    });
  }, [activeJobId, activeJobStatus]);

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
          helperMessage={uploadNotice}
          providerStatus={providerStatus}
          isProviderStatusLoading={isProviderStatusLoading}
        />
        <JobStatus job={job} files={files} errorMessage={errorMessage} />
      </div>
    </main>
  );
}
