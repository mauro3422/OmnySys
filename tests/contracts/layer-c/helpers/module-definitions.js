/**
 * @fileoverview Layer C Module Definitions
 * 
 * Definiciones de módulos y exports esperados para Layer C.
 * 
 * @module tests/contracts/layer-c/helpers/module-definitions
 */

export const LAYER_C_MODULES = [
  {
    name: 'Shadow Registry',
    module: '#layer-c/shadow-registry/index.js',
    expectedExports: ['ShadowRegistry', 'getShadowRegistry', 'ShadowStatus']
  },
  {
    name: 'Lineage Tracker',
    module: '#layer-c/shadow-registry/lineage-tracker/index.js',
    expectedExports: ['registerBirth', 'registerDeath', 'reconstructLineage']
  },
  {
    name: 'Verification Orchestrator',
    module: '#layer-c/verification/orchestrator/index.js',
    expectedExports: ['VerificationOrchestrator', 'generateReport', 'getQuickStatus']
  },
  {
    name: 'Verification Types',
    module: '#layer-c/verification/types/index.js',
    expectedExports: ['Severity', 'IssueCategory', 'VerificationStatus']
  },
  {
    name: 'MCP Tools',
    module: '#layer-c/mcp/tools/index.js',
    expectedExports: ['toolDefinitions', 'toolHandlers']
  }
];

export const LAYER_C_TYPES_MODULES = [
  {
    name: 'Shadow Registry Types',
    module: '#layer-c/shadow-registry/types.js',
    expectedExports: ['ShadowStatus', 'EvolutionType', 'DecisionType']
  },
  {
    name: 'Verification Types',
    module: '#layer-c/verification/types/index.js',
    expectedExports: ['Severity', 'IssueCategory', 'DataSystem', 'VerificationStatus']
  }
];

export const SHADOW_REGISTRY_SUBMODULES = [
  { name: 'storage', module: '#layer-c/shadow-registry/storage/index.js', exports: ['ShadowStorage', 'IndexManager'] },
  { name: 'cache', module: '#layer-c/shadow-registry/cache/index.js', exports: ['ShadowCache'] },
  { name: 'dna', module: '#layer-c/shadow-registry/dna/index.js', exports: ['createFallbackDNA'] },
  { name: 'search', module: '#layer-c/shadow-registry/search/index.js', exports: ['findSimilarShadows'] },
  { name: 'ancestry', module: '#layer-c/shadow-registry/ancestry/index.js', exports: ['enrichWithAncestry'] }
];

export const DEFAULT_EXPORT_MODULES = [
  { name: 'ShadowRegistry', module: '#layer-c/shadow-registry/index.js', className: 'ShadowRegistry' },
  { name: 'VerificationOrchestrator', module: '#layer-c/verification/orchestrator/index.js', className: 'VerificationOrchestrator' }
];
