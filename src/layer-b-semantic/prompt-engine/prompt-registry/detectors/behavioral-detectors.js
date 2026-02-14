/**
 * @fileoverview Behavioral Detectors
 * 
 * Detectores basados en comportamiento (eventos, red, storage).
 * 
 * @module prompt-registry/detectors/behavioral-detectors
 * @version 1.0.0
 */

export const detectDynamicImporter = (metadata) => metadata.hasDynamicImports === true;

export const detectEventHub = (metadata) =>
  metadata.hasEventEmitters || metadata.hasEventListeners || (metadata.eventNames?.length || 0) > 0;

export const detectGlobalState = (metadata) =>
  metadata.usesGlobalState === true && (metadata.localStorageKeys?.length || 0) === 0;

export const detectStateManager = (metadata) =>
  metadata.definesGlobalState === true ||
  metadata.hasLocalStorage === true ||
  (metadata.localStorageKeys?.length || 0) > 0 ||
  metadata.hasGlobalAccess;

export const detectNetworkHub = (metadata) =>
  metadata.hasNetworkCalls === true && (metadata.networkEndpoints?.length || 0) > 0;

export const detectApiEventBridge = (metadata) =>
  metadata.hasNetworkCalls === true &&
  metadata.hasEventEmitters === true &&
  (metadata.networkEndpoints?.length || 0) > 1;

export const detectStorageSyncManager = (metadata) => {
  const hasStorage = metadata.hasLocalStorage === true;
  const hasListeners = metadata.hasEventListeners === true;
  const hasStorageEvent = (metadata.eventNames || []).includes('storage');
  const hasConnections = (metadata.semanticConnections?.length || 0) > 2;
  return hasStorage && hasListeners && hasStorageEvent && hasConnections;
};

export default {
  detectDynamicImporter, detectEventHub, detectGlobalState, detectStateManager,
  detectNetworkHub, detectApiEventBridge, detectStorageSyncManager
};
