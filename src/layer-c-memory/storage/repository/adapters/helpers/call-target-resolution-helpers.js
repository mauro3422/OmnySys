/**
 * @fileoverview Shared helpers for canonical call target resolution.
 *
 * These helpers keep the resolver focused on orchestration and DB lookups
 * while the normalization and candidate building logic stays reusable.
 *
 * @module storage/repository/adapters/helpers/call-target-resolution-helpers
 */

import { normalizeFilePath } from '#shared/compiler/path-normalization.js';

export function normalizeComparablePath(value = '') {
  return normalizeFilePath(String(value || ''))
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

export function safeParseJsonArray(value) {
  if (!value || value === 'null' || value === 'undefined') {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function extractCalleeName(call) {
  if (typeof call === 'string') {
    return call.trim();
  }

  if (!call || typeof call !== 'object') {
    return '';
  }

  return String(call.callee || call.name || call.id || call.target || call.targetName || '').trim();
}

export function extractSourceHint(call) {
  if (!call || typeof call !== 'object') {
    return '';
  }

  return normalizeComparablePath(
    call.resolvedPath ||
    call.targetPath ||
    call.filePath ||
    call.sourcePath ||
    call.targetFile ||
    call.sourceFile ||
    ''
  );
}

function uniquePush(candidates, candidate) {
  if (!candidate) {
    return;
  }

  const normalized = String(candidate).trim();
  if (!normalized) {
    return;
  }

  if (!candidates.includes(normalized)) {
    candidates.push(normalized);
  }
}

export function buildNameCandidates(calleeName = '') {
  const candidates = [];
  const trimmed = String(calleeName || '').trim();
  if (!trimmed) {
    return candidates;
  }

  const shortName = trimmed.split('.').pop();
  uniquePush(candidates, trimmed);
  uniquePush(candidates, shortName);

  if (trimmed.includes('::')) {
    uniquePush(candidates, trimmed.split('::').pop());
  }

  return candidates;
}

export function buildIdCandidates(sourcePath, calleeName, call = {}, normalizeIdFn = (value) => value) {
  const candidates = [];
  const normalizedSourcePath = normalizeComparablePath(sourcePath);
  const nameCandidates = buildNameCandidates(calleeName);
  const sourceHint = extractSourceHint(call);

  if (calleeName.includes('::')) {
    uniquePush(candidates, normalizeIdFn(calleeName));
  }

  if (sourceHint) {
    for (const nameCandidate of nameCandidates) {
      uniquePush(candidates, normalizeIdFn(`${sourceHint}::${nameCandidate}`));
    }
  }

  for (const nameCandidate of nameCandidates) {
    uniquePush(candidates, normalizeIdFn(`${normalizedSourcePath}::${nameCandidate}`));
  }

  if (call && typeof call === 'object') {
    const explicitId = String(call.targetId || call.calleeId || call.id || '').trim();
    if (explicitId) {
      uniquePush(candidates, normalizeIdFn(explicitId));
    }
  }

  return candidates;
}

export function buildImportedPathCandidates(sourcePath, importEntry) {
  const candidates = [];
  const resolved = normalizeComparablePath(
    importEntry?.resolvedPath ||
    importEntry?.resolved ||
    importEntry?.targetPath ||
    importEntry?.source ||
    ''
  );

  if (!resolved) {
    return candidates;
  }

  const sourceDir = sourcePath.includes('/') ? sourcePath.slice(0, sourcePath.lastIndexOf('/')) : '';
  const imported = resolved.startsWith('.') || resolved.includes('/') ? resolved : `${sourceDir}/${resolved}`;
  uniquePush(candidates, normalizeComparablePath(imported));
  uniquePush(candidates, normalizeComparablePath(resolved));

  return candidates;
}

function compareAtomCandidates(sourceComparablePath, left, right) {
  const leftSameFile = normalizeComparablePath(left.file_path || '') === sourceComparablePath ? 0 : 1;
  const rightSameFile = normalizeComparablePath(right.file_path || '') === sourceComparablePath ? 0 : 1;
  if (leftSameFile !== rightSameFile) return leftSameFile - rightSameFile;

  const leftExported = left.is_exported ? 0 : 1;
  const rightExported = right.is_exported ? 0 : 1;
  if (leftExported !== rightExported) return leftExported - rightExported;

  return String(left.file_path || '').localeCompare(String(right.file_path || ''));
}

export function pickBestAtomCandidate(rows, sourceComparablePath) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const sortedRows = [...rows].sort((left, right) => compareAtomCandidates(sourceComparablePath, left, right));
  return sortedRows[0]?.id || null;
}
