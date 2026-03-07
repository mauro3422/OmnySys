/**
 * @fileoverview Canonical parity checks for mirrored metadata surfaces.
 *
 * `files` is the primary file-level surface. Support tables like `system_files`
 * are expected to mirror enough metadata richness to back file-level queries.
 * This helper lets runtime/reporting code detect when both surfaces exist but
 * their payload shape has drifted apart.
 *
 * @module shared/compiler/metadata-surface-parity
 */

import { toNumber, toRatio } from './core-utils.js';



export function getMetadataSurfaceParity(db) {
  const row = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM files) as primaryFilesTotal,
      (SELECT COUNT(*) FROM files WHERE imports_json IS NOT NULL AND imports_json != '' AND imports_json != '[]') as primaryFilesWithImports,
      (SELECT COUNT(*) FROM files WHERE exports_json IS NOT NULL AND exports_json != '' AND exports_json != '[]') as primaryFilesWithExports,
      (SELECT COUNT(*) FROM system_files) as mirroredFilesTotal,
      (SELECT COUNT(*) FROM system_files WHERE imports_json IS NOT NULL AND imports_json != '' AND imports_json != '[]') as mirroredFilesWithImports,
      (SELECT COUNT(*) FROM system_files WHERE exports_json IS NOT NULL AND exports_json != '' AND exports_json != '[]') as mirroredFilesWithExports
  `).get() || {};

  const primaryFilesTotal = toNumber(row.primaryFilesTotal);
  const primaryFilesWithImports = toNumber(row.primaryFilesWithImports);
  const primaryFilesWithExports = toNumber(row.primaryFilesWithExports);
  const mirroredFilesTotal = toNumber(row.mirroredFilesTotal);
  const mirroredFilesWithImports = toNumber(row.mirroredFilesWithImports);
  const mirroredFilesWithExports = toNumber(row.mirroredFilesWithExports);

  const fileUniverseParityRatio = toRatio(mirroredFilesTotal, primaryFilesTotal);
  const importsParityRatio = toRatio(mirroredFilesWithImports, primaryFilesWithImports);
  const exportsParityRatio = toRatio(mirroredFilesWithExports, primaryFilesWithExports);

  const issues = [];
  if (primaryFilesTotal > 0 && fileUniverseParityRatio < 0.9) {
    issues.push('mirrored file universe lags behind the primary files table');
  }
  if (primaryFilesWithImports > 0 && importsParityRatio < 0.5) {
    issues.push('mirrored import telemetry is much sparser than the primary files table');
  }
  if (primaryFilesWithExports > 0 && exportsParityRatio < 0.5) {
    issues.push('mirrored export telemetry is much sparser than the primary files table');
  }

  return {
    primaryFilesTotal,
    primaryFilesWithImports,
    primaryFilesWithExports,
    mirroredFilesTotal,
    mirroredFilesWithImports,
    mirroredFilesWithExports,
    fileUniverseParityRatio,
    importsParityRatio,
    exportsParityRatio,
    healthy: issues.length === 0,
    issues
  };
}
