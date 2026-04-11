export function compactCompilerContractLayer(compilerContractLayer = null) {
  if (!compilerContractLayer) return null;
  return {
    summary: {
      healthy: compilerContractLayer.summary?.healthy,
      failedInvariantCount: compilerContractLayer.summary?.failedInvariantCount,
      canonicalSurfaceCount: compilerContractLayer.summary?.canonicalSurfaceCount,
      canonicalWrapperFindings: compilerContractLayer.summary?.canonicalWrapperFindings,
      canonicalBypassFindings: compilerContractLayer.summary?.canonicalBypassFindings,
      parallelCanonicalSurfaceFindings: compilerContractLayer.summary?.parallelCanonicalSurfaceFindings,
      dataGatewayContractTrustworthy: compilerContractLayer.summary?.dataGatewayContractTrustworthy,
      dataGatewayContractState: compilerContractLayer.summary?.dataGatewayContractState,
      nextAction: compilerContractLayer.summary?.nextAction
    },
    surfaces: Array.isArray(compilerContractLayer.surfaces)
      ? compilerContractLayer.surfaces.map((surface) => ({
        id: surface.id,
        kind: surface.kind,
        status: surface.status,
        sourceOfTruth: surface.sourceOfTruth === true,
        surface: surface.surface || null
      }))
      : [],
    canonicalEntrypoints: Array.isArray(compilerContractLayer.canonicalEntrypoints)
      ? compilerContractLayer.canonicalEntrypoints.map((entrypoint) => ({
        id: entrypoint.id,
        status: entrypoint.status,
        entrypoint: entrypoint.entrypoint,
        domain: entrypoint.domain
      }))
      : []
  };
}
