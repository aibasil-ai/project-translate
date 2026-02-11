'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import {
  missingProviderHint,
  type ProviderStatusMap,
} from '@/lib/translator/provider-status';

export type SourceType = 'folder' | 'github';

export interface JobFormPayload {
  sourceType: SourceType;
  translator: keyof ProviderStatusMap;
  targetLanguage: string;
  allowedExtensions: string;
  repoUrl?: string;
  files?: File[];
}

export interface CredentialPayload {
  openaiApiKey: string;
  geminiApiKey: string;
}

interface JobFormProps {
  isSubmitting: boolean;
  helperMessage?: string | null;
  providerStatus: ProviderStatusMap;
  isProviderStatusLoading?: boolean;
  onSubmit: (payload: JobFormPayload) => void | Promise<void>;
  onSaveCredentials: (payload: CredentialPayload) => void | Promise<void>;
}

const providerLabelMap: Record<keyof ProviderStatusMap, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  local: 'Local Adapter',
};

export function JobForm({
  isSubmitting,
  helperMessage,
  providerStatus,
  isProviderStatusLoading = false,
  onSubmit,
  onSaveCredentials,
}: JobFormProps) {
  const [sourceType, setSourceType] = useState<SourceType>('folder');
  const [translator, setTranslator] = useState<keyof ProviderStatusMap>('openai');
  const [targetLanguage, setTargetLanguage] = useState('Traditional Chinese (zh-TW)');
  const [allowedExtensions, setAllowedExtensions] = useState('.md,.txt,.rst,.adoc');
  const [repoUrl, setRepoUrl] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [validationMessage, setValidationMessage] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [credentialMessage, setCredentialMessage] = useState('');
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);

  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  const isSelectedProviderReady = providerStatus[translator];
  const providerBlockingMessage = useMemo(() => {
    if (isProviderStatusLoading || isSelectedProviderReady) {
      return null;
    }

    return missingProviderHint(translator);
  }, [isProviderStatusLoading, isSelectedProviderReady, translator]);

  const submitDisabled =
    isSubmitting || isProviderStatusLoading || isSavingCredentials || !isSelectedProviderReady;

  async function handleSaveCredentials() {
    setCredentialMessage('');

    try {
      setIsSavingCredentials(true);
      await onSaveCredentials({
        openaiApiKey,
        geminiApiKey,
      });
      setCredentialMessage('金鑰已儲存，已更新引擎狀態。');
    } catch (error) {
      setCredentialMessage(error instanceof Error ? error.message : '儲存金鑰失敗');
    } finally {
      setIsSavingCredentials(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationMessage('');

    if (!isSelectedProviderReady) {
      setValidationMessage(missingProviderHint(translator) ?? '翻譯引擎尚未就緒');
      return;
    }

    if (sourceType === 'github' && !repoUrl.trim()) {
      setValidationMessage('請輸入 GitHub Repo URL');
      return;
    }

    if (sourceType === 'folder' && files.length === 0) {
      setValidationMessage('請先選取專案資料夾');
      return;
    }

    void onSubmit({
      sourceType,
      translator,
      targetLanguage,
      allowedExtensions,
      repoUrl: sourceType === 'github' ? repoUrl.trim() : undefined,
      files: sourceType === 'folder' ? files : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="panel">
      <h2>建立翻譯任務</h2>

      <div className="provider-status" aria-live="polite">
        <strong>金鑰設定</strong>
        <label className="field" htmlFor="openaiApiKey">
          <span>OpenAI API Key</span>
          <input
            id="openaiApiKey"
            type="password"
            value={openaiApiKey}
            onChange={(event) => setOpenaiApiKey(event.target.value)}
            placeholder="sk-..."
            disabled={isSubmitting || isSavingCredentials}
          />
        </label>
        <label className="field" htmlFor="geminiApiKey">
          <span>Gemini API Key</span>
          <input
            id="geminiApiKey"
            type="password"
            value={geminiApiKey}
            onChange={(event) => setGeminiApiKey(event.target.value)}
            placeholder="AIza..."
            disabled={isSubmitting || isSavingCredentials}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            void handleSaveCredentials();
          }}
          disabled={isSubmitting || isSavingCredentials}
        >
          {isSavingCredentials ? '儲存中...' : '儲存金鑰'}
        </button>

        <strong>引擎狀態</strong>
        <ul className="files">
          <li>OpenAI：{providerStatus.openai ? '已設定' : '未設定'}</li>
          <li>Gemini：{providerStatus.gemini ? '已設定' : '未設定'}</li>
          <li>Local：{providerStatus.local ? '可用' : '不可用'}</li>
        </ul>
      </div>

      <label className="field" htmlFor="sourceType">
        <span>資料來源</span>
        <select
          id="sourceType"
          value={sourceType}
          onChange={(event) => setSourceType(event.target.value as SourceType)}
          disabled={isSubmitting}
        >
          <option value="folder">本機專案資料夾</option>
          <option value="github">GitHub Repo URL</option>
        </select>
      </label>

      <label className="field" htmlFor="translator">
        <span>翻譯引擎</span>
        <select
          id="translator"
          value={translator}
          onChange={(event) => setTranslator(event.target.value as keyof ProviderStatusMap)}
          disabled={isSubmitting}
        >
          <option value="openai">OpenAI</option>
          <option value="gemini">Gemini</option>
          <option value="local">Local Adapter</option>
        </select>
        {!isProviderStatusLoading && !isSelectedProviderReady ? (
          <small className="error">{providerLabelMap[translator]} 尚未設定金鑰</small>
        ) : null}
      </label>

      <label className="field" htmlFor="allowedExtensions">
        <span>翻譯副檔名（逗號分隔）</span>
        <input
          id="allowedExtensions"
          value={allowedExtensions}
          onChange={(event) => setAllowedExtensions(event.target.value)}
          placeholder=".md,.txt,.rst,.adoc"
          disabled={isSubmitting}
        />
      </label>

      <label className="field" htmlFor="targetLanguage">
        <span>目標語言</span>
        <input
          id="targetLanguage"
          value={targetLanguage}
          onChange={(event) => setTargetLanguage(event.target.value)}
          disabled={isSubmitting}
        />
      </label>

      {sourceType === 'github' ? (
        <label key="github-source" className="field" htmlFor="repoUrl">
          <span>GitHub Repo URL</span>
          <input
            id="repoUrl"
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            placeholder="https://github.com/owner/repo"
            disabled={isSubmitting}
          />
        </label>
      ) : (
        <label key="folder-source" className="field" htmlFor="projectFolder">
          <span>選取專案資料夾</span>
          <input
            id="projectFolder"
            ref={folderInputRef}
            type="file"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            disabled={isSubmitting}
          />
          <small>{files.length > 0 ? `已選取 ${files.length} 個檔案` : '尚未選取'}</small>
        </label>
      )}

      {validationMessage ? <p className="error">{validationMessage}</p> : null}
      {providerBlockingMessage ? <p className="hint">{providerBlockingMessage}</p> : null}
      {helperMessage ? <p className="hint">{helperMessage}</p> : null}
      {credentialMessage ? <p className="hint">{credentialMessage}</p> : null}

      <button type="submit" disabled={submitDisabled}>
        {isSubmitting ? '處理中...' : isProviderStatusLoading ? '檢查設定中...' : '開始翻譯'}
      </button>
    </form>
  );
}
