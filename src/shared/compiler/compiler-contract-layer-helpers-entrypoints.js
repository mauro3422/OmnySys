export function buildCanonicalEntrypoints() {
  return [
    {
      id: 'discover_project_source_files',
      status: 'canonical',
      entrypoint: 'discoverProjectSourceFiles',
      domain: 'file_discovery'
    },
    {
      id: 'scanned_file_manifest',
      status: 'canonical',
      entrypoint: 'syncPersistedScannedFileManifest',
      domain: 'file_universe'
    },
    {
      id: 'persisted_file_coverage',
      status: 'canonical',
      entrypoint: 'summarizePersistedScannedFileCoverage',
      domain: 'file_universe'
    },
    {
      id: 'live_row_sync',
      status: 'canonical',
      entrypoint: 'ensureLiveRowSync',
      domain: 'runtime_sync'
    },
    {
      id: 'metadata_surface_parity',
      status: 'canonical',
      entrypoint: 'getMetadataSurfaceParity',
      domain: 'metadata_surfaces'
    },
    {
      id: 'metadata_extraction_coverage',
      status: 'canonical',
      entrypoint: 'getMetadataExtractionCoverage',
      domain: 'metadata_surfaces'
    },
    {
      id: 'system_map_persistence',
      status: 'canonical',
      entrypoint: 'getSystemMapPersistenceCoverage',
      domain: 'metadata_surfaces'
    },
    {
      id: 'semantic_surface_granularity',
      status: 'canonical',
      entrypoint: 'getSemanticSurfaceGranularity',
      domain: 'semantic_surfaces'
    },
    {
      id: 'semantic_canonicality',
      status: 'canonical',
      entrypoint: 'summarizeSemanticCanonicality',
      domain: 'semantic_surfaces'
    },
    {
      id: 'file_universe_granularity',
      status: 'canonical',
      entrypoint: 'getFileUniverseGranularity',
      domain: 'file_universe'
    },
    {
      id: 'compiler_standardization',
      status: 'canonical',
      entrypoint: 'buildCompilerStandardizationReport',
      domain: 'governance'
    },
    {
      id: 'data_gateway_contract',
      status: 'canonical',
      entrypoint: 'buildDataGatewayContract',
      domain: 'governance'
    },
    {
      id: 'surface_freshness_ledger',
      status: 'canonical',
      entrypoint: 'buildSurfaceFreshnessLedger',
      domain: 'governance'
    }
  ];
}
