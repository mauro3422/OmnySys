/**
 * @fileoverview Registry Data
 * 
 * Datos del registro de arquetipos.
 * 
 * @module prompt-registry/registry-data
 * @version 1.0.0
 */

// Templates
import godObjectTemplate from '../prompt-templates/god-object.js';
import circularDependencyTemplate from '../prompt-templates/circular-dependency.js';
import semanticConnectionsTemplate from '../prompt-templates/semantic-connections.js';
import dynamicImportsTemplate from '../prompt-templates/dynamic-imports.js';
import singletonTemplate from '../prompt-templates/singleton.js';
import orphanModuleTemplate from '../prompt-templates/orphan-module.js';
import globalStateTemplate from '../prompt-templates/global-state.js';
import defaultTemplate from '../prompt-templates/default.js';
import criticalBottleneckTemplate from '../prompt-templates/critical-bottleneck.js';
import apiEventBridgeTemplate from '../prompt-templates/api-event-bridge.js';
import storageSyncTemplate from '../prompt-templates/storage-sync.js';

// Detectors
import {
  detectGodObjectArchetype, detectOrphanModuleArchetype, detectSingleton,
  detectFacade, detectConfigHub, detectEntryPoint
} from './detectors/structural-detectors.js';
import {
  detectDynamicImporter, detectEventHub, detectGlobalState, detectStateManager,
  detectNetworkHub, detectApiEventBridge, detectStorageSyncManager
} from './detectors/behavioral-detectors.js';
import { detectCriticalBottleneck } from './detectors/performance-detectors.js';

/**
 * REGISTRO DE ARQUETIPOS
 */
export const ARCHETYPE_REGISTRY = [
  {
    type: 'god-object',
    severity: 10,
    requiresLLM: true,
    detector: detectGodObjectArchetype,
    template: godObjectTemplate,
    mergeKey: 'godObjectAnalysis',
    fields: ['riskLevel', 'responsibilities', 'impactScore']
  },
  {
    type: 'orphan-module',
    severity: 5,
    requiresLLM: true,
    detector: detectOrphanModuleArchetype,
    template: orphanModuleTemplate,
    mergeKey: 'orphanAnalysis',
    fields: ['isOrphan', 'potentialUsage', 'suggestedUsage']
  },
  {
    type: 'dynamic-importer',
    severity: 7,
    requiresLLM: true,
    detector: detectDynamicImporter,
    template: dynamicImportsTemplate,
    mergeKey: 'dynamicImportAnalysis',
    fields: ['dynamicImports', 'routeMapAnalysis']
  },
  {
    type: 'singleton',
    severity: 7,
    requiresLLM: 'conditional',
    detector: detectSingleton,
    template: singletonTemplate,
    mergeKey: 'singletonAnalysis',
    fields: ['instanceCount', 'globalState', 'threadSafety', 'initializationPattern']
  },
  {
    type: 'event-hub',
    severity: 6,
    requiresLLM: 'conditional',
    detector: detectEventHub,
    template: semanticConnectionsTemplate,
    mergeKey: 'eventHubAnalysis',
    fields: ['eventNames', 'eventConnections']
  },
  {
    type: 'global-state',
    severity: 6,
    requiresLLM: 'conditional',
    detector: detectGlobalState,
    template: globalStateTemplate,
    mergeKey: 'globalStateAnalysis',
    fields: ['globalVariables', 'accessPatterns', 'riskLevel']
  },
  {
    type: 'state-manager',
    severity: 6,
    requiresLLM: 'conditional',
    detector: detectStateManager,
    template: semanticConnectionsTemplate,
    mergeKey: 'stateManagerAnalysis',
    fields: ['localStorageKeys', 'sharedState']
  },
  {
    type: 'facade',
    severity: 4,
    requiresLLM: false,
    detector: detectFacade,
    template: null,
    mergeKey: 'facadeAnalysis',
    fields: ['reExportedModules', 'aggregationScope', 'blastRadius']
  },
  {
    type: 'config-hub',
    severity: 5,
    requiresLLM: false,
    detector: detectConfigHub,
    template: null,
    mergeKey: 'configHubAnalysis',
    fields: ['configKeys', 'consumers', 'riskLevel']
  },
  {
    type: 'entry-point',
    severity: 3,
    requiresLLM: false,
    detector: detectEntryPoint,
    template: null,
    mergeKey: 'entryPointAnalysis',
    fields: ['bootSequence', 'servicesInitialized']
  },
  {
    type: 'network-hub',
    severity: 5,
    requiresLLM: 'conditional',
    detector: detectNetworkHub,
    template: semanticConnectionsTemplate,
    mergeKey: 'networkHubAnalysis',
    fields: ['endpoints', 'apiDependencies', 'riskLevel']
  },
  {
    type: 'critical-bottleneck',
    severity: 10,
    requiresLLM: true,
    detector: detectCriticalBottleneck,
    template: criticalBottleneckTemplate,
    mergeKey: 'criticalBottleneckAnalysis',
    fields: ['optimizationStrategy', 'estimatedImpact', 'refactoringRisk']
  },
  {
    type: 'api-event-bridge',
    severity: 8,
    requiresLLM: true,
    detector: detectApiEventBridge,
    template: apiEventBridgeTemplate,
    mergeKey: 'apiEventBridgeAnalysis',
    fields: ['apiFlowDiagram', 'eventSequence', 'riskOfRaceConditions']
  },
  {
    type: 'storage-sync-manager',
    severity: 8,
    requiresLLM: 'conditional',
    detector: detectStorageSyncManager,
    template: storageSyncTemplate,
    mergeKey: 'storageSyncAnalysis',
    fields: ['syncPatterns', 'conflictResolution', 'consistencyGuarantees']
  },
  {
    type: 'default',
    severity: 0,
    requiresLLM: true,
    detector: () => true,
    template: defaultTemplate,
    mergeKey: 'generalAnalysis',
    fields: ['patterns', 'functions', 'exports']
  }
];

export default { ARCHETYPE_REGISTRY };
