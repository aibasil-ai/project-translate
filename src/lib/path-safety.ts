import path from 'node:path';

function isWindowsAbsolutePath(value: string) {
  return /^[a-zA-Z]:\//.test(value);
}

export function normalizeRelativePath(rawPath: string) {
  if (typeof rawPath !== 'string') {
    throw new Error('Path must be a string');
  }

  const replaced = rawPath.replace(/\\/g, '/').trim();

  if (!replaced || replaced === '.' || replaced.includes('\u0000')) {
    throw new Error('Invalid relative path');
  }

  if (replaced.startsWith('/') || isWindowsAbsolutePath(replaced)) {
    throw new Error('Absolute paths are not allowed');
  }

  const normalized = path.posix.normalize(replaced);

  if (!normalized || normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
    throw new Error('Path traversal is not allowed');
  }

  return normalized;
}

export function resolveSafePath(rootPath: string, relativePath: string) {
  const normalizedRelativePath = normalizeRelativePath(relativePath);
  const resolvedRootPath = path.resolve(rootPath);
  const resolvedPath = path.resolve(resolvedRootPath, normalizedRelativePath);

  if (resolvedPath !== resolvedRootPath && !resolvedPath.startsWith(`${resolvedRootPath}${path.sep}`)) {
    throw new Error('Resolved path escapes root directory');
  }

  return resolvedPath;
}
