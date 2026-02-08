/**
 * @fileoverview molecular-extractor.js
 *
 * Molecular Extractor - Composes molecules (files) from atoms (functions)
 *
 * CORE PRINCIPLE: Files are DERIVED from their functions, not analyzed directly
 *
 * @module layer-a-static/pipeline/molecular-extractor
 */

import { extractSideEffects } from '../extractors/metadata/side-effects.js';
import { extractCallGraph } from '../extractors/metadata/call-graph.js';
import { extractDataFlow } from '../extractors/metadata/data-flow.js';
import { extractTypeInference } from '../extractors/metadata/type-inference.js';
import { extractTemporalPatterns } from '../extractors/metadata/temporal-patterns.js';
import { extractPerformanceHints } from '../extractors/metadata/performance-hints.js';

/**
 * Extrae el código de una función desde el AST
 * @param {Object} node - Nodo de función de Babel
 * @param {string} fullCode - Código completo del archivo
 * @returns {string} - Código de la función
 */
function extractFunctionCode(node, fullCode) {
  if (!node.loc) return '';

  const lines = fullCode.split('\n');
  const startLine = node.loc.start.line - 1; // 0-indexed
  const endLine = node.loc.end.line - 1;

  return lines.slice(startLine, endLine + 1).join('\n');
}

/**
 * Calcula complejidad ciclomática aproximada de una función
 * @param {string} code - Código de la función
 * @returns {number} - Complejidad
 */
function calculateComplexity(code) {
  let complexity = 1; // Base complexity

  // Decision points
  const patterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /&&/g,
    /\|\|/g,
    /\?.*:/g // ternary
  ];

  patterns.forEach(pattern => {
    const matches = code.match(pattern);
    if (matches) complexity += matches.length;
  });

  return complexity;
}

/**
 * Detecta el arquetipo de una función
 * @param {Object} atomMetadata - Metadata del átomo
 * @returns {Object} - Archetype
 */
function detectAtomArchetype(atomMetadata) {
  const { complexity, hasSideEffects, hasNetworkCalls, externalCallCount, linesOfCode, isExported, calledBy } = atomMetadata;
  const callerCount = calledBy?.length || 0;

  // god-function: alta complejidad + muchas responsabilidades
  if (complexity > 20 && (externalCallCount > 5 || callerCount > 10)) {
    return { type: 'god-function', severity: 10, confidence: 1.0 };
  }

  // fragile-network: hace llamadas de red sin error handling robusto
  if (hasNetworkCalls && !atomMetadata.hasErrorHandling) {
    return { type: 'fragile-network', severity: 8, confidence: 0.9 };
  }

  // hot-path: función exportada con MUCHAS llamadas (es crítica)
  if (isExported && callerCount > 5 && complexity < 15) {
    return { type: 'hot-path', severity: 7, confidence: 0.9 };
  }

  // dead-function: no exportada y nadie la llama
  if (!isExported && callerCount === 0) {
    return { type: 'dead-function', severity: 5, confidence: 1.0 };
  }

  // private-utility: no exportada pero usada internamente
  if (!isExported && callerCount > 0 && !hasSideEffects && complexity < 10) {
    return { type: 'private-utility', severity: 3, confidence: 0.9 };
  }

  // utility: función pura, sin side effects
  if (!hasSideEffects && complexity < 5 && linesOfCode < 20) {
    return { type: 'utility', severity: 2, confidence: 1.0 };
  }

  // Default
  return { type: 'standard', severity: 1, confidence: 1.0 };
}

/**
 * Extrae metadata de un átomo (función)
 * @param {Object} functionInfo - Info de función del parser
 * @param {string} functionCode - Código de la función
 * @param {Object} fileMetadata - Metadata del archivo completo
 * @returns {Object} - Atom metadata
 */
function extractAtomMetadata(functionInfo, functionCode, fileMetadata) {
  // Extraer metadata específica de la función
  const sideEffects = extractSideEffects(functionCode);
  const callGraph = extractCallGraph(functionCode);
  const dataFlow = extractDataFlow(functionCode);
  const typeInference = extractTypeInference(functionCode);
  const temporal = extractTemporalPatterns(functionCode);
  const performance = extractPerformanceHints(functionCode);

  // Calcular métricas
  const complexity = calculateComplexity(functionCode);
  const linesOfCode = functionCode.split('\n').length;

  // Side effects
  const hasSideEffects = sideEffects.all.length > 0;
  const hasNetworkCalls = sideEffects.networkCalls.length > 0;
  const hasDomManipulation = sideEffects.domManipulations.length > 0;
  const hasStorageAccess = sideEffects.storageAccess.length > 0;
  const hasLogging = sideEffects.consoleUsage.length > 0;

  // Error handling (buscar try/catch o validaciones)
  const hasErrorHandling = /try\s*\{/.test(functionCode) || /if\s*\(.*\)\s*throw/.test(functionCode);

  // Async
  const isAsync = functionInfo.isAsync || /async\s+function/.test(functionCode) || /await\s+/.test(functionCode);

  // Call graph
  const internalCalls = callGraph.internalCalls || [];
  const externalCalls = callGraph.externalCalls || [];
  const externalCallCount = externalCalls.length;

  // Temporal
  const hasLifecycleHooks = temporal.lifecycleHooks.length > 0;
  const hasCleanupPatterns = temporal.cleanupPatterns.length > 0;

  // Network endpoints
  const networkEndpoints = sideEffects.networkCalls
    .map(call => call.url || call.endpoint)
    .filter(Boolean);

  const atomMetadata = {
    // Identity
    id: functionInfo.id,
    name: functionInfo.name,
    type: 'atom',
    line: functionInfo.line,
    endLine: functionInfo.endLine,
    linesOfCode,

    // Export status
    isExported: functionInfo.isExported,

    // Complexity
    complexity,

    // Side effects
    hasSideEffects,
    hasNetworkCalls,
    hasDomManipulation,
    hasStorageAccess,
    hasLogging,
    networkEndpoints,

    // Call graph
    calls: functionInfo.calls || [],
    internalCalls,
    externalCalls,
    externalCallCount,

    // Error handling
    hasErrorHandling,

    // Async
    isAsync,

    // Temporal
    hasLifecycleHooks,
    lifecycleHooks: temporal.lifecycleHooks,
    hasCleanupPatterns,

    // Performance
    hasNestedLoops: performance.nestedLoops.length > 0,
    hasBlockingOps: performance.blockingOperations.length > 0
  };

  // Detect archetype based on metadata
  atomMetadata.archetype = detectAtomArchetype(atomMetadata);

  return atomMetadata;
}

/**
 * Extrae estructura molecular de un archivo
 * @param {string} filePath - Ruta del archivo
 * @param {string} code - Código del archivo
 * @param {Object} fileInfo - Info parseada del archivo
 * @param {Object} fileMetadata - Metadata del archivo completo (de extractors)
 * @returns {Object} - Molecular structure
 */
export function extractMolecularStructure(filePath, code, fileInfo, fileMetadata) {
  // Extraer átomos (funciones)
  const atoms = (fileInfo.functions || []).map(functionInfo => {
    // Encontrar el nodo en el AST para extraer su código
    // Por ahora, usamos líneas del código completo
    const lines = code.split('\n');
    const functionCode = lines.slice(functionInfo.line - 1, functionInfo.endLine).join('\n');

    return extractAtomMetadata(functionInfo, functionCode, fileMetadata);
  });

  // Crear índice de funciones por nombre para lookups rápidos
  const atomByName = new Map(atoms.map(a => [a.name, a]));
  const definedFunctions = new Set(atoms.map(a => a.name));

  // Primera pasada: clasificar calls como internal/external
  atoms.forEach(atom => {
    atom.calls.forEach(call => {
      if (definedFunctions.has(call.name)) {
        call.type = 'internal';
      } else {
        call.type = 'external';
      }
    });
  });

  // Segunda pasada: calcular calledBy (quién llama a esta función)
  // Inicializar calledBy vacío para todos
  atoms.forEach(atom => {
    atom.calledBy = [];
  });

  // Para cada átomo, registrar quién lo llama
  atoms.forEach(callerAtom => {
    callerAtom.calls.forEach(call => {
      if (call.type === 'internal') {
        const targetAtom = atomByName.get(call.name);
        if (targetAtom && targetAtom.id !== callerAtom.id) {
          // Evitar auto-llamadas recursivas en el conteo
          if (!targetAtom.calledBy.includes(callerAtom.id)) {
            targetAtom.calledBy.push(callerAtom.id);
          }
        }
      }
    });
  });

  // Tercera pasada: recalcular arquetipos con calledBy actualizado
  atoms.forEach(atom => {
    atom.archetype = detectAtomArchetype(atom);
  });

  // Retornar molécula
  return {
    filePath,
    type: 'molecule',
    atomCount: atoms.length,
    atoms,
    // La metadata molecular se DERIVA en derivation-engine
    // Aquí solo proporcionamos los átomos
    extractedAt: new Date().toISOString()
  };
}
