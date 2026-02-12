import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateOutputDirectoryPath } from '@/lib/jobs/service';

describe('validateOutputDirectoryPath', () => {
  it('accepts and normalizes output directory path', () => {
    const normalized = validateOutputDirectoryPath('./translated-ja');
    expect(normalized).toBe(path.resolve('./translated-ja'));
  });

  it('rejects empty output directory path', () => {
    expect(() => validateOutputDirectoryPath('   ')).toThrow('請輸入 output 輸出資料夾位置');
  });

  it('rejects root output directory path', () => {
    const rootPath = path.parse(process.cwd()).root;
    expect(() => validateOutputDirectoryPath(rootPath)).toThrow('output 輸出資料夾不可為根目錄');
  });

  it('expands home shorthand path', () => {
    const normalized = validateOutputDirectoryPath('~/project-translate-output');
    expect(normalized).toBe(path.join(os.homedir(), 'project-translate-output'));
  });
});
