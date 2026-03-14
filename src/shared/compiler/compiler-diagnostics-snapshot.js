/**
 * @fileoverview Canonical compiler diagnostics snapshot.
 *
 * Reuses the current canonical compiler helpers to build the shared
 * diagnostics payload consumed by MCP status/reporting surfaces.
 *
 * @module shared/compiler/compiler-diagnostics-snapshot
 */

import fs from 'fs/promises';
import path from 'path';
import { discoverCompilerFiles, discoverProjectSourceFiles } from './file-discovery.js';
import { syncPersistedScannedFileManifest, summarizePersistedScannedFileCoverage } from './compiler-persistence.js';
import { getFileImportEvidenceCoverage } from './file-import-evidence.js';
import { getSystemMapPersistenceCoverage } from './system-map-persistence.js';
import { getMetadataSurfaceParity } from './metadata-surface-parity.js';
import { getSemanticSurfaceGranularity, summarizeSemanticCanonicality } from './semantic-surface-granularity.js';
import { getFileUniverseGranularity } from './file-universe-granularity.js';
import { buildCompilerStandardizationReport } from './standardization-report.js';
import { buildCompilerContractLayer } from './compiler-contract-layer.js';
import { getLiveFileTotal } from './live-row-utils.js';
import { summarizeContractTaxonomy } from './contract-taxonomy.js';

const CANONICAL_ADOPTION_PATTERNS = {
    centralityCoverage: /\bsummarizeCentralityCoverageRow\b/,
    sharedStateContention: /\bgetSharedStateContentionSummary\b|\bsummarizeSharedStateHotspots\b/,
    scannedFileManifest: /\bsyncPersistedScannedFileManifest\b|\bsummarizePersistedScannedFileCoverage\b|\bgetPersistedScannedFilePaths\b|\bloadPersistedScannedFilePaths\b/,
    runtimeBoundarySurfaces: /\bexecuteWithBoundary\b|\bexecuteWithNetworkBoundary\b|\bclassifyBoundaryError\b/
};

async function collectCanonicalAdoptionEvidence(projectPath) {
    const compilerFiles = await discoverCompilerFiles(projectPath, { readAverIgnore: false });
    const evidence = Object.fromEntries(
        Object.keys(CANONICAL_ADOPTION_PATTERNS).map((key) => [key, {
            adopted: false,
            consumerCount: 0,
            sampleFiles: []
        }])
    );

    await Promise.all(compilerFiles.map(async (filePath) => {
        let source = '';
        try {
            source = await fs.readFile(path.join(projectPath, filePath), 'utf8');
        } catch {
            return;
        }

        for (const [key, pattern] of Object.entries(CANONICAL_ADOPTION_PATTERNS)) {
            if (!pattern.test(source)) {
                continue;
            }

            const entry = evidence[key];
            entry.adopted = true;
            entry.consumerCount += 1;
            if (entry.sampleFiles.length < 5) {
                entry.sampleFiles.push(filePath);
            }
        }
    }));

    return evidence;
}

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
    const canonicalAdoptionEvidence = await collectCanonicalAdoptionEvidence(projectPath);
    await syncPersistedScannedFileManifest(projectPath, scannedFilePaths);

    const persistedFileCoverage = await summarizePersistedScannedFileCoverage(projectPath, scannedFilePaths);
    const fileImportEvidenceCoverage = db ? getFileImportEvidenceCoverage(db) : null;
    const systemMapPersistenceCoverage = db ? getSystemMapPersistenceCoverage(db) : null;
    const metadataSurfaceParity = db ? getMetadataSurfaceParity(db) : null;
    const semanticSurfaceGranularity = db ? getSemanticSurfaceGranularity(db) : null;
    const semanticCanonicality = summarizeSemanticCanonicality(semanticSurfaceGranularity);
    const contractTaxonomy = db ? summarizeContractTaxonomy(db) : null;
    const fileUniverseGranularity = getFileUniverseGranularity({
        scannedFileTotal: persistedFileCoverage?.scannedFileTotal || 0,
        manifestFileTotal: persistedFileCoverage?.manifestFileTotal || 0,
        liveFileCount: db ? getLiveFileTotal(db) : (persistedFileCoverage?.liveIndexedFiles || 0)
    });
    const resolvedCanonicalAdoptions = {
        // Prefer measured compiler/runtime consumer evidence over optimistic defaults.
        centralityCoverage: canonicalAdoptionEvidence.centralityCoverage.adopted,
        sharedStateContention: canonicalAdoptionEvidence.sharedStateContention.adopted,
        scannedFileManifest:
            canonicalAdoptionEvidence.scannedFileManifest.adopted &&
            persistedFileCoverage?.synchronized === true,
        ...(canonicalAdoptions || {})
    };

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
        contractTaxonomy,
        fileUniverseGranularity,
        canonicalAdoptions: resolvedCanonicalAdoptions
    });

    const compilerContractLayer = buildCompilerContractLayer({
        persistedFileCoverage,
        fileUniverseGranularity,
        metadataSurfaceParity,
        semanticSurfaceGranularity,
        semanticCanonicality,
        contractTaxonomy,
        systemMapPersistenceCoverage,
        standardization: standardizationReport,
        policySummary,
        tableCounts
    });

    return {
        persistedFileCoverage,
        fileImportEvidenceCoverage,
        systemMapPersistenceCoverage,
        metadataSurfaceParity,
        semanticSurfaceGranularity,
        semanticCanonicality,
        contractTaxonomy,
        fileUniverseGranularity,
        canonicalAdoptionEvidence,
        canonicalAdoptions: resolvedCanonicalAdoptions,
        standardizationReport,
        compilerContractLayer
    };
}
