import fs from 'fs/promises';
import path from 'path';

export function normalizeMutationPath(filePath = '') {
  return String(filePath || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

export function collectUniquePaths(paths = []) {
  return Array.from(
    new Set(
      (Array.isArray(paths) ? paths : [paths])
        .map((filePath) => normalizeMutationPath(filePath))
        .filter(Boolean)
    )
  );
}

export async function inspectDiskPresence(projectPath, filePath) {
  const absolutePath = path.resolve(projectPath, filePath);

  try {
    await fs.access(absolutePath);
    return { exists: true, absolutePath };
  } catch {
    return { exists: false, absolutePath };
  }
}
