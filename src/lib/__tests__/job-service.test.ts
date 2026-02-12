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

  it('maps folder name to writable tmp path on vercel', () => {
    const originalVercel = process.env.VERCEL;

    process.env.VERCEL = '1';
    try {
      const normalized = validateOutputDirectoryPath('translated-ja');
      expect(normalized).toBe(path.join(os.tmpdir(), 'project-translate-jobs', 'outputs', 'translated-ja'));
    } finally {
      if (originalVercel === undefined) {
        delete process.env.VERCEL;
      } else {
        process.env.VERCEL = originalVercel;
      }
    }
  });

  it('rejects non-tmp absolute path on vercel', () => {
    const originalVercel = process.env.VERCEL;

    process.env.VERCEL = '1';
    try {
      expect(() => validateOutputDirectoryPath('/home/username/output')).toThrow(
        'Vercel 環境僅支援 /tmp 路徑',
      );
    } finally {
      if (originalVercel === undefined) {
        delete process.env.VERCEL;
      } else {
        process.env.VERCEL = originalVercel;
      }
    }
  });
});
