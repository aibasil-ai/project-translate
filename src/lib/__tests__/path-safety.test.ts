// @vitest-environment node

import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { normalizeRelativePath, resolveSafePath } from '@/lib/path-safety';

describe('path-safety', () => {
  it('normalizes safe relative paths', () => {
    expect(normalizeRelativePath('docs/readme.md')).toBe('docs/readme.md');
    expect(normalizeRelativePath('docs\\guide.txt')).toBe('docs/guide.txt');
  });

  it('rejects unsafe relative paths', () => {
    expect(() => normalizeRelativePath('../secret.txt')).toThrow();
    expect(() => normalizeRelativePath('/etc/passwd')).toThrow();
    expect(() => normalizeRelativePath('')).toThrow();
    expect(() => normalizeRelativePath('.')).toThrow();
  });

  it('resolves paths inside root only', () => {
    const root = path.join(process.cwd(), 'tmp-root');
    const safe = resolveSafePath(root, 'docs/readme.md');
    expect(safe.startsWith(root)).toBe(true);

    expect(() => resolveSafePath(root, '../escape.md')).toThrow();
  });
});
