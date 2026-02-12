import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JobForm } from '@/components/job-form';

describe('JobForm', () => {
  it('requires output directory path before submit', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <JobForm
        onSubmit={onSubmit}
        isSubmitting={false}
        providerStatus={{ openai: true, gemini: false, local: true }}
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

  it('fills output directory by folder-picker button', async () => {
    const showDirectoryPickerMock = vi.fn().mockResolvedValue({ name: 'project-translate-output' });

    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: showDirectoryPickerMock,
    });

    render(
      <JobForm
        onSubmit={vi.fn()}
        isSubmitting={false}
        providerStatus={{ openai: true, gemini: false, local: true }}
        onSaveCredentials={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '選擇本機資料夾' }));

    await waitFor(() => {
      expect(showDirectoryPickerMock).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText('output 輸出資料夾位置')).toHaveValue(
        'project-translate-output',
      );
    });
  });

  it('submits github payload when github mode is selected', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <JobForm
        onSubmit={onSubmit}
        isSubmitting={false}
        providerStatus={{ openai: true, gemini: false, local: true }}
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
