/**
 * @fileoverview prompt-builder.js
 * 
 * Construcción de metadatos para prompts/arquetipos
 * 
 * @module metadata-contract/builders/prompt-builder
 */

import { ARRAY_LIMITS, SINGLETON_INDICATORS, TYPESCRIPT_EXTENSIONS } from '../constants.js';

/**
 * Construye metadata para prompts/arquetipos
 * @param {string} filePath - Ruta relativa del archivo
 * @param {object} fileAnalysis - Análisis del archivo (Layer A)
 * @returns {object}
 */
export function buildPromptMetadata(filePath, fileAnalysis = {}) {
  const analysis = fileAnalysis || {};
  const semantic = analysis.semanticAnalysis || {};
  const sharedState = semantic.sharedState || {};
  const eventPatterns = semantic.eventPatterns || {};
  const sideEffects = semantic.sideEffects || {};
  const extra = analysis.metadata || {};

  const exports = extractExportNames(analysis);
  const dependents = extractDependents(analysis);
  const imports = analysis.imports || [];
  const functions = analysis.functions || [];

  const eventNames = extractEventNames(eventPatterns);
  const globalWrites = extractGlobalWrites(sharedState);
  const globalReads = extractGlobalReads(sharedState);
  const envVars = extractEnvVars(extra);

  return {
    filePath: analysis.filePath || filePath,
    exportCount: exports.length,
    dependentCount: dependents.length,
    importCount: imports.length,
    functionCount: functions.length,

    exports: limitArray(exports, ARRAY_LIMITS.EXPORTS),
    dependents: limitArray(dependents, ARRAY_LIMITS.DEPENDENTS),

    hasDynamicImports: hasDynamicImports(imports),
    hasTypeScript: detectTypeScript(filePath, extra),
    hasCSSInJS: detectCSSInJS(extra),
    hasLocalStorage: detectLocalStorage(sideEffects, analysis),
    hasEventListeners: detectEventListeners(eventPatterns, sideEffects),
    hasEventEmitters: (eventPatterns.eventEmitters || []).length > 0,
    hasGlobalAccess: detectGlobalAccess(sideEffects, globalReads, globalWrites),
    hasAsyncPatterns: detectAsyncPatterns(extra),
    hasJSDoc: detectJSDoc(extra),
    hasSingletonPattern: detectSingletonPattern(extra, exports),

    localStorageKeys: extractLocalStorageKeys(analysis),
    eventNames: limitArray(eventNames, ARRAY_LIMITS.EVENT_NAMES),
    envVars: limitArray(envVars, ARRAY_LIMITS.ENV_VARS),

    semanticDependentCount: (analysis.semanticConnections || []).length,
    definesGlobalState: globalWrites.length > 0,
    usesGlobalState: globalReads.length > 0,
    globalStateWrites: limitArray(globalWrites, ARRAY_LIMITS.GLOBAL_WRITES),
    globalStateReads: limitArray(globalReads, ARRAY_LIMITS.GLOBAL_READS),
    semanticConnections: formatSemanticConnections(analysis.semanticConnections)
  };
}

// Funciones auxiliares
function extractExportNames(analysis) {
  return (analysis.exports || [])
    .map(e => typeof e === 'string' ? e : e?.name)
    .filter(Boolean);
}

function extractDependents(analysis) {
  return Array.isArray(analysis.usedBy)
    ? analysis.usedBy
    : (analysis.dependents || []);
}

function extractEventNames(eventPatterns) {
  const emitters = eventPatterns.eventEmitters || [];
  const listeners = eventPatterns.eventListeners || [];
  return [...new Set([
    ...emitters.map(e => e?.eventName || e?.event || e?.name || String(e)),
    ...listeners.map(e => e?.eventName || e?.event || e?.name || String(e))
  ])].filter(Boolean);
}

function extractGlobalWrites(sharedState) {
  return (sharedState.writeProperties || sharedState.writes || [])
    .slice(0, ARRAY_LIMITS.GLOBAL_WRITES);
}

function extractGlobalReads(sharedState) {
  return (sharedState.readProperties || sharedState.reads || [])
    .slice(0, ARRAY_LIMITS.GLOBAL_READS);
}

function extractEnvVars(extra) {
  return (extra.buildTimeDeps?.envVars || [])
    .map(v => v?.name || v?.key || v?.varName)
    .filter(Boolean);
}

function extractLocalStorageKeys(analysis) {
  const connections = analysis.semanticConnections || [];
  return connections
    .filter(c => c?.type === 'localStorage' || c?.via === 'localStorage')
    .map(c => c?.key || c?.localStorageKey)
    .filter(Boolean)
    .slice(0, ARRAY_LIMITS.LOCAL_STORAGE_KEYS);
}

function hasDynamicImports(imports) {
  return imports.some(imp =>
    imp?.type === 'dynamic' ||
    (typeof imp?.source === 'string' && 
     (imp.source.includes('${') || imp.source.includes('+')))
  );
}

function detectTypeScript(filePath, extra) {
  return TYPESCRIPT_EXTENSIONS.some(ext => filePath.endsWith(ext)) ||
    (extra.typescript?.all?.length || 0) > 0;
}

function detectCSSInJS(extra) {
  return (extra.cssInJS?.all?.length || 0) > 0 ||
    (extra.cssInJS?.components?.length || 0) > 0 ||
    (extra.cssInJS?.themes?.length || 0) > 0 ||
    (extra.cssInJS?.globalStyles?.length || 0) > 0;
}

function detectLocalStorage(sideEffects, analysis) {
  const connections = analysis.semanticConnections || [];
  const hasLocalStorageConnections = connections.some(c => 
    c?.type === 'localStorage' || c?.via === 'localStorage'
  );
  return sideEffects.usesLocalStorage || hasLocalStorageConnections;
}

function detectEventListeners(eventPatterns, sideEffects) {
  return (eventPatterns.eventListeners?.length > 0) || 
    sideEffects.hasEventListeners;
}

function detectGlobalAccess(sideEffects, globalReads, globalWrites) {
  return sideEffects.hasGlobalAccess || 
    globalReads.length > 0 || 
    globalWrites.length > 0;
}

function detectAsyncPatterns(extra) {
  return (extra.asyncPatterns?.all?.length || 0) > 0;
}

function detectJSDoc(extra) {
  return (extra.jsdocContracts?.all?.length || 0) > 0;
}

function detectSingletonPattern(extra, exports) {
  if (extra.hasSingletonPattern === true) return true;
  
  const exportNamesLower = exports.map(e => String(e).toLowerCase());
  return exportNamesLower.some(name =>
    SINGLETON_INDICATORS.some(indicator => name.includes(indicator))
  );
}

function formatSemanticConnections(connections) {
  if (!connections) return [];
  return connections.map(c => ({
    target: c.target || c.targetFile,
    type: c.type || c.via,
    key: c.key || c.event || c.eventName
  })).slice(0, ARRAY_LIMITS.SEMANTIC_CONNECTIONS);
}

function limitArray(arr, limit) {
  return (arr || []).slice(0, limit);
}
