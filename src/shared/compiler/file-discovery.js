/**
 * @fileoverview file-discovery.js
 *
 * Entry points canonicos para discovery de archivos del compilador.
 * Reutiliza el scanner base del proyecto para evitar reimplementar
 * caminatas manuales del filesystem en MCP/runtime.
 *
 * @module shared/compiler/file-discovery
 */

import path from 'path';
import { scanProject } from '../../layer-a-static/scanner.js';

export const COMPILER_TARGET_DIRS = [
  'src/core/file-watcher',
  'src/layer-c-memory/mcp',
  'src/layer-c-memory/query'
];

const JS_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);

function normalizeCompilerPath(filePath = '') {
  return filePath.replace(/\\/g, '/');
}

export function isJavaScriptRuntimeFile(filePath = '') {
  return JS_EXTENSIONS.has(path.extname(filePath));
}

export function isCompilerRuntimeFile(filePath = '', targetDirs = COMPILER_TARGET_DIRS) {
  const normalized = normalizeCompilerPath(filePath);
  if (!isJavaScriptRuntimeFile(normalized)) return false;
  if (normalized.includes('/tests/')) return false;
  if (normalized.includes('/__tests__/')) return false;
  return targetDirs.some((dir) => normalized.startsWith(`${dir}/`));
}

export async function discoverProjectSourceFiles(rootPath, options = {}) {
  const {
    includePatterns = [],
    excludePatterns = [],
    readAverIgnore = true
  } = options;

  return scanProject(rootPath, {
    includePatterns,
    excludePatterns,
    returnAbsolute: false,
    readAverIgnore
  });
}

export async function discoverCompilerFiles(rootPath, options = {}) {
  const {
    targetDirs = COMPILER_TARGET_DIRS,
    readAverIgnore = false
  } = options;

  const files = await discoverProjectSourceFiles(rootPath, { readAverIgnore });
  return files.filter((filePath) => isCompilerRuntimeFile(filePath, targetDirs));
}
