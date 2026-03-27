/**
 * @fileoverview Repair helpers for persisted system-map tables.
 *
 * Rebuilds mirrored support tables from the primary DB surfaces when they go
 * stale or disappear after a failed reanalysis.
 *
 * @module shared/compiler/system-map-persistence-repair
 */

import { getSystemMapPersistenceCoverage } from './system-map-persistence.js';
import { getSemanticSurfaceGranularity } from './semantic-surface-granularity.js';
import { repairFromSystemFileDependsOn } from './system-map-persistence-repair-dependencies.js';
import {
  repairFromPrimaryFiles,
  repairSemanticConnectionsFromAtoms
} from './system-map-persistence-repair-core.js';

export function repairSystemMapPersistenceCoverage(db) {
  const initialCoverage = getSystemMapPersistenceCoverage(db);
  const semanticSurface = getSemanticSurfaceGranularity(db);

  const shouldRepairSemanticSurface = semanticSurface.materiallyDrifting === true && (semanticSurface.atomLevel?.total || 0) > 0;

  if (initialCoverage.healthy === true && shouldRepairSemanticSurface === false) {
    return { repaired: false, inserted: 0, sources: 0, dependencies: 0, semanticConnections: 0 };
  }

  const shouldRepairFromPrimaryFiles =
    initialCoverage.systemFilesTotal === 0 ||
    initialCoverage.systemFilesWithImports === 0 ||
    initialCoverage.fileDependenciesTotal === 0 ||
    (initialCoverage.activeFiles > 0 && initialCoverage.systemFilesTotal < Math.floor(initialCoverage.activeFiles * 0.9)) ||
    (initialCoverage.primaryFilesWithImports > 0 && initialCoverage.mirroredImportCoverageRatio < 0.5) ||
    (initialCoverage.primaryFilesWithImports > 0 && initialCoverage.dependencySourceCoverageRatio < 0.5);

  if (shouldRepairFromPrimaryFiles) {
    const primaryRepair = repairFromPrimaryFiles(db, Date.now());
    if (primaryRepair.repaired === true) {
      const dependencyRepair = repairFromSystemFileDependsOn(db);
      if (dependencyRepair.repaired === true) {
        return {
          ...primaryRepair,
          repaired: true,
          dependencies: dependencyRepair.dependencies,
          inserted: primaryRepair.inserted,
          sources: primaryRepair.sources,
          semanticConnections: primaryRepair.semanticConnections,
          rebuiltFrom: `${primaryRepair.rebuiltFrom}+${dependencyRepair.rebuiltFrom}`
        };
      }

      return primaryRepair;
    }
  }

  if (shouldRepairSemanticSurface) {
    return repairSemanticConnectionsFromAtoms(db, Date.now());
  }

  return repairFromSystemFileDependsOn(db);
}
