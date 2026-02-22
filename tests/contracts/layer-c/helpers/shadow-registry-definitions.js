/**
 * @fileoverview Shadow Registry Contract Definitions
 * 
 * Constantes para tests de contrato de Shadow Registry.
 * 
 * @module tests/contracts/layer-c/helpers/shadow-registry-definitions
 */

export const SHADOW_REGISTRY_EXPORTS = [
  'ShadowRegistry',
  'getShadowRegistry',
  'resetShadowRegistry',
  'ShadowStorage',
  'IndexManager',
  'ShadowCache',
  'createFallbackDNA',
  'extractOrCreateDNA',
  'isValidDNA',
  'getDNASummary',
  'findSimilarShadows',
  'findBestMatch',
  'createGenesisAncestry',
  'createInheritedAncestry',
  'enrichWithAncestry',
  'calculateVibrationScore',
  'reconstructFullLineage',
  'ShadowStatus'
];

export const SHADOW_REGISTRY_METHODS = [
  'initialize',
  'createShadow',
  'findSimilar',
  'getShadow',
  'markReplaced',
  'getLineage',
  'listShadows',
  'enrichWithAncestry'
];

export const LINEAGE_TRACKER_EXPORTS = [
  'registerBirth',
  'registerDeath',
  'detectEvolutionType',
  'calculateInheritance',
  'propagateInheritance',
  'calculateVibrationScore',
  'generateShadowId',
  'extractMetadata',
  'reconstructLineage',
  'compareLineage'
];
