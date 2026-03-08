/**
 * @fileoverview Canonical compiler diagnostics snapshot.
 *
 * Reuses the current canonical compiler helpers to build the shared
 * diagnostics payload consumed by MCP status/reporting surfaces.
 *
 * @module shared/compiler/compiler-diagnostics-snapshot
 */

import { discoverProjectSourceFiles } from './source-file-discovery.js';
import { syncPersistedScannedFileManifest, summarizePersistedScannedFileCoverage } from './compiler-persistence.js';
import { getFileImportEvidenceCoverage } from './import-evidence-coverage.js';
import { getSystemMapPersistenceCoverage } from './system-map-persistence-coverage.js';
import { getMetadataSurfaceParity } from './metadata-surface-parity.js';
import { getSemanticSurfaceGranularity, summarizeSemanticCanonicality } from './semantic-surface-granularity.js';
import { getFileUniverseGranularity } from './file-universe-granularity.js';
import { buildCompilerStandardizationReport } from './standardization-report.js';
import { buildCompilerContractLayer } from './compiler-contract-layer.js';
import { getLiveFileTotal } from './live-row-utils.js';

export async function loadCompilerDiagnosticsSnapshot({
    projectPath,
    db,
    policySummary = { total: 0, high: 0, medium: 0, byPolicyArea: {}, byRule: {} },
    watcherAlerts = [],
    sharedState = {},
    compilerRemediation = null,
    canonicalAdoptions = null,
    tableCounts = {}
} = {}) {
    const scannedFilePaths = await discoverProjectSourceFiles(projectPath);
    await syncPersistedScannedFileManifest(projectPath, scannedFilePaths);

    const persistedFileCoverage = await summarizePersistedScannedFileCoverage(projectPath, scannedFilePaths);
    const fileImportEvidenceCoverage = db ? getFileImportEvidenceCoverage(db) : null;
    const systemMapPersistenceCoverage = db ? getSystemMapPersistenceCoverage(db) : null;
    const metadataSurfaceParity = db ? getMetadataSurfaceParity(db) : null;
    const semanticSurfaceGranularity = db ? getSemanticSurfaceGranularity(db) : null;
    const semanticCanonicality = summarizeSemanticCanonicality(semanticSurfaceGranularity);
    const fileUniverseGranularity = getFileUniverseGranularity({
        scannedFileTotal: persistedFileCoverage?.scannedFileTotal || 0,
        manifestFileTotal: persistedFileCoverage?.manifestFileTotal || 0,
        liveFileCount: db ? getLiveFileTotal(db) : (persistedFileCoverage?.liveIndexedFiles || 0)
    });

    const standardizationReport = buildCompilerStandardizationReport({
        policySummary,
        watcherAlerts,
        sharedState,
        compilerRemediation,
        persistedFileCoverage,
        fileImportEvidenceCoverage,
        systemMapPersistenceCoverage,
        metadataSurfaceParity,
        semanticSurfaceGranularity,
        semanticCanonicality,
        fileUniverseGranularity,
        canonicalAdoptions: canonicalAdoptions || {
            centralityCoverage: true,
            sharedStateContention: true,
            scannedFileManifest: persistedFileCoverage?.synchronized === true
        }
    });

    const compilerContractLayer = buildCompilerContractLayer({
        persistedFileCoverage,
        fileUniverseGranularity,
        metadataSurfaceParity,
        semanticSurfaceGranularity,
        semanticCanonicality,
        systemMapPersistenceCoverage,
        standardization: standardizationReport,
        tableCounts
    });

    return {
        persistedFileCoverage,
        fileImportEvidenceCoverage,
        systemMapPersistenceCoverage,
        metadataSurfaceParity,
        semanticSurfaceGranularity,
        semanticCanonicality,
        fileUniverseGranularity,
        standardizationReport,
        compilerContractLayer
    };
}
