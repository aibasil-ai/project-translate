import crypto from 'node:crypto';

import type { CreateJobInput, JobRecord } from '@/lib/jobs/types';

export interface JobStore {
  create: (input: CreateJobInput) => JobRecord;
  update: (id: string, changes: Partial<JobRecord>) => JobRecord;
  get: (id: string) => JobRecord | undefined;
  remove: (id: string) => void;
}

const GLOBAL_STORE_KEY = '__PROJECT_TRANSLATOR_JOB_STORE__';

export function createInMemoryJobStore(): JobStore {
  const jobs = new Map<string, JobRecord>();

  return {
    create(input) {
      const now = new Date().toISOString();
      const jobId = input.id ?? crypto.randomUUID();
      const job: JobRecord = {
        id: jobId,
        sourceType: input.sourceType,
        repoUrl: input.repoUrl,
        translator: input.translator,
        model: input.model,
        targetLanguage: input.targetLanguage,
        outputFolder: input.outputFolder,
        allowedExtensions: input.allowedExtensions,
        workspaceRoot: input.workspaceRoot,
        inputRoot: input.inputRoot,
        outputRoot: input.outputRoot,
        zipPath: input.zipPath,
        status: 'queued',
        progress: {
          totalFiles: 0,
          processedFiles: 0,
          failedFiles: 0,
        },
        errors: [],
        createdAt: now,
        updatedAt: now,
      };

      jobs.set(job.id, job);
      return job;
    },
    update(id, changes) {
      const existing = jobs.get(id);

      if (!existing) {
        throw new Error(`Job ${id} not found`);
      }

      const updatedJob: JobRecord = {
        ...existing,
        ...changes,
        updatedAt: new Date().toISOString(),
      };

      jobs.set(id, updatedJob);
      return updatedJob;
    },
    get(id) {
      return jobs.get(id);
    },
    remove(id) {
      jobs.delete(id);
    },
  };
}

function getGlobalStore() {
  const globalObject = globalThis as typeof globalThis & {
    [GLOBAL_STORE_KEY]?: JobStore;
  };

  if (!globalObject[GLOBAL_STORE_KEY]) {
    globalObject[GLOBAL_STORE_KEY] = createInMemoryJobStore();
  }

  return globalObject[GLOBAL_STORE_KEY];
}

export const jobStore = getGlobalStore();
