export function compactCompilerContractLayer(compilerContractLayer = null) {
  if (!compilerContractLayer) return null;
  return {
    summary: {
      healthy: compilerContractLayer.summary?.healthy,
      failedInvariantCount: compilerContractLayer.summary?.failedInvariantCount,
      canonicalWrapperFindings: compilerContractLayer.summary?.canonicalWrapperFindings,
      canonicalBypassFindings: compilerContractLayer.summary?.canonicalBypassFindings,
      parallelCanonicalSurfaceFindings: compilerContractLayer.summary?.parallelCanonicalSurfaceFindings,
      dataGatewayContractTrustworthy: compilerContractLayer.summary?.dataGatewayContractTrustworthy,
      dataGatewayContractState: compilerContractLayer.summary?.dataGatewayContractState,
      nextAction: compilerContractLayer.summary?.nextAction
    }
  };
}
