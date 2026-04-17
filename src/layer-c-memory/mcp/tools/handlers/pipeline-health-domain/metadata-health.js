export function checkMetadataParity(metadataSurfaceParity, semanticSurfaceGranularity, semanticCanonicality, warnings, tableCounts) {
    if (metadataSurfaceParity.healthy === false) {
        warnings.push({
            field: 'metadata_surface_parity',
            coverage: `${Math.round(Number(metadataSurfaceParity.importsParityRatio || 0) * 100)}% import parity`,
            issue: 'Mirrored system-map metadata is much sparser than the primary files table'
        });
        tableCounts.metadata_surface_parity_issues = metadataSurfaceParity.issues.length;
    }

    if (semanticSurfaceGranularity.healthy === false) {
        warnings.push({
            field: 'semantic_surface_granularity',
            coverage: `${semanticSurfaceGranularity.fileLevel.total} file-level vs ${semanticSurfaceGranularity.atomLevel.total} atom-level semantic links`,
            issue: 'Semantic summary/detail surfaces are drifting or incomplete; do not compare file-level semantic_connections as if they were atom-level semantic relations'
        });
        tableCounts.semantic_surface_granularity_issues = semanticSurfaceGranularity.issues.length;
    }

    if (semanticCanonicality?.status === 'advisory_only') {
        warnings.push({
            field: 'semantic_surface_canonicality',
            coverage: `${semanticSurfaceGranularity.fileLevel.total} summary rows backed by ${semanticSurfaceGranularity.canonicalAdapterView.total} canonical file-level pairs`,
            issue: semanticCanonicality.summary
        });
    }
}
