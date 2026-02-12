import { describe, expect, it } from 'vitest';

import { createInMemoryJobStore } from '@/lib/jobs/store';

describe('job store', () => {
  it('creates and updates jobs', () => {
    const store = createInMemoryJobStore();

    const job = store.create({
      sourceType: 'folder',
      translator: 'local',
      model: 'local-default',
      targetLanguage: 'Traditional Chinese (zh-TW)',
      outputFolder: 'output',
      allowedExtensions: ['.md'],
      workspaceRoot: '/tmp/job-1',
      inputRoot: '/tmp/job-1/input',
      outputRoot: '/tmp/job-1/output',
      zipPath: '/tmp/job-1/output.zip',
    });

    expect(job.status).toBe('queued');
    expect(store.get(job.id)?.sourceType).toBe('folder');

    store.update(job.id, {
      status: 'running',
      progress: {
        totalFiles: 4,
        processedFiles: 1,
        failedFiles: 0,
        currentFile: 'docs/readme.md',
      },
    });

    const updated = store.get(job.id);

    expect(updated?.status).toBe('running');
    expect(updated?.progress.currentFile).toBe('docs/readme.md');
  });
});
