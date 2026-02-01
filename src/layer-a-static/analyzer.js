/**
 * Analyzer - Análisis automático de gaps y anti-patterns
 *
 * Responsabilidad:
 * - Detectar código muerto (unused exports, orphan files)
 * - Identificar hotspots (funciones críticas)
 * - Reportar ciclos y cadenas profundas
 * - Generar métricas de calidad
 *
 * PRINCIPIO: Cada función hace UNA cosa (SRP)
 */

/**
 * Genera reporte completo de análisis
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte con todos los análisis
 */
export function generateAnalysisReport(systemMap) {
  // Calcular todos los análisis PRIMERO
  const analyses = {
    unusedExports: findUnusedExports(systemMap),
    orphanFiles: findOrphanFiles(systemMap),
    hotspots: findHotspots(systemMap),
    circularFunctionDeps: findCircularFunctionDeps(systemMap),
    deepDependencyChains: findDeepDependencyChains(systemMap),
    sideEffectMarkers: detectSideEffectMarkers(systemMap),
    reachabilityAnalysis: analyzeReachability(systemMap),
    couplingAnalysis: analyzeCoupling(systemMap),
    // NUEVOS: Para evitar trabajo innecesario de IA
    unresolvedImports: findUnresolvedImports(systemMap),
    circularImports: findCircularImports(systemMap),
    unusedImports: findUnusedImports(systemMap),
    reexportChains: analyzeReexportChains(systemMap)
  };

  // Ahora calcular métricas y recomendaciones basadas en análisis
  const qualityMetrics = calculateQualityMetrics(analyses);
  const recommendations = generateRecommendations(analyses);

  return {
    metadata: systemMap.metadata,
    ...analyses,
    qualityMetrics: qualityMetrics,
    recommendations: recommendations
  };
}

// ============================================================================
// TIER 1: ANÁLISIS BÁSICOS
// ============================================================================

/**
 * Encuentra exports que nunca se importan (código muerto)
 */
function findUnusedExports(systemMap) {
  const unusedByFile = {};

  for (const [filePath, fileNode] of Object.entries(systemMap.files)) {
    const unusedInFile = [];

    // Obtener las funciones de este archivo
    const fileFunctions = systemMap.functions[filePath] || [];

    for (const func of fileFunctions) {
      if (!func.isExported) continue;

      // Buscar si esta función se importa en algún lado
      const isUsed = systemMap.function_links.some(link => link.to === func.id);

      if (!isUsed) {
        unusedInFile.push({
          name: func.name,
          line: func.line,
          callers: 0,
          severity: 'warning'
        });
      }
    }

    if (unusedInFile.length > 0) {
      unusedByFile[filePath] = unusedInFile;
    }
  }

  return {
    totalUnused: Object.values(unusedByFile).flat().length,
    byFile: unusedByFile,
    impact: `Removing unused exports could reduce: ${Object.values(unusedByFile).flat().length} functions`
  };
}

/**
 * Encuentra archivos sin dependencias (entrada points o código muerto)
 */
function findOrphanFiles(systemMap) {
  const orphans = [];

  for (const [filePath, fileNode] of Object.entries(systemMap.files)) {
    const hasIncomingDeps = fileNode.usedBy && fileNode.usedBy.length > 0;
    const hasOutgoingDeps = fileNode.dependsOn && fileNode.dependsOn.length > 0;

    if (!hasIncomingDeps && !hasOutgoingDeps) {
      orphans.push({
        file: filePath,
        type: isLikelyEntryPoint(filePath) ? 'ENTRY_POINT' : 'DEAD_CODE',
        functions: (systemMap.functions[filePath] || []).length,
        recommendation: isLikelyEntryPoint(filePath)
          ? 'This is likely your entry point - ignore'
          : 'Consider removing or linking this file'
      });
    }
  }

  return {
    total: orphans.length,
    files: orphans,
    deadCodeCount: orphans.filter(o => o.type === 'DEAD_CODE').length
  };
}

/**
 * Encuentra funciones llamadas desde muchos otros lugares (hotspots críticos)
 */
function findHotspots(systemMap) {
  const callCounts = new Map();

  // Contar cuántos links apuntan a cada función
  for (const link of systemMap.function_links) {
    const current = callCounts.get(link.to) || { count: 0, callers: [] };
    current.count++;
    current.callers.push(link.from);
    callCounts.set(link.to, current);
  }

  // Filtrar hotspots (>= 5 callers)
  const hotspots = Array.from(callCounts.entries())
    .filter(([id, data]) => data.count >= 5)
    .map(([id, data]) => ({
      functionId: id,
      callers: data.count,
      callersList: [...new Set(data.callers)],
      severity: data.count >= 15 ? 'CRITICAL' : data.count >= 10 ? 'HIGH' : 'MEDIUM',
      recommendation: `Edit carefully - affects ${data.count} function(s)`
    }))
    .sort((a, b) => b.callers - a.callers);

  return {
    total: hotspots.length,
    functions: hotspots,
    criticalCount: hotspots.filter(h => h.severity === 'CRITICAL').length
  };
}

/**
 * Detecta ciclos entre funciones (A → B → A)
 */
function findCircularFunctionDeps(systemMap) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();

  function dfs(nodeId, path) {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    // Encontrar todos los links que SALEN de este nodo
    const outgoingLinks = systemMap.function_links.filter(
      link => link.from === nodeId
    );

    for (const link of outgoingLinks) {
      const targetId = link.to;

      if (!visited.has(targetId)) {
        dfs(targetId, [...path]);
      } else if (recursionStack.has(targetId)) {
        // Ciclo encontrado
        const cycleStart = path.indexOf(targetId);
        const cycle = path.slice(cycleStart).concat([targetId]);
        cycles.push({
          cycle: cycle,
          length: cycle.length,
          severity: cycle.length === 2 ? 'CRITICAL' : 'WARNING'
        });
      }
    }

    recursionStack.delete(nodeId);
  }

  // Ejecutar DFS desde cada función
  for (const link of systemMap.function_links) {
    if (!visited.has(link.from)) {
      dfs(link.from, []);
    }
  }

  return {
    total: cycles.length,
    cycles: cycles,
    hasMutualRecursion: cycles.some(c => c.length === 2),
    recommendation: cycles.length > 0
      ? 'Review circular dependencies - can cause infinite loops'
      : 'No circular function dependencies detected'
  };
}

/**
 * Encuentra cadenas profundas de dependencias (A → B → C → D → E → F)
 */
function findDeepDependencyChains(systemMap) {
  const chains = [];
  const visited = new Set();

  function buildChain(currentId, path, maxDepth = 10) {
    if (path.length > maxDepth) {
      return [path.slice(0, maxDepth)];
    }

    const outgoing = systemMap.function_links.filter(
      link => link.from === currentId && !path.includes(link.to)
    );

    if (outgoing.length === 0) {
      return [path];
    }

    const allChains = [];
    for (const link of outgoing) {
      allChains.push(...buildChain(link.to, [...path, link.to], maxDepth));
    }
    return allChains;
  }

  // Buscar cadenas desde funciones sin incoming (entry functions)
  for (const link of systemMap.function_links) {
    const hasIncoming = systemMap.function_links.some(l => l.to === link.from);
    if (!hasIncoming && !visited.has(link.from)) {
      const chainsFromHere = buildChain(link.from, [link.from]);
      chainsFromHere.forEach(chain => {
        if (chain.length >= 5) {
          chains.push({
            chain: chain,
            depth: chain.length,
            impact: `Changing root function affects ${chain.length} levels`
          });
        }
      });
      visited.add(link.from);
    }
  }

  return {
    totalDeepChains: chains.length,
    maxDepth: chains.length > 0 ? Math.max(...chains.map(c => c.depth)) : 0,
    chains: chains.sort((a, b) => b.depth - a.depth).slice(0, 10), // Top 10
    recommendation:
      chains.length > 0
        ? `Found ${chains.length} deep dependency chains - high risk for tunnel vision`
        : 'No very deep dependency chains detected'
  };
}

// ============================================================================
// TIER 2: ANÁLISIS AVANZADOS
// ============================================================================

/**
 * Detecta funciones/archivos que podrían tener efectos secundarios
 * (Basado en patrones de nombres y referencias)
 */
function detectSideEffectMarkers(systemMap) {
  const markers = [];
  const sideEffectPatterns = [
    'init',
    'setup',
    'start',
    'configure',
    'register',
    'listen',
    'watch',
    'subscribe',
    'connect',
    'open'
  ];

  for (const [filePath, fileNode] of Object.entries(systemMap.files)) {
    const fileFunctions = systemMap.functions[filePath] || [];

    for (const func of fileFunctions) {
      const funcNameLower = func.name.toLowerCase();
      const hasSideEffectMarker = sideEffectPatterns.some(pattern =>
        funcNameLower.includes(pattern)
      );

      if (hasSideEffectMarker) {
        markers.push({
          file: filePath,
          function: func.name,
          suspectedSideEffect: true,
          marker: sideEffectPatterns.find(p => funcNameLower.includes(p)),
          recommendation: 'Verify this function has no hidden side effects'
        });
      }
    }
  }

  return {
    total: markers.length,
    functions: markers.slice(0, 20), // Top 20
    note: 'These are pattern-based guesses - verify manually'
  };
}

/**
 * Analiza qué código es alcanzable desde puntos de entrada
 */
function analyzeReachability(systemMap) {
  // Estimar entry points (archivos con pocas dependencias entrantes)
  const likelyEntryPoints = Object.entries(systemMap.files)
    .filter(([path, node]) => {
      const usedByCount = node.usedBy?.length || 0;
      return usedByCount === 0;
    })
    .map(([path]) => path);

  // Contar archivos alcanzables
  const reachable = new Set();
  const unreachable = new Set();

  function traverse(filePath) {
    if (reachable.has(filePath)) return;
    reachable.add(filePath);

    const fileNode = systemMap.files[filePath];
    if (fileNode && fileNode.dependsOn) {
      fileNode.dependsOn.forEach(dep => traverse(dep));
    }
  }

  // Traverse desde entry points
  likelyEntryPoints.forEach(ep => traverse(ep));

  // El resto es "unreachable"
  Object.keys(systemMap.files).forEach(file => {
    if (!reachable.has(file)) {
      unreachable.add(file);
    }
  });

  const reachablePercent = (reachable.size / systemMap.metadata.totalFiles) * 100;

  return {
    totalFiles: systemMap.metadata.totalFiles,
    reachable: reachable.size,
    unreachable: unreachable.size,
    reachablePercent: reachablePercent.toFixed(1),
    likelyEntryPoints: likelyEntryPoints,
    deadCodeFiles: Array.from(unreachable).slice(0, 10),
    concern: reachablePercent < 70 ? 'HIGH' : reachablePercent < 85 ? 'MEDIUM' : 'LOW'
  };
}

/**
 * Analiza acoplamiento entre archivos (cuánto dependen uno del otro)
 */
function analyzeCoupling(systemMap) {
  const couplings = [];

  for (const [filePath, fileNode] of Object.entries(systemMap.files)) {
    const bidirectionalDeps = fileNode.dependsOn.filter(dep =>
      systemMap.files[dep]?.usedBy?.includes(filePath)
    );

    if (bidirectionalDeps.length > 0) {
      couplings.push({
        file: filePath,
        coupledWith: bidirectionalDeps,
        couplingStrength: bidirectionalDeps.length,
        recommendation:
          bidirectionalDeps.length > 2
            ? 'High coupling detected - consider refactoring'
            : 'Moderate coupling'
      });
    }
  }

  return {
    total: couplings.length,
    coupledFiles: couplings.sort((a, b) => b.couplingStrength - a.couplingStrength),
    maxCoupling:
      couplings.length > 0 ? Math.max(...couplings.map(c => c.couplingStrength)) : 0,
    concern: couplings.length > 5 ? 'HIGH' : 'LOW'
  };
}

/**
 * Encuentra imports que no se resolvieron (rotos o externos sin tracking)
 */
function findUnresolvedImports(systemMap) {
  const unresolvedByFile = systemMap.unresolvedImports || {};
  const total = Object.values(unresolvedByFile).flat().length;

  return {
    total: total,
    byFile: unresolvedByFile,
    recommendation: total > 0 ? `Fix ${total} unresolved import(s) - they may break at runtime` : 'All imports resolved'
  };
}

/**
 * Encuentra circular imports (A imports B, B imports A)
 */
function findCircularImports(systemMap) {
  const cycles = systemMap.metadata.cyclesDetected || [];
  const circularImportPairs = [];

  // Procesar ciclos detectados
  for (const cycle of cycles) {
    if (cycle && Array.isArray(cycle) && cycle.length >= 2) {
      // Verificar que sea un ciclo directo (A -> B -> A)
      for (let i = 0; i < cycle.length; i++) {
        const current = cycle[i];
        const next = cycle[(i + 1) % cycle.length];

        // Solo reportar ciclos de 2 (importación directa circular)
        if (cycle.length === 2) {
          const pair = [current, next].sort().join(' <-> ');
          if (!circularImportPairs.includes(pair)) {
            circularImportPairs.push(pair);
          }
        }
      }
    }
  }

  // Verificar ciclos de archivo usando DFS
  const visited = new Set();
  const recursionStack = new Set();
  const foundCycles = [];

  function hasCycle(filePath) {
    visited.add(filePath);
    recursionStack.add(filePath);

    const fileNode = systemMap.files[filePath];
    if (fileNode && fileNode.dependsOn) {
      for (const dependency of fileNode.dependsOn) {
        if (!visited.has(dependency)) {
          if (hasCycle(dependency)) {
            return true;
          }
        } else if (recursionStack.has(dependency)) {
          // Ciclo encontrado
          if (!foundCycles.some(c => c.includes(filePath) && c.includes(dependency))) {
            foundCycles.push([filePath, dependency]);
          }
          return true;
        }
      }
    }

    recursionStack.delete(filePath);
    return false;
  }

  // Buscar ciclos
  for (const filePath of Object.keys(systemMap.files)) {
    if (!visited.has(filePath)) {
      visited.clear();
      recursionStack.clear();
      hasCycle(filePath);
    }
  }

  return {
    total: Math.max(foundCycles.length, cycles.length),
    cycles: foundCycles.length > 0 ? foundCycles : cycles,
    circularPairs: circularImportPairs,
    recommendation:
      foundCycles.length > 0 || cycles.length > 0
        ? `Found circular imports - breaks module loading`
        : 'No circular imports detected'
  };
}

/**
 * Encuentra imports que se hacen pero no se usan en ese archivo
 */
function findUnusedImports(systemMap) {
  const unusedByFile = {};
  let totalUnused = 0;

  for (const [filePath, fileNode] of Object.entries(systemMap.files)) {
    const unusedInFile = [];

    // Obtener symbols importados
    for (const importStmt of fileNode.imports) {
      for (const spec of importStmt.specifiers || []) {
        const importedName = spec.local || spec.imported;

        // Buscar si esta función se llama en este archivo
        const isUsedLocally = (systemMap.functions[filePath] || []).some(func => {
          return func.calls.some(call => call.name === importedName);
        });

        // Buscar si se usa en function_links
        const isUsedAsTarget = systemMap.function_links.some(link => {
          return link.file_to === filePath && link.to.endsWith(`:${importedName}`);
        });

        if (!isUsedLocally && !isUsedAsTarget) {
          unusedInFile.push({
            name: importedName,
            source: importStmt.source,
            type: spec.type,
            severity: 'warning'
          });
          totalUnused++;
        }
      }
    }

    if (unusedInFile.length > 0) {
      unusedByFile[filePath] = unusedInFile;
    }
  }

  return {
    total: totalUnused,
    byFile: unusedByFile,
    recommendation: totalUnused > 0 ? `Remove ${totalUnused} unused import(s) to reduce confusion` : 'All imports are used'
  };
}

/**
 * Rastrea cadenas de re-exports (A→B→C)
 */
function analyzeReexportChains(systemMap) {
  const chains = [];
  const visited = new Set();

  // Buscar archivos que solo reexportan (no tienen funciones originales)
  for (const [filePath, fileNode] of Object.entries(systemMap.files)) {
    const functions = systemMap.functions[filePath] || [];
    const isBarrel = functions.length === 0 && fileNode.exports.length > 0 && fileNode.imports.length > 0;

    if (isBarrel && !visited.has(filePath)) {
      // Seguir la cadena
      const chain = [filePath];
      let current = filePath;
      visited.add(current);

      while (true) {
        const currentNode = systemMap.files[current];
        if (!currentNode || currentNode.dependsOn.length === 0) break;

        const next = currentNode.dependsOn[0];
        if (visited.has(next)) break;

        chain.push(next);
        visited.add(next);
        current = next;
      }

      if (chain.length > 1) {
        chains.push({
          chain: chain,
          depth: chain.length,
          recommendation: chain.length > 2 ? 'MEDIUM' : 'LOW'
        });
      }
    }
  }

  return {
    total: chains.length,
    chains: chains,
    recommendation: chains.length > 0 ? `Simplify ${chains.length} re-export chain(s) for clarity` : 'No complex re-export chains'
  };
}

// ============================================================================
// MÉTRICAS Y RECOMENDACIONES
// ============================================================================

/**
 * Calcula métricas de calidad general del código
 * NOTA: Se llama DENTRO de generateAnalysisReport, no puede llamar a generateAnalysisReport
 */
function calculateQualityMetrics(analyses) {
  // Scoring (0-100)
  let score = 100;

  // Penalties (destructuring de analyses precalculados)
  if (analyses.unusedExports.totalUnused > 0)
    score -= Math.min(20, analyses.unusedExports.totalUnused);
  if (analyses.orphanFiles.deadCodeCount > 0)
    score -= Math.min(15, analyses.orphanFiles.deadCodeCount * 5);
  if (analyses.hotspots.criticalCount > 0)
    score -= Math.min(25, analyses.hotspots.criticalCount * 10);
  if (analyses.circularFunctionDeps.total > 0)
    score -= Math.min(30, analyses.circularFunctionDeps.total * 15);
  if (analyses.deepDependencyChains.totalDeepChains > 0)
    score -= Math.min(20, analyses.deepDependencyChains.totalDeepChains * 2);
  if (analyses.couplingAnalysis.concern === 'HIGH') score -= 15;
  // NUEVOS: Penalizar imports problemáticos
  if (analyses.unresolvedImports.total > 0)
    score -= Math.min(25, analyses.unresolvedImports.total * 5);
  if (analyses.circularImports.total > 0)
    score -= Math.min(35, analyses.circularImports.total * 20);
  if (analyses.unusedImports.total > 0)
    score -= Math.min(15, Math.ceil(analyses.unusedImports.total / 2));

  score = Math.max(0, Math.min(100, score));

  const grade =
    score >= 85 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F';

  return {
    score: score,
    grade: grade,
    totalIssues:
      analyses.unusedExports.totalUnused +
      analyses.orphanFiles.total +
      analyses.hotspots.total +
      analyses.circularFunctionDeps.total +
      analyses.unresolvedImports.total +
      analyses.circularImports.total +
      analyses.unusedImports.total,
    breakdown: {
      unusedExports: analyses.unusedExports.totalUnused,
      orphanFiles: analyses.orphanFiles.deadCodeCount,
      hotspots: analyses.hotspots.criticalCount,
      circularDeps: analyses.circularFunctionDeps.total,
      deepChains: analyses.deepDependencyChains.totalDeepChains,
      coupling: analyses.couplingAnalysis.total,
      unresolvedImports: analyses.unresolvedImports.total,
      circularImports: analyses.circularImports.total,
      unusedImports: analyses.unusedImports.total,
      reexportChains: analyses.reexportChains.total
    }
  };
}

/**
 * Genera recomendaciones basadas en análisis precalculados
 * NOTA: Recibe analyses como parámetro, no llama a generateAnalysisReport
 */
function generateRecommendations(analyses) {
  const recommendations = [];

  // Recomendación 1: Código muerto
  if (analyses.unusedExports.totalUnused > 3) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Dead Code',
      message: `Remove ${analyses.unusedExports.totalUnused} unused exports to reduce tunnel vision`,
      action: 'Review and delete unused functions'
    });
  }

  // Recomendación 2: Archivos huérfanos
  if (analyses.orphanFiles.deadCodeCount > 2) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Dead Code',
      message: `Found ${analyses.orphanFiles.deadCodeCount} orphan files - potential dead code`,
      action: 'Link or remove orphan files'
    });
  }

  // Recomendación 3: Hotspots críticos
  if (analyses.hotspots.criticalCount > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'Risk Management',
      message: `${analyses.hotspots.criticalCount} critical hotspot(s) - very risky to modify`,
      action: 'Add comprehensive tests before editing hotspots'
    });
  }

  // Recomendación 4: Ciclos
  if (analyses.circularFunctionDeps.total > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Architecture',
      message: `${analyses.circularFunctionDeps.total} circular dependency(ies) - can cause runtime errors`,
      action: 'Refactor to break circular dependencies'
    });
  }

  // Recomendación 5: Cadenas profundas
  if (analyses.deepDependencyChains.totalDeepChains > 2) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Code Quality',
      message: `${analyses.deepDependencyChains.totalDeepChains} deep dependency chains detected`,
      action: 'Consider refactoring to reduce coupling'
    });
  }

  // Recomendación 6: Acoplamiento
  if (analyses.couplingAnalysis.concern === 'HIGH') {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Code Quality',
      message: `High coupling between ${analyses.couplingAnalysis.total} file pairs`,
      action: 'Extract common functionality or apply dependency injection'
    });
  }

  // Recomendación 7: Reachability
  const reach = analyses.reachabilityAnalysis;
  if (parseFloat(reach.reachablePercent) < 70) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Code Health',
      message: `Only ${reach.reachablePercent}% of code is reachable from entry points`,
      action: 'Remove unreachable code or link it to entry points'
    });
  }

  // Recomendación 8: Imports no resueltos (NUEVOS)
  if (analyses.unresolvedImports.total > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'Broken Code',
      message: `${analyses.unresolvedImports.total} unresolved import(s) - may break at runtime`,
      action: 'Fix missing files or incorrect paths in imports'
    });
  }

  // Recomendación 8.5: Circular imports (NUEVOS)
  if (analyses.circularImports.total > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'Architecture',
      message: `${analyses.circularImports.total} circular import(s) detected - breaks module loading`,
      action: 'Refactor to break circular dependencies (move shared code to utility)'
    });
  }

  // Recomendación 9: Imports sin usar (NUEVOS)
  if (analyses.unusedImports.total > 5) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Code Cleanup',
      message: `${analyses.unusedImports.total} unused import(s) - adds confusion`,
      action: 'Remove unused imports to reduce cognitive load for AI'
    });
  } else if (analyses.unusedImports.total > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Code Cleanup',
      message: `${analyses.unusedImports.total} unused import(s) - adds confusion`,
      action: 'Remove unused imports to reduce cognitive load for AI'
    });
  }

  // Recomendación 10: Cadenas de re-exports (NUEVOS)
  if (analyses.reexportChains.total > 2) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Architecture',
      message: `${analyses.reexportChains.total} complex re-export chain(s) found`,
      action: 'Simplify re-export chains or add comments explaining the flow'
    });
  }

  return {
    total: recommendations.length,
    byPriority: {
      CRITICAL: recommendations.filter(r => r.priority === 'CRITICAL').length,
      HIGH: recommendations.filter(r => r.priority === 'HIGH').length,
      MEDIUM: recommendations.filter(r => r.priority === 'MEDIUM').length,
      LOW: recommendations.filter(r => r.priority === 'LOW').length
    },
    recommendations: recommendations.sort((a, b) => {
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Determina si un archivo es probablemente entry point
 */
function isLikelyEntryPoint(filePath) {
  const entryNames = ['index', 'main', 'app', 'cli', 'server', 'start'];
  const fileName = filePath.split('/').pop().toLowerCase();
  return entryNames.some(name => fileName.includes(name));
}
