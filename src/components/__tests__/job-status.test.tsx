import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JobStatus } from '@/components/job-status';
import type { JobPublicView } from '@/lib/jobs/types';

function createMockJob(): JobPublicView {
  return {
    id: 'job-1',
    sourceType: 'folder',
    translator: 'openai',
    model: 'gpt-4.1-mini',
    targetLanguage: 'Traditional Chinese (zh-TW)',
    outputFolder: 'output',
    allowedExtensions: ['.md'],
    status: 'running',
    progress: {
      totalFiles: 20,
      processedFiles: 8,
      failedFiles: 1,
      currentFile: 'docs/readme.md',
    },
    errors: [],
    createdAt: '2026-02-12T00:00:00.000Z',
    updatedAt: '2026-02-12T00:00:00.000Z',
  };
}

describe('JobStatus', () => {
  it('renders translation progress bar with percentage text', () => {
    render(<JobStatus job={createMockJob()} files={[]} errorMessage={null} />);

    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '翻譯進度' })).toBeInTheDocument();
    expect(screen.getByText('gpt-4.1-mini')).toBeInTheDocument();
  });

  it('shows stop button and triggers callback when job is running', () => {
    const onStopJob = vi.fn();

    render(
      <JobStatus
        job={createMockJob()}
        files={[]}
        errorMessage={null}
        canStopJob
        isStoppingJob={false}
        onStopJob={onStopJob}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '停止翻譯' }));
    expect(onStopJob).toHaveBeenCalledTimes(1);
  });

  it('hides translated file list while job is running', () => {
    render(
      <JobStatus
        job={createMockJob()}
        files={[{ path: 'docs/readme.md', size: 10 }]}
        errorMessage={null}
      />,
    );

    expect(screen.getByText('翻譯中，完成後才會顯示翻譯結果檔案。')).toBeInTheDocument();
    expect(screen.queryByText('docs/readme.md (10 bytes)')).not.toBeInTheDocument();
  });

  it('shows error message even when no job exists yet', () => {
    render(<JobStatus job={null} files={[]} errorMessage="建立任務失敗" />);

    expect(screen.getByText('尚未建立任務。')).toBeInTheDocument();
    expect(screen.getByText('建立任務失敗')).toBeInTheDocument();
  });
});
