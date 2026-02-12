import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JobStatus } from '@/components/job-status';
import type { JobPublicView } from '@/lib/jobs/types';

function createMockJob(): JobPublicView {
  return {
    id: 'job-1',
    sourceType: 'folder',
    translator: 'openai',
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
  });

  it('shows error message even when no job exists yet', () => {
    render(<JobStatus job={null} files={[]} errorMessage="建立任務失敗" />);

    expect(screen.getByText('尚未建立任務。')).toBeInTheDocument();
    expect(screen.getByText('建立任務失敗')).toBeInTheDocument();
  });
});
