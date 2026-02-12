import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JobForm } from '@/components/job-form';

const defaultModels = {
  openai: 'gpt-4.1-mini',
  gemini: 'gemini-2.0-flash',
  local: 'local-default',
};

function createFolderFile(name: string, relativePath: string, content = 'sample') {
  const file = new File([content], name, { type: 'text/plain' });
  Object.defineProperty(file, 'webkitRelativePath', {
    configurable: true,
    value: relativePath,
  });

  return file as File & { webkitRelativePath: string };
}

describe('JobForm', () => {
  it('requires output directory path before submit', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <JobForm
        onSubmit={onSubmit}
        isSubmitting={false}
        providerStatus={{ openai: true, gemini: false, local: true }}
        defaultModels={defaultModels}
        onSaveCredentials={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('資料來源'), {
      target: { value: 'github' },
    });

    fireEvent.change(screen.getByLabelText('GitHub Repo URL'), {
      target: { value: 'https://github.com/vercel/next.js' },
    });

    fireEvent.click(screen.getByRole('button', { name: '開始翻譯' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('請輸入 output 輸出資料夾位置')).toBeInTheDocument();
  });

  it('shows default model and allows overriding model', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <JobForm
        onSubmit={onSubmit}
        isSubmitting={false}
        providerStatus={{ openai: true, gemini: true, local: true }}
        defaultModels={defaultModels}
        onSaveCredentials={vi.fn()}
      />,
    );

    expect(screen.getByText('目前預設模型：gpt-4.1-mini')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('資料來源'), {
      target: { value: 'github' },
    });

    fireEvent.change(screen.getByLabelText('GitHub Repo URL'), {
      target: { value: 'https://github.com/vercel/next.js' },
    });

    fireEvent.change(screen.getByLabelText('output 輸出資料夾位置'), {
      target: { value: '/tmp/project-translate-output' },
    });

    fireEvent.change(screen.getByRole('textbox', { name: /翻譯模型/ }), {
      target: { value: 'gpt-4o-mini' },
    });

    fireEvent.click(screen.getByRole('button', { name: '開始翻譯' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
      }),
    );
  });


  it('replaces previous folder files when a new project folder is selected', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <JobForm
        onSubmit={onSubmit}
        isSubmitting={false}
        providerStatus={{ openai: true, gemini: false, local: true }}
        defaultModels={defaultModels}
        onSaveCredentials={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('output 輸出資料夾位置'), {
      target: { value: '/tmp/project-translate-output' },
    });

    const projectFolderInput = screen
      .getByText('選取專案資料夾')
      .closest('label')
      ?.querySelector('input');

    expect(projectFolderInput).not.toBeNull();

    const projectFolderPicker = projectFolderInput as HTMLInputElement;

    fireEvent.change(projectFolderPicker, {
      target: {
        files: [
          createFolderFile('a.md', 'first-project/a.md'),
          createFolderFile('b.md', 'first-project/docs/b.md'),
        ],
      },
    });

    expect(screen.getByText('已選取 2 個檔案')).toBeInTheDocument();

    fireEvent.click(projectFolderPicker);
    expect(screen.getByText('尚未選取')).toBeInTheDocument();

    fireEvent.change(projectFolderPicker, {
      target: {
        files: [createFolderFile('readme.md', 'second-project/readme.md')],
      },
    });

    expect(screen.getByText('已選取 1 個檔案')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '開始翻譯' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0] as { files?: Array<File & { webkitRelativePath?: string }> };

    expect(payload.files).toHaveLength(1);
    expect(payload.files?.[0]?.webkitRelativePath).toBe('second-project/readme.md');
  });

  it('fills output directory by folder-picker button and shows selected path', async () => {
    const requestPermissionMock = vi.fn().mockResolvedValue('granted');
    const showDirectoryPickerMock = vi.fn().mockResolvedValue({
      name: 'project-translate-output',
      path: 'C:\\Users\\joshlin\\Desktop\\test',
      getDirectoryHandle: vi.fn(),
      getFileHandle: vi.fn(),
      requestPermission: requestPermissionMock,
    });

    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: showDirectoryPickerMock,
    });

    render(
      <JobForm
        onSubmit={vi.fn()}
        isSubmitting={false}
        providerStatus={{ openai: true, gemini: false, local: true }}
        defaultModels={defaultModels}
        onSaveCredentials={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '選擇本機資料夾' }));

    await waitFor(() => {
      expect(showDirectoryPickerMock).toHaveBeenCalledWith({ mode: 'readwrite' });
      expect(requestPermissionMock).toHaveBeenCalledWith({ mode: 'readwrite' });
      expect(screen.getByLabelText('output 輸出資料夾位置')).toHaveValue(
        'project-translate-output',
      );
      expect(screen.getByLabelText('已選擇本機位置')).toHaveValue(
        'C:\\Users\\joshlin\\Desktop\\test',
      );
    });
  });

  it('submits picked output directory handle with payload', async () => {
    const outputDirectoryHandle = {
      name: 'selected-output-folder',
      getDirectoryHandle: vi.fn(),
      getFileHandle: vi.fn(),
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };

    const showDirectoryPickerMock = vi.fn().mockResolvedValue(outputDirectoryHandle);
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: showDirectoryPickerMock,
    });

    render(
      <JobForm
        onSubmit={onSubmit}
        isSubmitting={false}
        providerStatus={{ openai: true, gemini: false, local: true }}
        defaultModels={defaultModels}
        onSaveCredentials={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('資料來源'), {
      target: { value: 'github' },
    });

    fireEvent.change(screen.getByLabelText('GitHub Repo URL'), {
      target: { value: 'https://github.com/vercel/next.js' },
    });

    fireEvent.click(screen.getByRole('button', { name: '選擇本機資料夾' }));

    await waitFor(() => {
      expect(showDirectoryPickerMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: '開始翻譯' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        outputFolder: 'selected-output-folder',
        outputDirectoryHandle,
        model: 'gpt-4.1-mini',
      }),
    );
  });

  it('submits github payload when github mode is selected', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <JobForm
        onSubmit={onSubmit}
        isSubmitting={false}
        providerStatus={{ openai: true, gemini: false, local: true }}
        defaultModels={defaultModels}
        onSaveCredentials={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('資料來源'), {
      target: { value: 'github' },
    });

    fireEvent.change(screen.getByLabelText('GitHub Repo URL'), {
      target: { value: 'https://github.com/vercel/next.js' },
    });

    fireEvent.change(screen.getByLabelText('output 輸出資料夾位置'), {
      target: { value: '/tmp/project-translate-output' },
    });

    fireEvent.click(screen.getByRole('button', { name: '開始翻譯' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: 'github',
        repoUrl: 'https://github.com/vercel/next.js',
        outputFolder: '/tmp/project-translate-output',
      }),
    );
  });

  it('supports selecting Japanese as target language', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <JobForm
        onSubmit={onSubmit}
        isSubmitting={false}
        providerStatus={{ openai: true, gemini: false, local: true }}
        defaultModels={defaultModels}
        onSaveCredentials={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('資料來源'), {
      target: { value: 'github' },
    });

    fireEvent.change(screen.getByLabelText('GitHub Repo URL'), {
      target: { value: 'https://github.com/vercel/next.js' },
    });

    fireEvent.change(screen.getByLabelText('output 輸出資料夾位置'), {
      target: { value: '/tmp/project-translate-japanese' },
    });

    fireEvent.change(screen.getByLabelText('目標語言'), {
      target: { value: 'Japanese (ja-JP)' },
    });

    fireEvent.click(screen.getByRole('button', { name: '開始翻譯' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        targetLanguage: 'Japanese (ja-JP)',
      }),
    );
  });

  it('disables submit when selected translator key is missing', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <JobForm
        onSubmit={onSubmit}
        isSubmitting={false}
        providerStatus={{ openai: false, gemini: false, local: true }}
        defaultModels={defaultModels}
        onSaveCredentials={vi.fn()}
      />,
    );

    expect(screen.getByText('OpenAI：未設定')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '開始翻譯' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/翻譯引擎/), {
      target: { value: 'local' },
    });

    expect(screen.getByRole('button', { name: '開始翻譯' })).not.toBeDisabled();
  });

  it('accepts key input fields and saves credentials', async () => {
    const onSaveCredentials = vi.fn().mockResolvedValue(undefined);

    render(
      <JobForm
        onSubmit={vi.fn()}
        isSubmitting={false}
        providerStatus={{ openai: false, gemini: false, local: true }}
        defaultModels={defaultModels}
        onSaveCredentials={onSaveCredentials}
      />,
    );

    fireEvent.change(screen.getByLabelText('OpenAI API Key'), {
      target: { value: 'sk-openai-demo' },
    });

    fireEvent.change(screen.getByLabelText('Gemini API Key'), {
      target: { value: 'sk-gemini-demo' },
    });

    fireEvent.click(screen.getByRole('button', { name: '儲存金鑰' }));

    await waitFor(() => {
      expect(onSaveCredentials).toHaveBeenCalledWith({
        openaiApiKey: 'sk-openai-demo',
        geminiApiKey: 'sk-gemini-demo',
      });
    });
  });
});
