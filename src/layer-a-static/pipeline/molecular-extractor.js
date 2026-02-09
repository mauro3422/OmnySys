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
import { extractDataFlow as extractDataFlowV2 } from '../extractors/data-flow-v2/core/index.js';
import { extractTypeInference } from '../extractors/metadata/type-inference.js';
import { extractTemporalPatterns } from '../extractors/metadata/temporal-patterns.js';
import { extractPerformanceHints } from '../extractors/metadata/performance-hints.js';
import { buildMolecularChains, enrichAtomsWithChains } from './molecular-chains/index.js';
import { analyzeModules, enrichMoleculesWithSystemContext } from '../module-system/index.js';

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
 * @param {string} filePath - Ruta del archivo
 * @returns {Object} - Atom metadata
 */
async function extractAtomMetadata(functionInfo, functionCode, fileMetadata, filePath) {
  // Extraer metadata específica de la función (existente)
  const sideEffects = extractSideEffects(functionCode);
  const callGraph = extractCallGraph(functionCode);
  const typeInference = extractTypeInference(functionCode);
  const temporal = extractTemporalPatterns(functionCode);
  const performance = extractPerformanceHints(functionCode);
  
  // NUEVO: Data Flow Exhaustivo v2
  let dataFlowV2 = null;
  try {
    // Obtener AST de la función si está disponible
    const functionAst = functionInfo.node || functionInfo.ast;
    
    if (functionAst) {
      dataFlowV2 = await extractDataFlowV2(
        functionAst,
        functionCode,
        functionInfo.name,
        filePath
      );
    }
  } catch (error) {
    console.warn(`[molecular-extractor] Error extrayendo data flow v2 for ${functionInfo.name}:`, error.message);
    // No fallar la extracción completa si data flow falla
  }

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
    hasBlockingOps: performance.blockingOperations.length > 0,

    // NUEVO: Data Flow Exhaustivo v0.7
    dataFlow: dataFlowV2?.real || null,
    standardized: dataFlowV2?.standardized || null,
    patternHash: dataFlowV2?.standardized?.patternHash || null,
    
    // NUEVO: Invariantes detectadas
    invariants: dataFlowV2?.real?.invariants || [],
    typeFlow: dataFlowV2?.real?.typeFlow || null,
    
    // NUEVO: Metadata del proceso
    _meta: {
      dataFlowVersion: '2.0.0',
      extractionTime: dataFlowV2?._meta?.processingTime || 0,
      confidence: dataFlowV2?._meta?.confidence || 0.5
    }
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
export async function extractMolecularStructure(filePath, code, fileInfo, fileMetadata) {
  // Extraer átomos (funciones) - ahora async
  let atoms = await Promise.all(
    (fileInfo.functions || []).map(async functionInfo => {
      // Encontrar el nodo en el AST para extraer su código
      // Por ahora, usamos líneas del código completo
      const lines = code.split('\n');
      const functionCode = lines.slice(functionInfo.line - 1, functionInfo.endLine).join('\n');

      return await extractAtomMetadata(functionInfo, functionCode, fileMetadata, filePath);
    })
  );

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

  // NUEVO FASE 2: Construir chains moleculares
  let molecularChains = null;
  try {
    const { buildMolecularChains, enrichAtomsWithChains } = await import('./molecular-chains/index.js');
    
    // Construir chains
    const chainData = buildMolecularChains(atoms);
    
    // Enriquecer átomos con información de chains
    atoms = enrichAtomsWithChains(atoms, chainData);
    
    molecularChains = {
      chains: chainData.chains,
      graph: chainData.graph,
      summary: chainData.summary
    };
    
    console.log(`[molecular-extractor] Built ${chainData.chains.length} molecular chains`);
  } catch (error) {
    console.warn('[molecular-extractor] Error building molecular chains:', error.message);
    // No fallar si chains falla
  }

  // Retornar molécula
  return {
    filePath,
    type: 'molecule',
    atomCount: atoms.length,
    atoms,
    // NUEVO Fase 2: Chains moleculares
    molecularChains,
    // La metadata molecular se DERIVA en derivation-engine
    // Aquí solo proporcionamos los átomos
    extractedAt: new Date().toISOString()
  };
}

/**
 * NUEVO FASE 3: Analiza el sistema completo (todos los módulos)
 * 
 * @param {string} projectRoot - Raíz del proyecto
 * @param {Array} allMolecules - Todas las moléculas extraídas
 * @returns {Object} - Análisis de módulos y sistema
 */
export async function analyzeProjectSystem(projectRoot, allMolecules) {
  console.log(`[molecular-extractor] Fase 3: Analyzing project system...`);
  
  try {
    // Importar module-system
    const { analyzeModules, enrichMoleculesWithSystemContext } = await import('../module-system/index.js');
    
    // Analizar módulos
    const moduleData = analyzeModules(projectRoot, allMolecules);
    
    // Enriquecer moléculas con contexto de sistema
    const enrichedMolecules = enrichMoleculesWithSystemContext(
      allMolecules,
      moduleData
    );
    
    console.log(`[molecular-extractor] Fase 3: Analyzed ${moduleData.summary.totalModules} modules, ${moduleData.summary.totalBusinessFlows} business flows`);
    
    return {
      molecules: enrichedMolecules,
      modules: moduleData.modules,
      system: moduleData.system,
      summary: moduleData.summary
    };
    
  } catch (error) {
    console.error('[molecular-extractor] Error in Fase 3 (Module System):', error.message);
    return {
      molecules: allMolecules,
      modules: [],
      system: null,
      summary: { totalModules: 0, totalBusinessFlows: 0 }
    };
  }
}
