import fs from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import archiver from 'archiver';

export async function createZipFromDirectory(sourceDirectory: string, outputZipPath: string) {
  await mkdir(path.dirname(outputZipPath), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(outputZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    output.on('error', (error) => reject(error));

    archive.on('warning', (error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }
      reject(error);
    });

    archive.on('error', (error) => reject(error));
    archive.pipe(output);
    archive.directory(sourceDirectory, false);
    void archive.finalize();
  });
}
