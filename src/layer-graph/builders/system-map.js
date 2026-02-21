/**
 * @fileoverview system-map.js
 * 
 * Construcción principal del SystemMap.
 * Orquesta todos los builders y algoritmos.
 * 
 * @module graph/builders/system-map
 */

import { 
  createEmptySystemMap, 
  createFileNode, 
  createDependency 
} from '../core/types.js';
import { 
  normalizePath, 
  getDisplayPath, 
  uniquePaths 
} from '../utils/path-utils.js';
import { 
  countTotalFunctions, 
  countTotalItems, 
  countUnresolvedImports 
} from '../utils/counters.js';
import { detectCycles } from '../algorithms/cycle-detector.js';
import { 
  calculateTransitiveDependencies, 
  calculateTransitiveDependents 
} from '../algorithms/transitive-deps.js';
import { buildExportIndex } from './export-index.js';
import { buildFunctionLinks } from './function-links.js';

// ── Private phase helpers ─────────────────────────────────────────────────────

function buildFileNodes(parsedFiles) {
  const allFilePaths = new Set();
  const files = {};
  for (const [filePath, fileInfo] of Object.entries(parsedFiles)) {
    const normalized = normalizePath(filePath);
    allFilePaths.add(normalized);
    files[normalized] = createFileNode(normalized, getDisplayPath(normalized), fileInfo);
  }
  return { allFilePaths, files };
}

function processSingleImport(normalizedFrom, importInfo, systemMap, dependencySet) {
  if (importInfo?.type === 'dynamic' && importInfo.source) {
    if (importInfo.source !== '<dynamic>') {
      const normalizedTo = normalizePath(importInfo.source);
      if (systemMap.files[normalizedTo]) {
        const depKey = `${normalizedFrom} -> ${normalizedTo}`;
        if (!dependencySet.has(depKey)) {
          dependencySet.add(depKey);
          systemMap.dependencies.push(createDependency(normalizedFrom, normalizedTo, { ...importInfo, dynamic: true, confidence: 0.8 }));
          systemMap.files[normalizedFrom].dependsOn.push(normalizedTo);
          systemMap.files[normalizedTo].usedBy.push(normalizedFrom);
        }
      }
    }
    return;
  }
  if (!importInfo.resolved) {
    if (!systemMap.unresolvedImports[normalizedFrom]) systemMap.unresolvedImports[normalizedFrom] = [];
    systemMap.unresolvedImports[normalizedFrom].push({ source: importInfo.source || importInfo.importSource, type: importInfo.type, reason: importInfo.reason, severity: importInfo.type === 'unresolved' ? 'HIGH' : 'LOW' });
    return;
  }
  const normalizedTo = normalizePath(importInfo.resolved);
  if (!systemMap.files[normalizedTo]) return;
  const depKey = `${normalizedFrom} -> ${normalizedTo}`;
  if (!dependencySet.has(depKey)) {
    dependencySet.add(depKey);
    systemMap.dependencies.push(createDependency(normalizedFrom, normalizedTo, importInfo));
    systemMap.files[normalizedFrom].dependsOn.push(normalizedTo);
    systemMap.files[normalizedTo].usedBy.push(normalizedFrom);
  }
}

function processDependencies(resolvedImports, systemMap) {
  const dependencySet = new Set();
  for (const [filePath, imports] of Object.entries(resolvedImports)) {
    const normalizedFrom = normalizePath(filePath);
    if (!systemMap.files[normalizedFrom]) continue;
    for (const importInfo of imports) {
      processSingleImport(normalizedFrom, importInfo, systemMap, dependencySet);
    }
  }
}

function calculateAllTransitive(allFilePaths, systemMap) {
  for (const filePath of allFilePaths) {
    systemMap.files[filePath].transitiveDepends = Array.from(calculateTransitiveDependencies(filePath, systemMap.files, new Set()));
  }
  for (const filePath of allFilePaths) {
    systemMap.files[filePath].transitiveDependents = Array.from(calculateTransitiveDependents(filePath, systemMap.files, new Set()));
  }
}

function processTier3Data(parsedFiles, systemMap) {
  const fields = ['typeDefinitions', 'enumDefinitions', 'constantExports', 'objectExports', 'typeUsages'];
  for (const [filePath, fileInfo] of Object.entries(parsedFiles)) {
    const normalized = normalizePath(filePath);
    const fileNode = systemMap.files[normalized];
    for (const field of fields) {
      if (fileInfo[field]?.length > 0) {
        systemMap[field][normalized] = fileInfo[field];
        if (fileNode) fileNode[field] = fileInfo[field];
      }
    }
  }
}

function computeMetrics(allFilePaths, systemMap) {
  systemMap.metadata.totalFiles = allFilePaths.size;
  systemMap.metadata.totalDependencies = systemMap.dependencies.length;
  systemMap.metadata.totalFunctions = countTotalFunctions(systemMap.functions);
  systemMap.metadata.totalFunctionLinks = systemMap.function_links.length;
  systemMap.metadata.totalUnresolved = countUnresolvedImports(systemMap.unresolvedImports);
  systemMap.metadata.totalReexports = systemMap.reexportChains.length;
  systemMap.metadata.totalTypes = countTotalItems(systemMap.typeDefinitions);
  systemMap.metadata.totalEnums = countTotalItems(systemMap.enumDefinitions);
  systemMap.metadata.totalConstants = countTotalItems(systemMap.constantExports);
  systemMap.metadata.totalSharedObjects = countTotalItems(systemMap.objectExports);
}

/**
 * Construye el grafo de dependencias del sistema
 *
 * @param {Object.<string, FileInfo>} parsedFiles - Mapa { filePath: FileInfo }
 * @param {Object.<string, ImportInfo[]>} resolvedImports - Mapa { filePath: { sourceImport: resolution } }
 * @returns {SystemMap} - SystemMap completo con FileNodes y Dependencies
 */
export function buildSystemMap(parsedFiles, resolvedImports) {
  const systemMap = createEmptySystemMap();
  if (!parsedFiles) return systemMap;
  resolvedImports = resolvedImports || {};

  // Fase 1: nodos de archivo
  const { allFilePaths, files } = buildFileNodes(parsedFiles);
  systemMap.files = files;

  // Fase 2: índice de exports
  systemMap.exportIndex = buildExportIndex(parsedFiles, allFilePaths);

  // Fase 3: imports → dependencias
  processDependencies(resolvedImports, systemMap);

  // Fase 4: deduplicar relaciones
  for (const fileNode of Object.values(systemMap.files)) {
    fileNode.usedBy = uniquePaths(fileNode.usedBy);
    fileNode.dependsOn = uniquePaths(fileNode.dependsOn);
  }

  // Fase 5: detectar ciclos
  systemMap.metadata.cyclesDetected = detectCycles(systemMap.files);

  // Fase 6: dependencias transitivas
  calculateAllTransitive(allFilePaths, systemMap);

  // Fase 7: funciones y enlaces
  const { functions, function_links } = buildFunctionLinks(parsedFiles, resolvedImports);
  systemMap.functions = functions;
  systemMap.function_links = function_links;

  // Fase 8: Tier 3 data
  processTier3Data(parsedFiles, systemMap);

  // Fase 9: métricas
  computeMetrics(allFilePaths, systemMap);

  return systemMap;
}
