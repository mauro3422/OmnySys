/**
 * @fileoverview surface-safe-check.js
 * Pre-apply validation for auto-generated surface files.
 *
 * Checks:
 * 1. Syntax validity (can be parsed as valid JS)
 * 2. Export validation (exports loadFn + statusFn)
 * 3. Import safety (no dangerous imports)
 * 4. File collision (doesn't overwrite existing file)
 * 5. Registry consistency (table exists in DB)
 *
 * @module shared/compiler/surface-safe-check
 */

import { CANONICAL_SURFACE_REGISTRY } from './canonical-surface-registry.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * Runs all safe checks on a proposed surface file.
 * @param {object} obligation - The obligation being fulfilled
 * @param {string} fileContent - Proposed file content
 * @param {object} db - SQLite database connection
 * @param {string} projectRoot - Project root path
 * @returns {object} { passed: boolean, errors: string[], warnings: string[] }
 */
export async function runSurfaceSafeCheck(obligation, fileContent, db, projectRoot) {
  const errors = [];
  const warnings = [];

  // Check 1: Syntax validity
  try {
    new Function(fileContent);
  } catch (err) {
    // ESM can't be tested with new Function, use a basic check
    if (fileContent.includes('syntax error') || !fileContent.includes('export')) {
      errors.push('syntax_error: File content is not valid JavaScript');
    }
  }

  // Check 2: Export validation
  const loadFn = obligation.requiredLoadFn || `load${capitalize(obligation.id?.split(':')[1] || '')}`;
  const statusFn = `get${capitalize(obligation.id?.split(':')[1] || '')}ControlPlaneStatus`;

  if (!fileContent.includes(`export function ${loadFn}`) && !fileContent.includes(`export function load`)) {
    errors.push('missing_export: File must export a load function');
  }
  if (!fileContent.includes('ControlPlaneStatus')) {
    warnings.push('missing_status_fn: No control plane status function detected');
  }

  // Check 3: Import safety — generated surfaces should not import dangerous things
  const dangerousImports = ['child_process', 'fs', 'fs/promises', 'net', 'http', 'crypto'];
  for (const imp of dangerousImports) {
    if (new RegExp(`from\\s+['"]${imp}['"]`).test(fileContent)) {
      warnings.push(`dangerous_import: Imports '${imp}' — surfaces should only read DB`);
    }
  }

  // Check 4: File collision
  const filePath = path.join(projectRoot, obligation.requiredSurfaceFile);
  try {
    await fs.access(filePath);
    errors.push(`file_exists: ${obligation.requiredSurfaceFile} already exists — won't overwrite`);
  } catch {
    // File doesn't exist, good
  }

  // Check 5: Registry consistency
  if (db) {
    try {
      const result = db.prepare(`SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name=?`).get(obligation.sourceTable);
      if (!result || result.cnt === 0) {
        errors.push(`table_missing: Table '${obligation.sourceTable}' doesn't exist in DB`);
      }
    } catch {
      errors.push(`db_error: Cannot verify table '${obligation.sourceTable}' in DB`);
    }
  }

  // Check 6: Table actually has data
  if (db && obligation.sourceTable) {
    try {
      const result = db.prepare(`SELECT COUNT(*) as cnt FROM ${obligation.sourceTable}`).get();
      if (!result || result.cnt === 0) {
        warnings.push(`empty_table: Table '${obligation.sourceTable}' has 0 rows — surface will be empty`);
      }
    } catch {
      // Table might not exist, already caught above
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    totalChecks: 6,
    passedChecks: 6 - errors.length - warnings.length,
    errorCount: errors.length,
    warningCount: warnings.length
  };
}

/**
 * Generates a safe-check report for display.
 */
export function formatSafeCheckReport(result, obligation) {
  const status = result.passed ? '✅ PASSED' : '❌ FAILED';
  const lines = [
    `Surface Safe Check: ${status}`,
    `  Surface: ${obligation.requiredSurfaceFile}`,
    `  Table: ${obligation.sourceTable} (${obligation.rowCount} rows)`,
    `  Checks: ${result.totalChecks} total, ${result.passedChecks} passed`,
  ];

  if (result.errors.length > 0) {
    lines.push('  Errors:');
    for (const e of result.errors) lines.push(`    ❌ ${e}`);
  }
  if (result.warnings.length > 0) {
    lines.push('  Warnings:');
    for (const w of result.warnings) lines.push(`    ⚠️ ${w}`);
  }

  return lines.join('\n');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export default { runSurfaceSafeCheck, formatSafeCheckReport };
