const IGNORED_DIRECTORY_SEGMENTS = new Set([
  '.git',
  'node_modules',
  '.next',
  '.turbo',
  'dist',
  'build',
]);

function normalizePathSeparators(input: string) {
  return input.replace(/\\/g, '/').replace(/^\/+/, '').trim();
}

export function getUploadRelativePath(file: File) {
  const fileWithPath = file as File & { webkitRelativePath?: string };
  return normalizePathSeparators(fileWithPath.webkitRelativePath || file.name);
}

export function shouldIgnoreUploadPath(relativePath: string) {
  const normalizedPath = normalizePathSeparators(relativePath);
  if (!normalizedPath) {
    return true;
  }

  const segments = normalizedPath.split('/').filter(Boolean);
  return segments.some((segment) => IGNORED_DIRECTORY_SEGMENTS.has(segment));
}

export interface UploadFileEntry {
  file: File;
  path: string;
}

export interface UploadPartitionResult {
  accepted: UploadFileEntry[];
  skipped: UploadFileEntry[];
}

export function partitionUploadFiles(files: File[]): UploadPartitionResult {
  const accepted: UploadFileEntry[] = [];
  const skipped: UploadFileEntry[] = [];

  for (const file of files) {
    const path = getUploadRelativePath(file);
    const entry = { file, path };

    if (shouldIgnoreUploadPath(path)) {
      skipped.push(entry);
      continue;
    }

    accepted.push(entry);
  }

  return { accepted, skipped };
}
