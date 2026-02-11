import { describe, expect, it } from 'vitest';

import { partitionUploadFiles } from '@/lib/upload-filter';

function makeFile(path: string, size = 10) {
  return {
    name: path.split('/').pop() ?? path,
    size,
    webkitRelativePath: path,
  } as File;
}

describe('upload filter', () => {
  it('skips files under ignored directories and keeps normal docs', () => {
    const files = [
      makeFile('docs/readme.md'),
      makeFile('node_modules/pkg/index.js'),
      makeFile('.git/config'),
      makeFile('.next/server/chunk.js'),
      makeFile('src/guide.txt'),
    ];

    const result = partitionUploadFiles(files);

    expect(result.accepted.map((item) => item.path)).toEqual(['docs/readme.md', 'src/guide.txt']);
    expect(result.skipped.map((item) => item.path)).toEqual([
      'node_modules/pkg/index.js',
      '.git/config',
      '.next/server/chunk.js',
    ]);
  });
});
