/**
 * @fileoverview Alert-orphan helpers for watcher issue storage.
 *
 * @module shared/compiler/watcher-issue-storage-alerts
 */

import { normalizeWatcherIssueFilePath } from './watcher-issue-storage-paths.js';

function collectReferencedAtomIds(alert = {}) {
  const context = (alert?.context && typeof alert.context === 'object') ? alert.context : {};
  const candidates = [
    context.atomId,
    ...(Array.isArray(context.changedAtomIds) ? context.changedAtomIds : []),
    ...(Array.isArray(context.cyclePath) ? context.cyclePath : [])
  ];

  return [...new Set(
    candidates
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .filter((value) => value.includes('::'))
  )];
}

function collectReferencedSymbols(alert = {}) {
  const context = (alert?.context && typeof alert.context === 'object') ? alert.context : {};
  const findings = Array.isArray(context.findings) ? context.findings : [];
  const symbols = findings
    .map((finding) => String(finding?.symbol || '').trim())
    .filter(Boolean);

  return [...new Set(symbols)];
}

function loadLiveFileSymbols(db, relativePath) {
  if (!db || !relativePath) {
    return [];
  }

  const rows = db.prepare(`
    SELECT DISTINCT name
    FROM atoms
    WHERE file_path = ?
      AND (is_removed IS NULL OR is_removed = 0)
  `).all(relativePath);

  return rows
    .map((row) => String(row?.name || '').trim())
    .filter(Boolean);
}

export function findOrphanedWatcherAlertIds(db, alerts = []) {
  if (!db) return [];

  const orphanedIds = [];
  const atomExistenceStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM atoms
    WHERE id = ?
  `);

  for (const alert of alerts) {
    const id = alert?.id;
    if (!Number.isInteger(id)) continue;

    const referencedAtomIds = collectReferencedAtomIds(alert);
    if (referencedAtomIds.length === 0) {
      continue;
    }

    const hasAnyReferencedAtom = referencedAtomIds.some((atomId) => {
      const row = atomExistenceStmt.get(atomId);
      return Number(row?.count || 0) > 0;
    });

    if (!hasAnyReferencedAtom) {
      orphanedIds.push(id);
    }
  }

  return orphanedIds;
}

export function collectWatcherAlertReferencedSymbols(alert = {}) {
  return collectReferencedSymbols(alert);
}

export function loadWatcherLiveFileSymbols(db, relativePath) {
  return loadLiveFileSymbols(db, relativePath);
}

export function normalizeWatcherAlertPath(projectPath, filePath) {
  return normalizeWatcherIssueFilePath(projectPath, filePath);
}
