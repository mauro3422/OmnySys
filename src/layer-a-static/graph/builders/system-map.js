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
} from '../types.js';
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

/**
 * Construye el grafo de dependencias del sistema
 * 
 * @param {Object.<string, FileInfo>} parsedFiles - Mapa { filePath: FileInfo }
 * @param {Object.<string, ImportInfo[]>} resolvedImports - Mapa { filePath: { sourceImport: resolution } }
 * @returns {SystemMap} - SystemMap completo con FileNodes y Dependencies
 */
export function buildSystemMap(parsedFiles, resolvedImports) {
  const systemMap = createEmptySystemMap();
  
  // Normalizar paths para búsquedas rápidas
  const filesByPath = {};
  const allFilePaths = new Set();

  // ============================================
  // FASE 1: Crear nodos de archivo
  // ============================================
  for (const [filePath, fileInfo] of Object.entries(parsedFiles)) {
    const normalized = normalizePath(filePath);
    filesByPath[normalized] = fileInfo;
    allFilePaths.add(normalized);

    systemMap.files[normalized] = createFileNode(
      normalized,
      getDisplayPath(normalized),
      fileInfo
    );
  }

  // ============================================
  // FASE 2: Construir índice de exports
  // ============================================
  systemMap.exportIndex = buildExportIndex(parsedFiles, allFilePaths);

  // ============================================
  // FASE 3: Procesar imports y crear dependencias
  // ============================================
  const dependencySet = new Set(); // Para evitar duplicados

  for (const [filePath, imports] of Object.entries(resolvedImports)) {
    const normalizedFrom = normalizePath(filePath);

    if (!systemMap.files[normalizedFrom]) {
      continue; // Archivo no en el grafo
    }

    for (const importInfo of imports) {
      // Capturar imports no resueltos
      if (!importInfo.resolved) {
        if (!systemMap.unresolvedImports[normalizedFrom]) {
          systemMap.unresolvedImports[normalizedFrom] = [];
        }
        systemMap.unresolvedImports[normalizedFrom].push({
          source: importInfo.source || importInfo.importSource,
          type: importInfo.type,
          reason: importInfo.reason,
          severity: importInfo.type === 'unresolved' ? 'HIGH' : 'LOW'
        });
        continue;
      }

      const normalizedTo = normalizePath(importInfo.resolved);

      // Verificar si el archivo destino está en el grafo
      if (!systemMap.files[normalizedTo]) {
        continue; // Archivo no está en el proyecto
      }

      // Crear dependency (evitar duplicados)
      const depKey = `${normalizedFrom} -> ${normalizedTo}`;
      if (!dependencySet.has(depKey)) {
        dependencySet.add(depKey);

        systemMap.dependencies.push(
          createDependency(normalizedFrom, normalizedTo, importInfo)
        );

        // Actualizar referencias bidireccionales
        systemMap.files[normalizedFrom].dependsOn.push(normalizedTo);
        systemMap.files[normalizedTo].usedBy.push(normalizedFrom);
      }
    }
  }

  // ============================================
  // FASE 4: Eliminar duplicados en relaciones
  // ============================================
  for (const fileNode of Object.values(systemMap.files)) {
    fileNode.usedBy = uniquePaths(fileNode.usedBy);
    fileNode.dependsOn = uniquePaths(fileNode.dependsOn);
  }

  // ============================================
  // FASE 5: Detectar ciclos
  // ============================================
  systemMap.metadata.cyclesDetected = detectCycles(systemMap.files);

  // ============================================
  // FASE 6: Calcular dependencias transitivas
  // ============================================
  for (const filePath of allFilePaths) {
    const fileNode = systemMap.files[filePath];
    const transitive = calculateTransitiveDependencies(
      filePath,
      systemMap.files,
      new Set()
    );
    fileNode.transitiveDepends = Array.from(transitive);
  }

  // Calcular transitive dependents
  for (const filePath of allFilePaths) {
    const fileNode = systemMap.files[filePath];
    const transitive = calculateTransitiveDependents(
      filePath,
      systemMap.files,
      new Set()
    );
    fileNode.transitiveDependents = Array.from(transitive);
  }

  // ============================================
  // FASE 7: Procesar funciones y enlaces
  // ============================================
  const { functions, function_links } = buildFunctionLinks(
    parsedFiles,
    resolvedImports
  );
  systemMap.functions = functions;
  systemMap.function_links = function_links;

  // ============================================
  // FASE 8: Procesar Tier 3 data (types, enums, etc.)
  // ============================================
  for (const [filePath, fileInfo] of Object.entries(parsedFiles)) {
    const normalized = normalizePath(filePath);

    if (fileInfo.typeDefinitions?.length > 0) {
      systemMap.typeDefinitions[normalized] = fileInfo.typeDefinitions;
    }
    if (fileInfo.enumDefinitions?.length > 0) {
      systemMap.enumDefinitions[normalized] = fileInfo.enumDefinitions;
    }
    if (fileInfo.constantExports?.length > 0) {
      systemMap.constantExports[normalized] = fileInfo.constantExports;
    }
    if (fileInfo.objectExports?.length > 0) {
      systemMap.objectExports[normalized] = fileInfo.objectExports;
    }
    if (fileInfo.typeUsages?.length > 0) {
      systemMap.typeUsages[normalized] = fileInfo.typeUsages;
    }
  }

  // ============================================
  // FASE 9: Calcular métricas
  // ============================================
  systemMap.metadata.totalFiles = allFilePaths.size;
  systemMap.metadata.totalDependencies = systemMap.dependencies.length;
  systemMap.metadata.totalFunctions = countTotalFunctions(systemMap.functions);
  systemMap.metadata.totalFunctionLinks = systemMap.function_links.length;
  systemMap.metadata.totalUnresolved = countUnresolvedImports(systemMap.unresolvedImports);
  systemMap.metadata.totalReexports = systemMap.reexportChains.length;
  // Tier 3 metrics
  systemMap.metadata.totalTypes = countTotalItems(systemMap.typeDefinitions);
  systemMap.metadata.totalEnums = countTotalItems(systemMap.enumDefinitions);
  systemMap.metadata.totalConstants = countTotalItems(systemMap.constantExports);
  systemMap.metadata.totalSharedObjects = countTotalItems(systemMap.objectExports);

  return systemMap;
}
