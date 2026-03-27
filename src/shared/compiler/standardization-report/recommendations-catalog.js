function buildSuggestedTarget(id, priority, rationale, recommendation) {
  return {
    id,
    priority,
    rationale,
    recommendation
  };
}

function hasRuntimeRestartPressure(watcherAlerts = []) {
  return watcherAlerts.some((alert) =>
    ['src/layer-c-memory/mcp-http-proxy.js', 'src/layer-c-memory/mcp-stdio-bridge.js'].includes(alert?.filePath) &&
    ['arch_circular_high', 'code_complexity_high'].includes(alert?.issueType)
  );
}

function hasSharedStateHotspot(sharedState = {}) {
  const hottest = sharedState?.topContentionKeys?.[0];
  return hottest && Number(hottest.count || 0) >= 100;
}

function hasGuardNoise(watcherAlerts = []) {
  return watcherAlerts.some((alert) =>
    String(alert?.filePath || '').startsWith('src/shared/compiler/') &&
    String(alert?.issueType || '').startsWith('sem_data_flow_')
  );
}

function hasCanonicalCentralityCoverageAdoption(canonicalAdoptions = {}) {
  return canonicalAdoptions.centralityCoverage === true;
}

function hasCanonicalSharedStateContentionAdoption(canonicalAdoptions = {}) {
  return canonicalAdoptions.sharedStateContention === true;
}

function hasCanonicalScannedFileManifestAdoption(canonicalAdoptions = {}) {
  return canonicalAdoptions.scannedFileManifest === true;
}

function hasCanonicalDataGatewayAdoption(dataGatewayContract = null) {
  return dataGatewayContract?.summary?.trustworthy === true;
}

export {
  buildSuggestedTarget,
  hasRuntimeRestartPressure,
  hasSharedStateHotspot,
  hasGuardNoise,
  hasCanonicalCentralityCoverageAdoption,
  hasCanonicalSharedStateContentionAdoption,
  hasCanonicalScannedFileManifestAdoption,
  hasCanonicalDataGatewayAdoption
};
