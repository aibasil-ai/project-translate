// @vitest-environment node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { listProjectFiles, shouldTranslateFile } from '@/lib/file-scan';

const tempDirs: string[] = [];

async function createTempDir() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scan-test-'));
  tempDirs.push(tempDir);
  return tempDir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('file-scan', () => {
  it('lists project files while ignoring known directories', async () => {
    const root = await createTempDir();

    await fs.mkdir(path.join(root, 'docs'), { recursive: true });
    await fs.mkdir(path.join(root, 'node_modules/pkg'), { recursive: true });
    await fs.mkdir(path.join(root, '.git/hooks'), { recursive: true });

    await fs.writeFile(path.join(root, 'docs/readme.md'), '# hello');
    await fs.writeFile(path.join(root, 'docs/guide.txt'), 'guide');
    await fs.writeFile(path.join(root, 'node_modules/pkg/ignore.md'), 'ignore');
    await fs.writeFile(path.join(root, '.git/hooks/pre-commit'), 'ignore');

    const files = await listProjectFiles(root);

    expect(files).toEqual(['docs/guide.txt', 'docs/readme.md']);
  });

  it('checks translation eligibility by extension and size', () => {
    const allowed = ['.md', '.txt'];

    expect(shouldTranslateFile('docs/readme.md', allowed, 100, 5)).toBe(true);
    expect(shouldTranslateFile('src/index.ts', allowed, 100, 5)).toBe(false);
    expect(shouldTranslateFile('docs/readme.md', allowed, 100, 200)).toBe(false);
  });
});
