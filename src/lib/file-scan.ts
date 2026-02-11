import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  '.next',
  '.turbo',
  '.idea',
  '.vscode',
  'dist',
  'build',
]);

export async function listProjectFiles(rootPath: string, ignoredDirectories: string[] = []) {
  const ignoreSet = new Set([...DEFAULT_IGNORED_DIRECTORIES, ...ignoredDirectories]);
  const collectedFiles: string[] = [];

  async function walk(currentPath: string, relativeBase = ''): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue;
      }

      const relativePath = relativeBase
        ? path.posix.join(relativeBase, entry.name)
        : entry.name;
      const absolutePath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (ignoreSet.has(entry.name)) {
          continue;
        }

        await walk(absolutePath, relativePath);
        continue;
      }

      if (entry.isFile()) {
        collectedFiles.push(relativePath);
      }
    }
  }

  await walk(rootPath);

  return collectedFiles.sort((a, b) => a.localeCompare(b));
}

export function shouldTranslateFile(
  relativePath: string,
  allowedExtensions: string[],
  maxFileSizeBytes: number,
  fileSizeBytes: number,
) {
  const extension = path.extname(relativePath).toLowerCase();
  const allowedSet = new Set(allowedExtensions.map((item) => item.toLowerCase()));

  if (!allowedSet.has(extension)) {
    return false;
  }

  return fileSizeBytes <= maxFileSizeBytes;
}

export function isProbablyTextBuffer(buffer: Buffer) {
  if (buffer.length === 0) {
    return true;
  }

  let suspiciousByteCount = 0;
  const sampleLength = Math.min(buffer.length, 8000);

  for (let index = 0; index < sampleLength; index += 1) {
    const byte = buffer[index];
    const isControlChar = byte < 9 || (byte > 13 && byte < 32);

    if (byte === 0 || isControlChar) {
      suspiciousByteCount += 1;
    }
  }

  return suspiciousByteCount / sampleLength < 0.03;
}
