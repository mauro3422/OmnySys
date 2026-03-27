/**
 * @fileoverview Classification helpers for system-file repair coverage.
 *
 * @module shared/compiler/metadata-extraction-coverage-repair-system-files-classification
 */

import { normalizeDbPath } from './metadata-extraction-coverage-repair-shared.js';

const CULTURE_ROLES = {
  entrypoint: 'System entry point (CLI, server, main)',
  gatekeeper: 'Organizes module exports',
  laws: 'Defines constants/templates that condition the system',
  auditor: 'Observes and validates production atoms',
  script: 'Automates maintenance tasks',
  citizen: 'Productive business logic',
  unknown: 'Unclassified'
};

export function isEntryPointPath(filePath = '') {
  const normalized = normalizeDbPath(filePath).toLowerCase();
  if (!normalized) return false;

  const fileName = normalized.split('/').pop();
  const rootEntryPoints = new Set(['main.js', 'main.mjs', 'index.js', 'server.js', 'app.js', 'omny.js', 'omnysystem.js', 'cli.js']);
  const isRootFile = !normalized.includes('/') || normalized.indexOf('/') === normalized.lastIndexOf('/');

  if (isRootFile && rootEntryPoints.has(fileName)) {
    return true;
  }

  return /^src\/(cli|server|app|main|index)\.js$/.test(normalized) || /^bin\//.test(normalized);
}

export function isTestPath(filePath = '') {
  const normalized = normalizeDbPath(filePath).toLowerCase();
  return (
    normalized.includes('.test.') ||
    normalized.includes('.spec.') ||
    normalized.includes('/test/') ||
    normalized.includes('/tests/') ||
    normalized.includes('/__tests__/')
  );
}

export function isScriptPath(filePath = '') {
  const normalized = normalizeDbPath(filePath).toLowerCase();
  return /^scripts?\//.test(normalized);
}

export function classifySystemFileCulture(filePath, definitions = [], exports = []) {
  if (isEntryPointPath(filePath)) {
    return 'entrypoint';
  }

  if (isTestPath(filePath)) {
    return 'auditor';
  }

  if (definitions.length === 0 && Array.isArray(exports) && exports.length > 0 && normalizeDbPath(filePath).endsWith('index.js')) {
    return 'gatekeeper';
  }

  if (definitions.length === 0 && Array.isArray(exports) && exports.length > 0) {
    return 'laws';
  }

  if (isScriptPath(filePath) && definitions.length > 0) {
    return 'script';
  }

  if (definitions.length > 0) {
    return 'citizen';
  }

  return 'unknown';
}

export function cultureRoleForCulture(culture) {
  return CULTURE_ROLES[culture] || CULTURE_ROLES.unknown;
}
