/**
 * @fileoverview Unified Server API Methods - Métodos internos del servidor REST
 * 
 * ⚠️  IMPORTANTE: Este archivo NO contiene Tools MCP.
 *      Estos son métodos internos usados por la API REST del servidor.
 * 
 * 📍 Ubicación: src/core/unified-server/tools.js
 * 🎯 Uso: API REST interna (endpoints HTTP en puertos 9999/9998)
 * 🔌 Consumido por: VS Code extension, API clients, UI web
 * 
 * Diferencia con mcp/tools/:
 * - ESTE archivo: Métodos internos del servidor (REST API)
 * - mcp/tools/: Tools oficiales MCP para Claude Code
 * 
 * Estos métodos se asignan al prototype del servidor en index.js:
 *   Object.assign(OmnySysUnifiedServer.prototype, ..., tools)
 * 
 * Y se usan en los endpoints definidos en api.js:
 *   this.bridgeApp.get('/api/impact/*', async (req, res) => {
 *     const impact = await this.getImpactMap(filePath);
 *   })
 * 
 * @module core/unified-server/tools
 */

import {
  getFileDependencies,
  getFileAnalysis,
  getFileAnalysisWithAtoms,
  getAtomDetails,
  getAllConnections,
  getRiskAssessment,
  getProjectMetadata,
  findFiles
} from '../../layer-a-static/query/index.js';

// ============================================================
// REST API Methods (Internal Server API)
// ============================================================

export async function getImpactMap(filePath) {
  const cached = this.cache.ramCacheGet(`impact:${filePath}`);
  if (cached) return cached;

  try {
    const deps = await getFileDependencies(this.projectPath, filePath);
    const fileData = await getFileAnalysis(this.projectPath, filePath);

    const result = {
      file: filePath,
      directlyAffects: deps.usedBy || [],
      transitiveAffects: deps.transitiveDependents || [],
      semanticConnections: fileData.semanticConnections || [],
      totalAffected:
        (deps.usedBy?.length || 0) +
        (deps.transitiveDependents?.length || 0) +
        (fileData.semanticConnections?.length || 0),
      riskLevel: fileData.riskScore?.severity || 'unknown',
      subsystem: fileData.subsystem
    };

    this.cache.ramCacheSet(`impact:${filePath}`, result);
    return result;
  } catch (error) {
    return { error: error.message };
  }
}

export async function analyzeChange(filePath, symbolName) {
  try {
    const fileData = await getFileAnalysis(this.projectPath, filePath);
    const symbol = fileData.exports?.find((e) => e.name === symbolName);

    if (!symbol) {
      return { error: `Symbol '${symbolName}' not found in ${filePath}` };
    }

    const impactMap = await this.getImpactMap(filePath);

    return {
      symbol: symbolName,
      file: filePath,
      symbolType: symbol.kind,
      directDependents: impactMap.directlyAffects,
      transitiveDependents: impactMap.transitiveAffects,
      riskLevel: fileData.riskScore?.severity,
      recommendation: fileData.riskScore?.severity === 'critical'
        ? 'âš ï¸ HIGH RISK - This change affects many files'
        : 'âœ“ Safe - Limited scope'
    };
  } catch (error) {
    return { error: error.message };
  }
}

export async function explainConnection(fileA, fileB) {
  try {
    const connections = this.cache.ramCacheGet('connections') ||
      await getAllConnections(this.projectPath);

    const relevant = connections.sharedState
      ?.filter(
        (c) =>
          (c.sourceFile === fileA && c.targetFile === fileB) ||
          (c.sourceFile === fileB && c.targetFile === fileA)
      )
      .slice(0, 5);

    if (!relevant || relevant.length === 0) {
      return { fileA, fileB, connected: false, reason: 'No direct connections found' };
    }

    return {
      fileA,
      fileB,
      connected: true,
      connections: relevant.map((c) => ({
        type: c.type,
        property: c.globalProperty,
        reason: c.reason,
        severity: c.severity
      }))
    };
  } catch (error) {
    return { error: error.message };
  }
}

export async function getRisk(minSeverity = 'medium') {
  try {
    const assessment = this.cache.ramCacheGet('assessment') ||
      await getRiskAssessment(this.projectPath);

    const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    const minLevel = severityOrder[minSeverity];

    const filtered = assessment.report.mediumRiskFiles
      ?.concat(assessment.report.highRiskFiles || [])
      .filter((f) => severityOrder[f.severity] >= minLevel)
      .slice(0, 10);

    return {
      summary: assessment.report.summary,
      topRiskFiles: filtered,
      recommendation: assessment.report.summary.criticalCount > 0
        ? 'ðŸš¨ Critical issues detected - Review high-risk files'
        : 'âœ“ Risk levels acceptable'
    };
  } catch (error) {
    return { error: error.message };
  }
}

export async function searchFiles(pattern) {
  try {
    const results = await findFiles(this.projectPath, pattern);
    return { pattern, found: results.length, files: results.slice(0, 20) };
  } catch (error) {
    return { error: error.message };
  }
}

// ============================================================
// Status & Reporting
// ============================================================

export async function getFullStatus() {
  return {
    server: {
      version: '2.0.0',
      initialized: this.initialized,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      ports: this.ports
    },
    orchestrator: {
      status: this.isRunning ? 'running' : 'paused',
      currentJob: this.currentJob,
      queue: this.queue.getAll(),
      stats: this.stats
    },
    project: {
      path: this.projectPath,
      totalFiles: this.metadata?.metadata?.totalFiles || 0,
      totalFunctions: this.metadata?.metadata?.totalFunctions || 0
    },
    cache: this.cache.getCacheStats()
  };
}

export async function getFilesStatus() {
  try {
    const metadata = await getProjectMetadata(this.projectPath);
    const files = Object.keys(metadata.files || {}).map(filePath => ({
      path: filePath,
      analyzed: true,
      riskScore: metadata.files[filePath].riskScore?.total || 0,
      riskSeverity: metadata.files[filePath].riskScore?.severity || 'low',
      exports: metadata.files[filePath].exports?.length || 0,
      imports: metadata.files[filePath].imports?.length || 0,
      subsystem: metadata.files[filePath].subsystem
    }));

    return { files, total: files.length };
  } catch (error) {
    return { error: error.message };
  }
}

export async function getFileTool(filePath) {
  try {
    const fileData = await getFileAnalysis(this.projectPath, filePath);
    return {
      path: filePath,
      exists: !!fileData,
      analysis: fileData
    };
  } catch (error) {
    return { error: error.message };
  }
}

// ============================================================
// Atomic/Molecular Tools (New)
// ============================================================

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
      // High-level insights
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

export async function analyzeFunctionChange(filePath, functionName) {
  try {
    const atom = await getAtomDetails(this.projectPath, filePath, functionName);

    if (!atom) {
      return { error: `Function '${functionName}' not found` };
    }

    const impact = {
      function: functionName,
      file: filePath,
      atomId: atom.id,

      // Impacto directo
      directImpact: {
        callers: atom.calledBy || [],
        callerCount: atom.calledBy?.length || 0,
        isExported: atom.isExported
      },

      // Qué funciones llama esta función
      dependencies: {
        calls: atom.calls || [],
        externalCalls: atom.externalCalls || [],
        internalCalls: atom.internalCalls || []
      },

      // Riesgo basado en arquetipo
      risk: {
        level: atom.archetype?.severity > 7 ? 'critical' :
               atom.archetype?.severity > 4 ? 'high' :
               atom.archetype?.severity > 2 ? 'medium' : 'low',
        archetype: atom.archetype?.type,
        severity: atom.archetype?.severity,
        reason: atom.archetype?.type === 'hot-path' ? 'Function is called from multiple places' :
                atom.archetype?.type === 'fragile-network' ? 'Function makes network calls without proper error handling' :
                atom.archetype?.type === 'god-function' ? 'Function is too complex' :
                atom.archetype?.type === 'dead-function' ? 'Function is not used anywhere' : 'Standard function'
      },

      // Recomendación
      recommendation: atom.archetype?.type === 'fragile-network'
        ? 'Add try/catch blocks before modifying network logic'
        : atom.archetype?.type === 'hot-path'
        ? 'Changes will affect multiple callers - test thoroughly'
        : atom.archetype?.type === 'dead-function'
        ? 'Function is safe to remove or refactor'
        : 'Standard changes - proceed with normal testing'
    };

    return impact;
  } catch (error) {
    return { error: error.message };
  }
}

// ============================================================
// Server Management Tools
// ============================================================

export async function restartServer(clearCache = false) {
  try {
    console.log('🔄 Reiniciando servidor OmnySys...');
    
    const result = {
      restarting: true,
      clearCache: clearCache,
      timestamp: new Date().toISOString(),
      message: 'Server restart initiated'
    };
    
    // Si se solicita, limpiar el caché antes de reiniciar
    if (clearCache && this.cache) {
      console.log('🧹 Limpiando caché...');
      this.cache.clear();
      result.cacheCleared = true;
    }
    
    // Invalidar caché de análisis para forzar re-análisis
    if (this.cache) {
      this.cache.invalidate('analysis:*');
      this.cache.invalidate('atom:*');
      this.cache.invalidate('derived:*');
      this.cache.invalidate('impact:*');
      result.cacheInvalidated = true;
    }
    
    // Programar el reinicio
    setTimeout(async () => {
      console.log('👋 Cerrando servidor actual...');
      await this.shutdown();
      console.log('🚀 Reiniciando...');
      process.exit(0); // El proceso padre debería reiniciar el servidor
    }, 1000);
    
    return result;
  } catch (error) {
    return { error: error.message };
  }
}

export async function clearAnalysisCache() {
  try {
    if (!this.cache) {
      return { error: 'Cache not initialized' };
    }
    
    const beforeStats = this.cache.getRamStats();
    
    // Limpiar solo el caché de análisis (no todo)
    this.cache.invalidate('analysis:*');
    this.cache.invalidate('atom:*');
    this.cache.invalidate('derived:*');
    this.cache.invalidate('impact:*');
    this.cache.invalidate('connections');
    this.cache.invalidate('assessment');
    
    const afterStats = this.cache.getRamStats();
    
    return {
      cleared: true,
      before: beforeStats,
      after: afterStats,
      message: 'Analysis cache cleared successfully'
    };
  } catch (error) {
    return { error: error.message };
  }
}

// ============================================================
// Atomic Functions Overview Tool
// ============================================================

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
    
    // Organizar funciones por categoría
    const byArchetype = {};
    const exported = [];
    const internal = [];
    
    for (const atom of data.atoms) {
      // Por arquetipo
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
      
      // Por visibilidad
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
