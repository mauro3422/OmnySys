/**
 * project-structure-analyzer.js
 *
 * Analiza la estructura del proyecto usando cohesión emergente
 *
 * Estrategia:
 * 1. Calcular cohesión entre archivos (basado en metadatos existentes)
 * 2. Detectar clusters naturales (subsistemas)
 * 3. Validar con IA si es necesario
 *
 * NO usa reglas hardcodeadas - la estructura emerge de los datos
 */

import path from 'path';

/**
 * Calcula la cohesión entre dos archivos
 * Basado en metadatos ya existentes (imports, shared state, eventos, directorio)
 *
 * @param {object} fileA - Análisis del archivo A
 * @param {object} fileB - Análisis del archivo B
 * @param {string} pathA - Ruta del archivo A
 * @param {string} pathB - Ruta del archivo B
 * @returns {number} - Score de cohesión (0-10)
 */
function calculateCohesion(fileA, fileB, pathA, pathB) {
  let cohesion = 0;

  // 1. IMPORTS DIRECTOS (+3 puntos - conexión muy fuerte)
  if (fileA.imports?.some(imp => imp.resolvedPath === pathB)) {
    cohesion += 3;
  }
  if (fileB.imports?.some(imp => imp.resolvedPath === pathA)) {
    cohesion += 3;
  }

  // 2. SHARED STATE (+2 puntos - conexión fuerte)
  const semanticA = fileA.semanticAnalysis || {};
  const semanticB = fileB.semanticAnalysis || {};

  const writesA = semanticA.sharedState?.writes || [];
  const readsB = semanticB.sharedState?.reads || [];
  const writesB = semanticB.sharedState?.writes || [];
  const readsA = semanticA.sharedState?.reads || [];

  // A escribe lo que B lee (o viceversa)
  if (writesA.some(w => readsB.includes(w)) || writesB.some(w => readsA.includes(w))) {
    cohesion += 2;
  }

  // 3. EVENTOS (+2 puntos - conexión fuerte)
  const emitsA = semanticA.eventPatterns?.eventEmitters || [];
  const listensB = semanticB.eventPatterns?.eventListeners || [];
  const emitsB = semanticB.eventPatterns?.eventEmitters || [];
  const listensA = semanticA.eventPatterns?.eventListeners || [];

  // A emite lo que B escucha (o viceversa)
  if (emitsA.some(e => listensB.includes(e)) || emitsB.some(e => listensA.includes(e))) {
    cohesion += 2;
  }

  // 4. MISMO DIRECTORIO (+1 punto - señal débil de cohesión)
  if (path.dirname(pathA) === path.dirname(pathB)) {
    cohesion += 1;
  }

  // 5. DIRECTORIO CERCANO (+0.5 puntos - señal muy débil)
  const dirA = path.dirname(pathA).split(path.sep);
  const dirB = path.dirname(pathB).split(path.sep);

  // Contar niveles compartidos
  let sharedLevels = 0;
  for (let i = 0; i < Math.min(dirA.length, dirB.length); i++) {
    if (dirA[i] === dirB[i]) {
      sharedLevels++;
    } else {
      break;
    }
  }

  if (sharedLevels >= 2) {
    cohesion += 0.5;
  }

  return cohesion;
}

/**
 * Calcula matriz de cohesión para todos los archivos del proyecto
 *
 * @param {object} staticResults - Resultados del análisis estático
 * @returns {Map<string, Map<string, number>>} - Matriz de cohesión
 */
export function calculateCohesionMatrix(staticResults) {
  const matrix = new Map();
  const files = Object.keys(staticResults.files || {});

  for (const fileA of files) {
    const cohesionMap = new Map();

    for (const fileB of files) {
      if (fileA === fileB) continue;

      const cohesion = calculateCohesion(
        staticResults.files[fileA],
        staticResults.files[fileB],
        fileA,
        fileB
      );

      if (cohesion > 0) {
        cohesionMap.set(fileB, cohesion);
      }
    }

    matrix.set(fileA, cohesionMap);
  }

  return matrix;
}

/**
 * Detecta clusters de archivos con alta cohesión interna
 * Usa algoritmo simple de clustering basado en cohesión
 *
 * @param {Map<string, Map<string, number>>} cohesionMatrix - Matriz de cohesión
 * @param {number} minCohesion - Cohesión mínima para formar cluster (default: 2)
 * @returns {Array<object>} - Lista de clusters detectados
 */
export function detectClusters(cohesionMatrix, minCohesion = 1) {
  const files = Array.from(cohesionMatrix.keys());
  const visited = new Set();
  const clusters = [];

  for (const startFile of files) {
    if (visited.has(startFile)) continue;

    // BFS para encontrar cluster
    const cluster = new Set([startFile]);
    const queue = [startFile];
    visited.add(startFile);

    while (queue.length > 0) {
      const currentFile = queue.shift();
      const connections = cohesionMatrix.get(currentFile);

      if (!connections) continue;

      for (const [connectedFile, cohesion] of connections.entries()) {
        if (cohesion >= minCohesion && !visited.has(connectedFile)) {
          cluster.add(connectedFile);
          queue.push(connectedFile);
          visited.add(connectedFile);
        }
      }
    }

    // Calcular cohesión interna promedio
    let totalCohesion = 0;
    let connectionCount = 0;

    for (const fileA of cluster) {
      for (const fileB of cluster) {
        if (fileA !== fileB) {
          const cohesion = cohesionMatrix.get(fileA)?.get(fileB) || 0;
          totalCohesion += cohesion;
          connectionCount++;
        }
      }
    }

    const avgCohesion = connectionCount > 0 ? totalCohesion / connectionCount : 0;

    // Detectar directorio común
    const clusterFiles = Array.from(cluster);
    const commonDir = findCommonDirectory(clusterFiles);

    // Generar nombre del cluster
    const clusterName = commonDir
      ? path.basename(commonDir) || 'root'
      : `cluster-${clusters.length + 1}`;

    clusters.push({
      name: clusterName,
      files: clusterFiles,
      cohesion: avgCohesion,
      commonDirectory: commonDir,
      fileCount: cluster.size
    });
  }

  // Ordenar por cohesión (más cohesivos primero)
  clusters.sort((a, b) => b.cohesion - a.cohesion);

  return clusters;
}

/**
 * Encuentra el directorio común más específico para un conjunto de archivos
 * @private
 */
function findCommonDirectory(files) {
  if (files.length === 0) return '';
  if (files.length === 1) return path.dirname(files[0]);

  const dirs = files.map(f => path.dirname(f).split(path.sep));
  let commonParts = [];

  for (let i = 0; i < dirs[0].length; i++) {
    const part = dirs[0][i];
    if (dirs.every(d => d[i] === part)) {
      commonParts.push(part);
    } else {
      break;
    }
  }

  return commonParts.join(path.sep);
}

/**
 * Identifica archivos huérfanos (sin conexiones significativas)
 *
 * @param {object} staticResults - Resultados del análisis estático
 * @param {Map<string, Map<string, number>>} cohesionMatrix - Matriz de cohesión
 * @returns {Array<object>} - Lista de archivos huérfanos con detalles
 */
export function identifyOrphans(staticResults, cohesionMatrix) {
  const orphans = [];

  for (const [filePath, analysis] of Object.entries(staticResults.files || {})) {
    const connections = cohesionMatrix.get(filePath);
    const maxCohesion = connections
      ? Math.max(...Array.from(connections.values()), 0)
      : 0;

    const semantic = analysis.semanticAnalysis || {};
    const hasSideEffects =
      (semantic.sharedState?.writes?.length > 0) ||
      (semantic.eventPatterns?.eventEmitters?.length > 0) ||
      semantic.sideEffects?.hasGlobalAccess ||
      semantic.sideEffects?.usesLocalStorage;

    // Considerar huérfano si:
    // - No tiene imports ni usedBy
    // - Cohesión máxima < 2
    const isOrphan =
      (analysis.imports?.length || 0) === 0 &&
      (analysis.usedBy?.length || 0) === 0 &&
      maxCohesion < 2;

    if (isOrphan) {
      orphans.push({
        file: filePath,
        hasSideEffects,
        severity: hasSideEffects ? 'high' : 'low',
        sharedState: {
          writes: semantic.sharedState?.writes || [],
          reads: semantic.sharedState?.reads || []
        },
        events: {
          emits: semantic.eventPatterns?.eventEmitters || [],
          listens: semantic.eventPatterns?.eventListeners || []
        }
      });
    }
  }

  return orphans;
}

/**
 * Analiza la estructura completa del proyecto
 *
 * @param {object} staticResults - Resultados del análisis estático
 * @returns {object} - Estructura del proyecto con subsistemas detectados
 */
export function analyzeProjectStructure(staticResults) {
  // 1. Calcular cohesión
  const cohesionMatrix = calculateCohesionMatrix(staticResults);

  // 2. Detectar clusters (subsistemas)
  const clusters = detectClusters(cohesionMatrix);

  // 3. Identificar huérfanos
  const orphans = identifyOrphans(staticResults, cohesionMatrix);

  // 4. Estadísticas
  const totalFiles = Object.keys(staticResults.files || {}).length;
  const clusteredFiles = clusters.reduce((sum, c) => sum + c.fileCount, 0);
  const orphanCount = orphans.length;

  return {
    subsystems: clusters,
    orphans,
    stats: {
      totalFiles,
      clusteredFiles,
      orphanFiles: orphanCount,
      subsystemCount: clusters.length,
      coveragePercentage: totalFiles > 0
        ? ((clusteredFiles / totalFiles) * 100).toFixed(1)
        : 0
    }
  };
}

/**
 * Genera reporte legible de la estructura del proyecto
 *
 * @param {object} structure - Resultado de analyzeProjectStructure
 * @returns {string} - Reporte formateado
 */
export function generateStructureReport(structure) {
  const lines = [];

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('  PROJECT STRUCTURE ANALYSIS');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Total Files: ${structure.stats.totalFiles}`);
  lines.push(`Subsystems Detected: ${structure.stats.subsystemCount}`);
  lines.push(`Clustered Files: ${structure.stats.clusteredFiles} (${structure.stats.coveragePercentage}%)`);
  lines.push(`Orphan Files: ${structure.stats.orphanFiles}`);
  lines.push('');

  if (structure.subsystems.length > 0) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('📦 DETECTED SUBSYSTEMS');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('');

    for (const subsystem of structure.subsystems) {
      lines.push(`[${subsystem.name}]`);
      lines.push(`  Files: ${subsystem.fileCount}`);
      lines.push(`  Cohesion: ${subsystem.cohesion.toFixed(2)}`);
      lines.push(`  Directory: ${subsystem.commonDirectory || '(mixed)'}`);

      if (subsystem.files.length <= 10) {
        lines.push('  Files:');
        subsystem.files.forEach(f => lines.push(`    - ${f}`));
      }

      lines.push('');
    }
  }

  if (structure.orphans.length > 0) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('⚠️  ORPHAN FILES');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('');

    for (const orphan of structure.orphans) {
      const severity = orphan.severity === 'high' ? '[HIGH]' : '[LOW]';
      lines.push(`${severity} ${orphan.file}`);

      if (orphan.hasSideEffects) {
        if (orphan.sharedState.writes.length > 0) {
          lines.push(`  Writes: ${orphan.sharedState.writes.join(', ')}`);
        }
        if (orphan.events.emits.length > 0) {
          lines.push(`  Emits: ${orphan.events.emits.join(', ')}`);
        }
      } else {
        lines.push('  No side effects detected');
      }

      lines.push('');
    }
  }

  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}
