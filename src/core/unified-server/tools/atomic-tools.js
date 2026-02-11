/**
 * @fileoverview Atomic/Molecular Tools
 * 
 * Herramientas para análisis atómico (funciones) y molecular (archivos)
 *
 * ARCHITECTURE: Layer C (MCP Tool Layer)
 * Exposes atomic/molecular data to AI agents via MCP protocol
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 EXTENSION GUIDE - Adding New Atomic/Molecular Tools
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * To add a new tool that queries or analyzes atoms/molecules:
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * OPTION A: New Atomic Analysis Tool (function-level)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Use when you want to provide AI with insights about specific functions.
 *
 * 1️⃣  CREATE TOOL FUNCTION (add after existing functions, line ~230+)
 *
 *     /**
 *      * Analyzes test coverage for a specific function
 *      * Shows which test files cover this function and coverage percentage
 *      * 
 *      * @param {string} filePath - Path to the file containing the function
 *      * @param {string} functionName - Name of the function to analyze
 *      * @returns {Promise<Object>} - Test coverage analysis
 *      * /
 *     export async function analyzeFunctionTestCoverage(filePath, functionName) {
 *       try {
 *         // Get atom data (reuses existing query)
 *         const atom = await getAtomDetails(this.projectPath, filePath, functionName, this.cache);
 *         
 *         if (!atom) {
 *           return { error: `Function '${functionName}' not found` };
 *         }
 *         
 *         // Query for test files that reference this function
 *         const { findTestReferences } = await import('../../../layer-a-static/query/test-queries.js');
 *         const testRefs = await findTestReferences(this.projectPath, atom.id);
 *         
 *         // Build response for AI
 *         return {
 *           function: functionName,
 *           file: filePath,
 *           testCoverage: {
 *             hasTests: testRefs.length > 0,
 *             testCount: testRefs.length,
 *             testFiles: testRefs.map(ref => ref.file),
 *             coveragePercentage: testRefs.length > 0 ? 
 *               calculateCoverage(atom, testRefs) : 0
 *           },
 *           recommendations: testRefs.length === 0 ? 
 *             ['Function has no tests - consider adding unit tests'] : []
 *         };
 *       } catch (error) {
 *         return { error: error.message };
 *       }
 *     }
 *
 * 2️⃣  EXPORT FROM index.js (src/core/unified-server/tools/index.js):
 *
 *     // Atomic/Molecular Tools
 *     export {
 *       getFunctionDetails,
 *       getMoleculeSummary,
 *       analyzeFunctionChange,
 *       getAtomicFunctions,
 *       analyzeFunctionTestCoverage,  // NEW
 *     } from './atomic-tools.js';
 *
 * 3️⃣  ADD TOOL DEFINITION in: src/layer-c-memory/mcp/tools/index.js
 *
 *     For AI agents to discover and use this tool, add to toolDefinitions array.
 *     See server-class.js EXTENSION GUIDE for details.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * OPTION B: New Molecular Tool (file-level)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Use when analyzing files as a whole (e.g., architecture patterns, file metrics).
 *
 *     export async function getFileArchitectureMetrics(filePath) {
 *       const data = await getFileAnalysisWithAtoms(this.projectPath, filePath, this.cache);
 *       
 *       if (!data || !data.derived) {
 *         return { error: 'No molecular data available' };
 *       }
 *       
 *       return {
 *         filePath,
 *         cohesion: calculateCohesion(data.atoms),
 *         coupling: await calculateCoupling(filePath, this.projectPath),
 *         stability: calculateStability(data.derived),
 *         abstractness: calculateAbstractness(data.atoms),
 *         // Distance from main sequence (D = |A + I - 1|)
 *         distanceFromMainSequence: calculateDistance(data)
 *       };
 *     }
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚠️  PRINCIPLES TO MAINTAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ✓ Layer C only: Use existing data from cache/queries, don't do new analysis
 * ✓ Context usage: Always use this.projectPath and this.cache from context
 * ✓ Error handling: Return { error: message } instead of throwing
 * ✓ AI-friendly: Structure responses for AI consumption
 *   - Use clear, descriptive keys
 *   - Include counts and summaries
 *   - Provide recommendations when applicable
 * ✓ Performance: Use cache.get() before querying disk
 * ✓ SSOT: Use query layer functions (getAtomDetails, getFileAnalysisWithAtoms)
 *   Don't read .omnysysdata files directly
 *
 * 🔗  DATA FLOW:
 *     molecular-extractor.js (Layer A) 
 *         ↓ creates atoms
 *     derivation-engine.js (Layer B)
 *         ↓ derives molecular metadata
 *     query/*.js (Layer C - Data Access)
 *         ↓ provides unified interface
 *     THIS FILE (Layer C - Tools)
 *         ↓ exposes to AI via MCP
 *
 * 🧪  TESTING NEW TOOLS:
 *     1. Test function directly: node -e "import('./atomic-tools.js').then(m => m.yourTool())"
 *     2. Test via MCP: Use the tool from Claude/OpenCode after restarting server
 *     3. Check logs: Server logs show tool execution time and errors
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * @module unified-server/tools/atomic-tools
 * @phase Layer C (MCP Tools)
 * @dependencies layer-a-static/query/*, derivation-engine (indirect)
 */

import {
  getAtomDetails,
  getFileAnalysisWithAtoms
} from '../../../layer-a-static/query/apis/file-api.js';

/**
 * Obtiene detalles de una función específica (átomo)
 * @param {string} filePath - Ruta del archivo
 * @param {string} functionName - Nombre de la función
 * @returns {Promise<Object>} - Detalles atómicos
 */
export async function getFunctionDetails(filePath, functionName) {
  try {
    const atom = await getAtomDetails(this.projectPath, filePath, functionName, this.cache);

    if (!atom) {
      return {
        error: `Function '${functionName}' not found in ${filePath}`,
        suggestion: 'The function may not be analyzed yet or is an anonymous function'
      };
    }

    return {
      atom: {
        id: atom.id,
        name: atom.name,
        type: 'atom',
        line: atom.line,
        linesOfCode: atom.linesOfCode,
        complexity: atom.complexity,
        isExported: atom.isExported,
        isAsync: atom.isAsync
      },
      archetype: atom.archetype,
      sideEffects: {
        hasNetworkCalls: atom.hasNetworkCalls,
        hasDomManipulation: atom.hasDomManipulation,
        hasStorageAccess: atom.hasStorageAccess,
        hasLogging: atom.hasLogging,
        networkEndpoints: atom.networkEndpoints
      },
      callGraph: {
        calls: atom.calls?.length || 0,
        externalCalls: atom.externalCallCount,
        calledBy: atom.calledBy?.length || 0,
        callers: atom.calledBy || []
      },
      quality: {
        hasErrorHandling: atom.hasErrorHandling,
        hasNestedLoops: atom.hasNestedLoops,
        hasBlockingOps: atom.hasBlockingOps
      }
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Obtiene resumen molecular de un archivo
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Object>} - Resumen molecular
 */
export async function getMoleculeSummary(filePath) {
  try {
    const data = await getFileAnalysisWithAtoms(this.projectPath, filePath, this.cache);

    if (!data) {
      return { error: `File not found: ${filePath}` };
    }

    if (!data.atoms || data.atoms.length === 0) {
      return {
        filePath,
        atomsAvailable: false,
        message: 'No atomic analysis available for this file'
      };
    }

    return {
      filePath,
      atomsAvailable: true,
      molecule: data.derived,
      stats: data.stats,
      atoms: data.atoms.map(atom => ({
        id: atom.id,
        name: atom.name,
        archetype: atom.archetype,
        complexity: atom.complexity,
        isExported: atom.isExported,
        calledBy: atom.calledBy?.length || 0
      })),
      insights: {
        hasDeadCode: data.stats.deadAtoms > 0,
        hasHotPaths: data.stats.hotPathAtoms > 0,
        hasFragileNetwork: data.stats.fragileNetworkAtoms > 0,
        riskLevel: data.derived?.archetype?.severity > 7 ? 'high' :
                   data.derived?.archetype?.severity > 4 ? 'medium' : 'low'
      }
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Analiza el impacto de cambiar una función
 * @param {string} filePath - Ruta del archivo
 * @param {string} functionName - Nombre de la función
 * @returns {Promise<Object>} - Análisis de impacto
 */
export async function analyzeFunctionChange(filePath, functionName) {
  try {
    const atom = await getAtomDetails(this.projectPath, filePath, functionName);

    if (!atom) {
      return { error: `Function '${functionName}' not found` };
    }

    return {
      function: functionName,
      file: filePath,
      atomId: atom.id,
      directImpact: {
        callers: atom.calledBy || [],
        callerCount: atom.calledBy?.length || 0,
        isExported: atom.isExported
      },
      dependencies: {
        calls: atom.calls || [],
        externalCalls: atom.externalCalls || [],
        internalCalls: atom.internalCalls || []
      },
      risk: {
        level: atom.archetype?.severity > 7 ? 'critical' :
               atom.archetype?.severity > 4 ? 'high' :
               atom.archetype?.severity > 2 ? 'medium' : 'low',
        archetype: atom.archetype?.type,
        severity: atom.archetype?.severity,
        reason: getRiskReason(atom.archetype?.type)
      },
      recommendation: getRecommendation(atom.archetype?.type)
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Obtiene lista de funciones atómicas de un archivo
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Object>} - Lista de funciones
 */
export async function getAtomicFunctions(filePath) {
  try {
    const data = await getFileAnalysisWithAtoms(this.projectPath, filePath, this.cache);
    
    if (!data || !data.atoms || data.atoms.length === 0) {
      return {
        filePath,
        functions: [],
        message: 'No atomic analysis available. Run analysis first.',
        suggestion: 'Use /restart command to reload with new atomic analysis'
      };
    }
    
    const byArchetype = {};
    const exported = [];
    const internal = [];
    
    for (const atom of data.atoms) {
      const archetype = atom.archetype?.type || 'unknown';
      if (!byArchetype[archetype]) {
        byArchetype[archetype] = [];
      }
      byArchetype[archetype].push({
        name: atom.name,
        line: atom.line,
        complexity: atom.complexity,
        calledBy: atom.calledBy?.length || 0
      });
      
      if (atom.isExported) {
        exported.push({
          name: atom.name,
          archetype: archetype,
          complexity: atom.complexity,
          calledBy: atom.calledBy?.length || 0
        });
      } else {
        internal.push({
          name: atom.name,
          archetype: archetype,
          complexity: atom.complexity,
          calledBy: atom.calledBy?.length || 0
        });
      }
    }
    
    return {
      filePath,
      summary: {
        total: data.atoms.length,
        exported: exported.length,
        internal: internal.length,
        archetypes: Object.keys(byArchetype)
      },
      byArchetype,
      exported: exported.sort((a, b) => b.calledBy - a.calledBy),
      internal: internal.sort((a, b) => b.calledBy - a.calledBy),
      insights: {
        deadCode: byArchetype['dead-function'] || [],
        hotPaths: byArchetype['hot-path'] || [],
        fragile: byArchetype['fragile-network'] || [],
        godFunctions: byArchetype['god-function'] || []
      }
    };
  } catch (error) {
    return { error: error.message };
  }
}

// Helpers

function getRiskReason(archetypeType) {
  const reasons = {
    'hot-path': 'Function is called from multiple places',
    'fragile-network': 'Function makes network calls without proper error handling',
    'god-function': 'Function is too complex',
    'dead-function': 'Function is not used anywhere',
    'default': 'Standard function'
  };
  return reasons[archetypeType] || reasons.default;
}

function getRecommendation(archetypeType) {
  const recommendations = {
    'fragile-network': 'Add try/catch blocks before modifying network logic',
    'hot-path': 'Changes will affect multiple callers - test thoroughly',
    'dead-function': 'Function is safe to remove or refactor',
    'default': 'Standard changes - proceed with normal testing'
  };
  return recommendations[archetypeType] || recommendations.default;
}
