'use client';

import { ChangeEvent, FormEvent, MouseEvent, useEffect, useMemo, useRef, useState } from 'react';

import {
  fallbackProviderDefaultModels,
  missingProviderHint,
  type ProviderDefaultModelMap,
  type ProviderStatusMap,
} from '@/lib/translator/provider-status';

export type SourceType = 'folder' | 'github';

export interface OutputFileWritable {
  write: (data: string | Blob | ArrayBuffer | Uint8Array) => Promise<void>;
  close: () => Promise<void>;
}

export interface OutputFileHandle {
  createWritable: () => Promise<OutputFileWritable>;
}

export type OutputPermissionMode = 'read' | 'readwrite';

export type OutputPermissionState = 'granted' | 'denied' | 'prompt';

export interface OutputDirectoryHandle {
  name: string;
  path?: string;
  fullPath?: string;
  getDirectoryHandle: (
    name: string,
    options?: {
      create?: boolean;
    },
  ) => Promise<OutputDirectoryHandle>;
  getFileHandle: (
    name: string,
    options?: {
      create?: boolean;
    },
  ) => Promise<OutputFileHandle>;
  queryPermission?: (options?: { mode?: OutputPermissionMode }) => Promise<OutputPermissionState>;
  requestPermission?: (options?: { mode?: OutputPermissionMode }) => Promise<OutputPermissionState>;
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: { mode?: OutputPermissionMode }) => Promise<OutputDirectoryHandle>;
};

export interface JobFormPayload {
  sourceType: SourceType;
  translator: keyof ProviderStatusMap;
  model: string;
  targetLanguage: string;
  outputFolder: string;
  outputDirectoryHandle?: OutputDirectoryHandle | null;
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
  defaultModels?: ProviderDefaultModelMap;
  isProviderStatusLoading?: boolean;
  onSubmit: (payload: JobFormPayload) => void | Promise<void>;
  onSaveCredentials: (payload: CredentialPayload) => void | Promise<void>;
}

const providerLabelMap: Record<keyof ProviderStatusMap, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  local: 'Local Adapter',
};

const targetLanguageOptions = [
  { label: '繁體中文 (zh-TW)', value: 'Traditional Chinese (zh-TW)' },
  { label: '日語 (ja-JP)', value: 'Japanese (ja-JP)' },
  { label: '英語 (en-US)', value: 'English (en-US)' },
];

function resolveDirectoryDisplayPath(directoryHandle: OutputDirectoryHandle) {
  const fullPath = directoryHandle.fullPath?.trim();
  if (fullPath) {
    return { displayPath: fullPath, isFullPath: true };
  }

  const path = directoryHandle.path?.trim();
  if (path) {
    return { displayPath: path, isFullPath: true };
  }

  return { displayPath: directoryHandle.name, isFullPath: false };
}

export function JobForm({
  isSubmitting,
  helperMessage,
  providerStatus,
  defaultModels = fallbackProviderDefaultModels,
  isProviderStatusLoading = false,
  onSubmit,
  onSaveCredentials,
}: JobFormProps) {
  const [sourceType, setSourceType] = useState<SourceType>('folder');
  const [translator, setTranslator] = useState<keyof ProviderStatusMap>('openai');
  const [model, setModel] = useState(defaultModels.openai);
  const [isModelCustomized, setIsModelCustomized] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('Traditional Chinese (zh-TW)');
  const [outputFolder, setOutputFolder] = useState('');
  const [outputDisplayPath, setOutputDisplayPath] = useState('');
  const [isOutputPathLimited, setIsOutputPathLimited] = useState(false);
  const [outputDirectoryHandle, setOutputDirectoryHandle] = useState<OutputDirectoryHandle | null>(
    null,
  );
  const [allowedExtensions, setAllowedExtensions] = useState('.md,.txt,.rst,.adoc');
  const [repoUrl, setRepoUrl] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [validationMessage, setValidationMessage] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [credentialMessage, setCredentialMessage] = useState('');
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [isPickingOutputFolder, setIsPickingOutputFolder] = useState(false);

  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  useEffect(() => {
    setModel(defaultModels[translator]);
    setIsModelCustomized(false);
  }, [translator]);

  useEffect(() => {
    if (!isModelCustomized) {
      setModel(defaultModels[translator]);
    }
  }, [defaultModels, translator, isModelCustomized]);

  const isSelectedProviderReady = providerStatus[translator];
  const providerBlockingMessage = useMemo(() => {
    if (isProviderStatusLoading || isSelectedProviderReady) {
      return null;
    }

    return missingProviderHint(translator);
  }, [isProviderStatusLoading, isSelectedProviderReady, translator]);

  const submitDisabled =
    isSubmitting ||
    isProviderStatusLoading ||
    isSavingCredentials ||
    isPickingOutputFolder ||
    !isSelectedProviderReady;

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

  async function handlePickOutputFolder() {
    setValidationMessage('');

    const directoryPickerWindow = window as DirectoryPickerWindow;
    if (!directoryPickerWindow.showDirectoryPicker) {
      setValidationMessage('目前瀏覽器不支援資料夾選擇，請手動輸入路徑');
      return;
    }

    try {
      setIsPickingOutputFolder(true);
      const directoryHandle = await directoryPickerWindow.showDirectoryPicker({ mode: 'readwrite' });

      if (directoryHandle.requestPermission) {
        const permissionState = await directoryHandle.requestPermission({ mode: 'readwrite' });

        if (permissionState !== 'granted') {
          setOutputFolder('');
          setOutputDisplayPath('');
          setIsOutputPathLimited(false);
          setOutputDirectoryHandle(null);
          setValidationMessage('需要允許 output 資料夾寫入權限，請重新選擇並允許。');
          return;
        }
      }

      const { displayPath, isFullPath } = resolveDirectoryDisplayPath(directoryHandle);

      setOutputFolder(directoryHandle.name);
      setOutputDisplayPath(displayPath);
      setIsOutputPathLimited(!isFullPath);
      setOutputDirectoryHandle(directoryHandle);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setValidationMessage(error instanceof Error ? error.message : '選擇 output 資料夾失敗');
    } finally {
      setIsPickingOutputFolder(false);
    }
  }

  function handleProjectFolderInputClick(event: MouseEvent<HTMLInputElement>) {
    event.currentTarget.value = '';
    setFiles([]);
  }

  function handleProjectFolderChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    setFiles(nextFiles);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationMessage('');

    if (!isSelectedProviderReady) {
      setValidationMessage(missingProviderHint(translator) ?? '翻譯引擎尚未就緒');
      return;
    }

    if (!outputFolder.trim()) {
      setValidationMessage('請輸入 output 輸出資料夾位置');
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

    const selectedModel = model.trim() || defaultModels[translator];

    void onSubmit({
      sourceType,
      translator,
      model: selectedModel,
      targetLanguage,
      outputFolder: outputFolder.trim(),
      outputDirectoryHandle,
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

      <label className="field" htmlFor="model">
        <span>翻譯模型</span>
        <div className="inline-actions">
          <input
            id="model"
            value={model}
            onChange={(event) => {
              setModel(event.target.value);
              setIsModelCustomized(true);
            }}
            placeholder={defaultModels[translator]}
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => {
              setModel(defaultModels[translator]);
              setIsModelCustomized(false);
            }}
            disabled={isSubmitting}
          >
            套用預設
          </button>
        </div>
        <small className="hint">目前預設模型：{defaultModels[translator]}</small>
      </label>

      <label className="field" htmlFor="targetLanguage">
        <span>目標語言</span>
        <select
          id="targetLanguage"
          value={targetLanguage}
          onChange={(event) => setTargetLanguage(event.target.value)}
          disabled={isSubmitting}
        >
          {targetLanguageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field" htmlFor="outputFolder">
        <span>output 輸出資料夾位置</span>
        <div className="inline-actions">
          <input
            id="outputFolder"
            value={outputFolder}
            onChange={(event) => {
              setOutputFolder(event.target.value);
              setOutputDisplayPath(event.target.value);
              setIsOutputPathLimited(false);
              setOutputDirectoryHandle(null);
            }}
            placeholder="例如：/home/username/project-translate-output"
            disabled={isSubmitting || isPickingOutputFolder}
          />
          <button
            type="button"
            onClick={() => {
              void handlePickOutputFolder();
            }}
            disabled={isSubmitting || isPickingOutputFolder}
          >
            {isPickingOutputFolder ? '選擇中...' : '選擇本機資料夾'}
          </button>
        </div>
      </label>

      <label className="field" htmlFor="selectedOutputPath">
        <span>已選擇本機位置</span>
        <input
          id="selectedOutputPath"
          value={outputDisplayPath}
          readOnly
          placeholder="尚未選擇本機資料夾"
          title={outputDisplayPath}
        />
        {isOutputPathLimited ? (
          <small className="hint">
            瀏覽器安全限制通常只會提供資料夾名稱；若要顯示完整路徑，請手動貼到上方輸入欄位。
          </small>
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
            onClick={handleProjectFolderInputClick}
            onChange={handleProjectFolderChange}
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
