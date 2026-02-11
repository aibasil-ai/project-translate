import type { PipelineError, PipelineProgress } from '@/lib/jobs/pipeline';
import type { SourceType } from '@/lib/translator';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface JobProgress {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  currentFile?: string;
}

export interface JobRecord {
  id: string;
  sourceType: SourceType;
  repoUrl?: string;
  translator: string;
  targetLanguage: string;
  allowedExtensions: string[];
  workspaceRoot: string;
  inputRoot: string;
  outputRoot: string;
  zipPath: string;
  status: JobStatus;
  progress: JobProgress;
  errors: PipelineError[];
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobInput {
  id?: string;
  sourceType: SourceType;
  repoUrl?: string;
  translator: string;
  targetLanguage: string;
  allowedExtensions: string[];
  workspaceRoot: string;
  inputRoot: string;
  outputRoot: string;
  zipPath: string;
}

export interface JobPublicView {
  id: string;
  sourceType: SourceType;
  repoUrl?: string;
  translator: string;
  targetLanguage: string;
  allowedExtensions: string[];
  status: JobStatus;
  progress: JobProgress;
  errors: PipelineError[];
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  downloadUrl?: string;
  treeUrl?: string;
}

export function progressFromPipeline(progress: PipelineProgress): JobProgress {
  return {
    totalFiles: progress.totalFiles,
    processedFiles: progress.processedFiles,
    failedFiles: progress.failedFiles,
    currentFile: progress.currentFile,
  };
}
