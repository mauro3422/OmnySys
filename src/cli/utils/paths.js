import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(__dirname, '../../..');

export async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function resolveProjectPath(projectPath) {
  if (!projectPath) projectPath = process.cwd();
  return path.isAbsolute(projectPath)
    ? projectPath
    : path.resolve(process.cwd(), projectPath);
}

export function normalizePath(p) {
  return p.replace(/\\/g, '/');
}
