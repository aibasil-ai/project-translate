import fs from 'node:fs/promises';
import path from 'node:path';

import { isProbablyTextBuffer, listProjectFiles, shouldTranslateFile } from '@/lib/file-scan';
import { resolveSafePath } from '@/lib/path-safety';
import type { TranslateContext } from '@/lib/translator';

export interface PipelineProgress {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  currentFile: string;
}

export interface PipelineError {
  relativePath: string;
  message: string;
}

export interface PipelineResult {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  errors: PipelineError[];
}

export interface TranslationPipelineOptions {
  inputRoot: string;
  outputRoot: string;
  allowedExtensions: string[];
  maxFileSizeBytes: number;
  translate: (text: string, context: TranslateContext) => Promise<string>;
  onProgress: (progress: PipelineProgress) => void | Promise<void>;
  sourceType?: 'folder' | 'github';
  targetLanguage?: string;
  model?: string;
  signal?: AbortSignal;
}

export class PipelineCancelledError extends Error {
  constructor(message = 'Translation pipeline cancelled') {
    super(message);
    this.name = 'PipelineCancelledError';
  }
}

function isAbortError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === 'AbortError' || error.message.toLowerCase().includes('abort');
}

function throwIfCancelled(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new PipelineCancelledError('Translation was cancelled by user');
  }
}

export async function runTranslationPipeline(options: TranslationPipelineOptions): Promise<PipelineResult> {
  const {
    inputRoot,
    outputRoot,
    allowedExtensions,
    maxFileSizeBytes,
    translate,
    onProgress,
    sourceType = 'folder',
    targetLanguage = 'Traditional Chinese (zh-TW)',
    model,
    signal,
  } = options;

  await fs.mkdir(outputRoot, { recursive: true });

  const files = await listProjectFiles(inputRoot);
  const errors: PipelineError[] = [];
  let processedFiles = 0;
  let failedFiles = 0;

  for (const relativePath of files) {
    throwIfCancelled(signal);

    const sourcePath = resolveSafePath(inputRoot, relativePath);
    const targetPath = resolveSafePath(outputRoot, relativePath);

    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    try {
      const fileBuffer = await fs.readFile(sourcePath);
      const shouldTranslate = shouldTranslateFile(
        relativePath,
        allowedExtensions,
        maxFileSizeBytes,
        fileBuffer.byteLength,
      );

      if (shouldTranslate && isProbablyTextBuffer(fileBuffer)) {
        const translated = await translate(fileBuffer.toString('utf8'), {
          relativePath,
          sourceType,
          targetLanguage,
          model,
          signal,
        });

        await fs.writeFile(targetPath, translated, 'utf8');
      } else {
        await fs.copyFile(sourcePath, targetPath);
      }
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) {
        throw new PipelineCancelledError('Translation was cancelled by user');
      }

      failedFiles += 1;
      errors.push({
        relativePath,
        message: error instanceof Error ? error.message : 'Unknown translation error',
      });
      await fs.copyFile(sourcePath, targetPath);
    }

    processedFiles += 1;
    throwIfCancelled(signal);

    await onProgress({
      totalFiles: files.length,
      processedFiles,
      failedFiles,
      currentFile: relativePath,
    });
  }

  return {
    totalFiles: files.length,
    processedFiles,
    failedFiles,
    errors,
  };
}
