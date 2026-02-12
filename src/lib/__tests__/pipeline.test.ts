// @vitest-environment node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { PipelineCancelledError, runTranslationPipeline } from '@/lib/jobs/pipeline';

const tempDirs: string[] = [];

async function createTempDir() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pipeline-test-'));
  tempDirs.push(tempDir);
  return tempDir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('translation pipeline', () => {
  it('translates allowed files and preserves input files', async () => {
    const root = await createTempDir();
    const inputRoot = path.join(root, 'input');
    const outputRoot = path.join(root, 'output');

    await fs.mkdir(path.join(inputRoot, 'docs'), { recursive: true });
    await fs.mkdir(path.join(inputRoot, 'src'), { recursive: true });

    await fs.writeFile(path.join(inputRoot, 'docs/readme.md'), 'Hello world');
    await fs.writeFile(path.join(inputRoot, 'src/index.ts'), 'const a = 1;');

    const result = await runTranslationPipeline({
      inputRoot,
      outputRoot,
      allowedExtensions: ['.md', '.txt'],
      maxFileSizeBytes: 100_000,
      translate: async (text) => `繁中:${text}`,
      onProgress: () => undefined,
    });

    const translated = await fs.readFile(path.join(outputRoot, 'docs/readme.md'), 'utf8');
    const copied = await fs.readFile(path.join(outputRoot, 'src/index.ts'), 'utf8');
    const original = await fs.readFile(path.join(inputRoot, 'docs/readme.md'), 'utf8');

    expect(result.totalFiles).toBe(2);
    expect(result.failedFiles).toBe(0);
    expect(translated).toBe('繁中:Hello world');
    expect(copied).toBe('const a = 1;');
    expect(original).toBe('Hello world');
  });

  it('continues processing when a file translation fails', async () => {
    const root = await createTempDir();
    const inputRoot = path.join(root, 'input');
    const outputRoot = path.join(root, 'output');

    await fs.mkdir(path.join(inputRoot, 'docs'), { recursive: true });

    await fs.writeFile(path.join(inputRoot, 'docs/ok.md'), 'ok');
    await fs.writeFile(path.join(inputRoot, 'docs/fail.md'), 'bad');

    const result = await runTranslationPipeline({
      inputRoot,
      outputRoot,
      allowedExtensions: ['.md'],
      maxFileSizeBytes: 100_000,
      translate: async (text, context) => {
        if (context.relativePath.endsWith('fail.md')) {
          throw new Error('boom');
        }
        return `繁中:${text}`;
      },
      onProgress: () => undefined,
    });

    const ok = await fs.readFile(path.join(outputRoot, 'docs/ok.md'), 'utf8');
    const failed = await fs.readFile(path.join(outputRoot, 'docs/fail.md'), 'utf8');

    expect(result.totalFiles).toBe(2);
    expect(result.failedFiles).toBe(1);
    expect(ok).toBe('繁中:ok');
    expect(failed).toBe('bad');
    expect(result.errors[0]?.relativePath).toBe('docs/fail.md');
  });

  it('throws PipelineCancelledError when signal aborted', async () => {
    const root = await createTempDir();
    const inputRoot = path.join(root, 'input');
    const outputRoot = path.join(root, 'output');

    await fs.mkdir(path.join(inputRoot, 'docs'), { recursive: true });
    await fs.writeFile(path.join(inputRoot, 'docs/a.md'), 'a');
    await fs.writeFile(path.join(inputRoot, 'docs/b.md'), 'b');

    const abortController = new AbortController();

    await expect(
      runTranslationPipeline({
        inputRoot,
        outputRoot,
        allowedExtensions: ['.md'],
        maxFileSizeBytes: 100_000,
        signal: abortController.signal,
        translate: async (text, context) => {
          abortController.abort();
          return `繁中:${text}:${context.model ?? 'no-model'}`;
        },
        onProgress: () => undefined,
      }),
    ).rejects.toBeInstanceOf(PipelineCancelledError);
  });
});
