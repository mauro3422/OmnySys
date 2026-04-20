import { resolve } from 'path';

export function normalizeProjectPath(projectPath = process.cwd()) {
  return resolve(String(projectPath || process.cwd())).replace(/\\/g, '/');
}

