import { detectStateOwnershipConformanceFromSource } from './state-ownership-conformance.js';
import { detectServiceBoundaryConformanceFromSource } from './service-boundary-conformance.js';
import { detectCanonicalExtensionConformanceFromSource } from './canonical-extension-conformance.js';
import { detectDataGatewayConformanceFromSource } from './data-gateway-conformance.js';
import { detectAsyncErrorConformanceFromSource } from './async-error-conformance.js';
import { detectSharedStateHotspotConformanceFromSource } from './shared-state-hotspot-conformance.js';
import { detectTestabilityConformanceFromSource } from './testability-conformance.js';
import { detectSemanticPurityConformanceFromSource } from './semantic-purity-conformance.js';
import { detectMetadataPropagationConformanceFromSource } from './metadata-propagation-conformance.js';
import { detectSemanticSurfaceGranularityConformanceFromSource } from './semantic-surface-granularity-conformance.js';
import { detectSummaryConformanceFromSource } from './summary-conformance.js';
import { detectPropagationExpansionConformanceFromSource } from './propagation-expansion-conformance.js';

export function collectConformanceFindings(normalizedPath, source) {
  const conformanceDetectors = [
    [detectStateOwnershipConformanceFromSource, 'state_ownership'],
    [detectServiceBoundaryConformanceFromSource, 'service_boundary'],
    [detectCanonicalExtensionConformanceFromSource, 'canonical_extension'],
    [detectDataGatewayConformanceFromSource, 'data_gateway'],
    [detectAsyncErrorConformanceFromSource, 'async_error'],
    [detectSharedStateHotspotConformanceFromSource, 'shared_state_hotspots'],
    [detectTestabilityConformanceFromSource, 'testability'],
    [detectSemanticPurityConformanceFromSource, 'semantic_purity'],
    [detectMetadataPropagationConformanceFromSource, 'metadata_propagation'],
    [detectSemanticSurfaceGranularityConformanceFromSource, 'semantic_surface_granularity'],
    [detectPropagationExpansionConformanceFromSource, 'propagation_expansion'],
    [detectSummaryConformanceFromSource, 'summary_presentation']
  ];

  return conformanceDetectors.flatMap(([detector, policyArea]) => detector(normalizedPath, source, {
    severity: 'medium',
    policyArea
  }));
}
