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
    expect(screen.getByText('翻譯中')).toHaveClass('status-badge', 'status-running');
  });

  it('renders completed state with success badge style', () => {
    const completedJob: JobPublicView = {
      ...createMockJob(),
      status: 'completed',
      progress: {
        totalFiles: 3,
        processedFiles: 3,
        failedFiles: 0,
        currentFile: null,
      },
    };

    render(<JobStatus job={completedJob} files={[]} errorMessage={null} />);

    expect(screen.getByText('完成')).toHaveClass('status-badge', 'status-completed');
  });

  it('renders failed state with error badge style', () => {
    const failedJob: JobPublicView = {
      ...createMockJob(),
      status: 'failed',
      lastError: '翻譯程序崩潰',
    };

    render(<JobStatus job={failedJob} files={[]} errorMessage={null} />);

    expect(screen.getByText('失敗')).toHaveClass('status-badge', 'status-failed');
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

    fireEvent.click(screen.getByRole('button', { name: '停止任務' }));
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

    expect(screen.getByText('翻譯進行中，完成後將顯示輸出檔案清單。')).toBeInTheDocument();
    expect(screen.queryByText('docs/readme.md (10 位元組)')).not.toBeInTheDocument();
  });

  it('shows error message even when no job exists yet', () => {
    render(<JobStatus job={null} files={[]} errorMessage="建立任務失敗" />);

    expect(screen.getByText('目前尚未建立翻譯任務。')).toBeInTheDocument();
    expect(screen.getByText('建立任務失敗')).toBeInTheDocument();
  });
});
