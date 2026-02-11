import { execFile as execFileCallback } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { listProjectFiles } from '@/lib/file-scan';
import { runTranslationPipeline } from '@/lib/jobs/pipeline';
import { jobStore } from '@/lib/jobs/store';
import type { JobPublicView, JobRecord } from '@/lib/jobs/types';
import { progressFromPipeline } from '@/lib/jobs/types';
import { createZipFromDirectory } from '@/lib/jobs/zip';
import { normalizeRelativePath, resolveSafePath } from '@/lib/path-safety';
import { getTranslatorProvider } from '@/lib/translator';
import { getProviderStatusFromEnv } from '@/lib/translator/provider-status';
import { shouldIgnoreUploadPath } from '@/lib/upload-filter';

const execFile = promisify(execFileCallback);

export const DEFAULT_ALLOWED_EXTENSIONS = ['.md', '.txt', '.rst', '.adoc'];

const MAX_UPLOAD_FILE_COUNT = 3000;
const MAX_SINGLE_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_UPLOAD_BYTES = 80 * 1024 * 1024;
const MAX_TRANSLATE_FILE_BYTES = 2 * 1024 * 1024;

export class UserInputError extends Error {}

export function assertTranslatorConfiguration(translator: string) {
  const providerStatus = getProviderStatusFromEnv();

  if (translator === 'openai' && !providerStatus.openai) {
    throw new UserInputError('OPENAI_API_KEY is not configured. Please set it in .env.local or enter key in UI');
  }

  if (translator === 'gemini' && !providerStatus.gemini) {
    throw new UserInputError('GEMINI_API_KEY is not configured. Please set it in .env.local or enter key in UI');
  }
}

interface WorkspacePaths {
  root: string;
  input: string;
  output: string;
  zip: string;
}

interface FolderJobInput {
  translator: string;
  targetLanguage: string;
  allowedExtensions: string[];
  files: File[];
  paths: string[];
}

interface GithubJobInput {
  translator: string;
  targetLanguage: string;
  allowedExtensions: string[];
  repoUrl: string;
}

function getJobsBaseDirectory() {
  return process.env.JOBS_BASE_DIR ?? path.join(os.tmpdir(), 'project-translate-jobs');
}

async function prepareWorkspace(jobId: string): Promise<WorkspacePaths> {
  const root = path.join(getJobsBaseDirectory(), jobId);
  const input = path.join(root, 'input');
  const output = path.join(root, 'output');
  const zip = path.join(root, 'translated.zip');

  await fs.mkdir(input, { recursive: true });
  await fs.mkdir(output, { recursive: true });

  return { root, input, output, zip };
}

function normalizeExtension(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}

export function parseAllowedExtensions(raw: string | string[] | null | undefined) {
  const values = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(',')
      : DEFAULT_ALLOWED_EXTENSIONS;

  const normalized = values
    .map((entry) => normalizeExtension(entry))
    .filter((entry): entry is string => Boolean(entry));

  const deduplicated = Array.from(new Set(normalized));

  return deduplicated.length ? deduplicated : DEFAULT_ALLOWED_EXTENSIONS;
}

export function validatePublicGithubUrl(repoUrl: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(repoUrl);
  } catch {
    throw new UserInputError('Invalid GitHub repository URL');
  }

  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'github.com') {
    throw new UserInputError('Only public https://github.com repositories are supported');
  }

  const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
  if (pathParts.length !== 2) {
    throw new UserInputError('Repository URL must be in /owner/repo format');
  }

  const normalizedRepo = `${pathParts[0]}/${pathParts[1].replace(/\.git$/i, '')}`;
  return `https://github.com/${normalizedRepo}.git`;
}

async function stageUploadedFiles(inputRoot: string, files: File[], paths: string[]) {
  if (!files.length) {
    throw new UserInputError('No files were uploaded');
  }

  const stagedFiles: Array<{ file: File; relativePath: string }> = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const relativePath = normalizeRelativePath(paths[index] ?? file.name);

    if (shouldIgnoreUploadPath(relativePath)) {
      continue;
    }

    stagedFiles.push({ file, relativePath });
  }

  if (!stagedFiles.length) {
    throw new UserInputError('No eligible files were uploaded after filtering ignored directories');
  }

  if (stagedFiles.length > MAX_UPLOAD_FILE_COUNT) {
    throw new UserInputError(`Too many files. Maximum ${MAX_UPLOAD_FILE_COUNT} files per job`);
  }

  let totalBytes = 0;

  for (const { file, relativePath } of stagedFiles) {

    if (file.size > MAX_SINGLE_UPLOAD_BYTES) {
      throw new UserInputError(`File too large: ${relativePath}`);
    }

    totalBytes += file.size;
    if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
      throw new UserInputError('Uploaded folder is too large');
    }

    const absolutePath = resolveSafePath(inputRoot, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));
  }
}

async function cloneGithubRepoToInput(repoUrl: string, inputRoot: string) {
  const repoTargetPath = path.join(inputRoot, 'repo');

  await execFile('git', ['clone', '--depth=1', repoUrl, repoTargetPath], {
    timeout: 120_000,
    maxBuffer: 10 * 1024 * 1024,
  });

  return repoTargetPath;
}

function runJobInBackground(jobId: string) {
  void processJob(jobId);
}

async function processJob(jobId: string) {
  const job = jobStore.get(jobId);

  if (!job) {
    return;
  }

  jobStore.update(jobId, { status: 'running' });

  try {
    const translator = getTranslatorProvider(job.translator);
    const pipelineResult = await runTranslationPipeline({
      inputRoot: job.inputRoot,
      outputRoot: job.outputRoot,
      allowedExtensions: job.allowedExtensions,
      maxFileSizeBytes: MAX_TRANSLATE_FILE_BYTES,
      sourceType: job.sourceType,
      targetLanguage: job.targetLanguage,
      translate: (text, context) => translator.translate(text, context),
      onProgress: (progress) => {
        jobStore.update(jobId, {
          progress: progressFromPipeline(progress),
        });
      },
    });

    await createZipFromDirectory(job.outputRoot, job.zipPath);

    jobStore.update(jobId, {
      status: 'completed',
      errors: pipelineResult.errors,
      progress: {
        totalFiles: pipelineResult.totalFiles,
        processedFiles: pipelineResult.processedFiles,
        failedFiles: pipelineResult.failedFiles,
      },
    });
  } catch (error) {
    jobStore.update(jobId, {
      status: 'failed',
      lastError: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function createJobBaseRecord({
  jobId,
  workspace,
  translator,
  targetLanguage,
  allowedExtensions,
  sourceType,
  repoUrl,
  inputRoot,
}: {
  jobId: string;
  workspace: WorkspacePaths;
  translator: string;
  targetLanguage: string;
  allowedExtensions: string[];
  sourceType: 'folder' | 'github';
  repoUrl?: string;
  inputRoot?: string;
}) {
  return jobStore.create({
    id: jobId,
    sourceType,
    repoUrl,
    translator,
    targetLanguage,
    allowedExtensions,
    workspaceRoot: workspace.root,
    inputRoot: inputRoot ?? workspace.input,
    outputRoot: workspace.output,
    zipPath: workspace.zip,
  });
}

export async function createFolderTranslationJob(input: FolderJobInput) {
  assertTranslatorConfiguration(input.translator);

  const jobId = crypto.randomUUID();
  const workspace = await prepareWorkspace(jobId);

  await stageUploadedFiles(workspace.input, input.files, input.paths);

  const job = createJobBaseRecord({
    jobId,
    workspace,
    translator: input.translator,
    targetLanguage: input.targetLanguage,
    allowedExtensions: input.allowedExtensions,
    sourceType: 'folder',
  });

  runJobInBackground(job.id);
  return job;
}

export async function createGithubTranslationJob(input: GithubJobInput) {
  assertTranslatorConfiguration(input.translator);

  const normalizedRepoUrl = validatePublicGithubUrl(input.repoUrl);
  const jobId = crypto.randomUUID();
  const workspace = await prepareWorkspace(jobId);

  const repoRoot = await cloneGithubRepoToInput(normalizedRepoUrl, workspace.input);

  const job = createJobBaseRecord({
    jobId,
    workspace,
    translator: input.translator,
    targetLanguage: input.targetLanguage,
    allowedExtensions: input.allowedExtensions,
    sourceType: 'github',
    repoUrl: input.repoUrl,
    inputRoot: repoRoot,
  });

  runJobInBackground(job.id);
  return job;
}

export function getJobOrThrow(id: string) {
  const job = jobStore.get(id);
  if (!job) {
    throw new UserInputError('Job not found');
  }
  return job;
}

export function toPublicJobView(job: JobRecord, baseUrl?: string): JobPublicView {
  const publicJob: JobPublicView = {
    id: job.id,
    sourceType: job.sourceType,
    repoUrl: job.repoUrl,
    translator: job.translator,
    targetLanguage: job.targetLanguage,
    allowedExtensions: job.allowedExtensions,
    status: job.status,
    progress: job.progress,
    errors: job.errors,
    lastError: job.lastError,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };

  if (job.status === 'completed' && baseUrl) {
    publicJob.downloadUrl = `${baseUrl}/api/jobs/${job.id}/download`;
    publicJob.treeUrl = `${baseUrl}/api/jobs/${job.id}/tree`;
  }

  return publicJob;
}

export async function listTranslatedFiles(job: JobRecord) {
  const relativePaths = await listProjectFiles(job.outputRoot);

  return Promise.all(
    relativePaths.map(async (relativePath) => {
      const absolutePath = resolveSafePath(job.outputRoot, relativePath);
      const stat = await fs.stat(absolutePath);
      return {
        path: relativePath,
        size: stat.size,
      };
    }),
  );
}

export async function readTranslatedFile(job: JobRecord, relativePath: string) {
  const normalizedPath = normalizeRelativePath(relativePath);
  const absolutePath = resolveSafePath(job.outputRoot, normalizedPath);

  return fs.readFile(absolutePath);
}

export async function ensureJobArtifactsExist(job: JobRecord) {
  if (job.status !== 'completed') {
    throw new UserInputError('Job is not completed yet');
  }

  if (job.progress.totalFiles > 0 && job.progress.processedFiles === job.progress.failedFiles) {
    throw new UserInputError(
      'All files failed to translate. Please verify translator API key and try again.',
    );
  }

  await fs.access(job.zipPath);
}
