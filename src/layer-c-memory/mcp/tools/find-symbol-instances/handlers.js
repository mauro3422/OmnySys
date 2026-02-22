/**
 * Response builders for find-symbol-instances tool
 * @module layer-c-memory/mcp/tools/find-symbol-instances/handlers
 */

import { getAllAtoms, getAtomsByName } from '#layer-c/storage/index.js';
import { findAllInstances } from './instance-finder.js';
import { analyzeUsage } from './usage-analyzer.js';
import { detectDuplicates } from './duplicate-detector.js';
import { determinePrimary } from './instance-helper.js';
import { generateRecommendations } from './recommendation-generator.js';
import { autoDetectDuplicates } from './auto-detector.js';

/**
 * Construye detalles de instancias
 * @param {Array} instances - Array of instances
 * @param {Map} usageMap - Map of filePath to usage info
 * @param {Object} primary - Primary instance
 * @param {Array} duplicates - Array of duplicate groups
 * @returns {Array} - Array of instance details
 */
export function buildInstanceDetails(instances, usageMap, primary, duplicates) {
  return instances.map(instance => {
    const usage = usageMap.get(instance.filePath);
    const isPrimary = primary && instance.filePath === primary.filePath;
    const isDuplicate = duplicates.some(d => d.instances.some(i => i.file === instance.filePath));
    return {
      id: instance.id, file: instance.filePath, line: instance.line,
      isExported: instance.isExported, complexity: instance.complexity, linesOfCode: instance.linesOfCode,
      structuralHash: instance.dna?.structuralHash?.slice(0, 16) + '...',
      usage: { importedBy: usage?.imports?.length || 0, calledBy: usage?.calls?.length || 0, total: usage?.totalUsage || 0 },
      status: isPrimary ? '✅ PRIMARY' : (usage?.totalUsage === 0 ? '⚠️ UNUSED' : 'ℹ️ ALT'),
      isPrimary, isUnused: usage?.totalUsage === 0, isDuplicate
    };
  }).sort((a, b) => b.usage.total - a.usage.total);
}

/**
 * Maneja el modo auto-detect
 * @param {string} resolvedPath - Project path
 * @returns {Object} - Auto-detect result
 */
export async function handleAutoDetect(resolvedPath) {
  const atoms = await getAllAtoms(resolvedPath);
  const duplicates = await autoDetectDuplicates(atoms);
  const criticalCount = duplicates.filter(d => d.count > 2).length;
  const totalSavings = duplicates.reduce((sum, d) => sum + d.potentialSavings, 0);
  return {
    mode: 'auto_detect',
    summary: { totalDuplicatesFound: duplicates.length, criticalDuplicates: criticalCount, totalInstances: duplicates.reduce((sum, d) => sum + d.count, 0), potentialSavingsLOC: totalSavings },
    duplicates: duplicates.map(d => ({ primaryName: d.symbolName, allNames: d.allNames, count: d.count, linesOfCode: d.linesOfCode, riskScore: d.riskScore, canonical: d.canonical, instances: d.instances, recommendation: d.recommendation })),
    topPriority: duplicates.slice(0, 5).map(d => ({ symbol: d.symbolName, action: `Consolidar ${d.count} copias en ${d.canonical.file}`, savings: `${d.potentialSavings} LOC` })),
    recommendations: [
      { type: 'info', message: `Se encontraron ${duplicates.length} grupos de funciones duplicadas`, action: 'review_top_5' },
      ...(criticalCount > 0 ? [{ type: 'warning', message: `${criticalCount} duplicados tienen más de 2 copias - prioridad alta`, action: 'address_critical_first' }] : [])
    ]
  };
}

/**
 * Maneja la búsqueda de símbolos específicos
 * 🚀 OPTIMIZADO: Usa getAtomsByName() en lugar de getAllAtoms()
 * @param {string} symbolName - Symbol name to search
 * @param {string} resolvedPath - Project path
 * @returns {Object} - Symbol search result
 */
export async function handleSymbolSearch(symbolName, resolvedPath) {
  // 🚀 OPTIMIZADO: Solo cargar átomos con ese nombre específico
  const instances = await getAtomsByName(resolvedPath, symbolName, 100);
  
  if (instances.length === 0) {
    return { symbol: symbolName, found: false, message: `No se encontró ninguna función/variable llamada "${symbolName}"`, suggestion: 'Verifica el nombre o usa search_files para encontrar el nombre correcto' };
  }
  
  // Para análisis de uso necesitamos más contexto, cargar solo archivos relevantes
  const relevantFiles = [...new Set(instances.map(i => i.filePath))];
  const usageMap = new Map();
  for (const file of relevantFiles.slice(0, 10)) {
    try {
      const { loadAtoms } = await import('#layer-c/storage/index.js');
      const fileAtoms = await loadAtoms(resolvedPath, file);
      const usage = analyzeUsage(fileAtoms, instances.filter(i => i.filePath === file), symbolName);
      if (usage.size > 0) {
        usage.forEach((v, k) => usageMap.set(k, v));
      }
    } catch {
      // Skip files that can't be loaded
    }
  }
  
  const duplicates = detectDuplicates(instances);
  const primary = determinePrimary(instances, usageMap);
  const instanceDetails = buildInstanceDetails(instances, usageMap, primary, duplicates);
  
  return {
    symbol: symbolName, found: true,
    summary: { totalInstances: instances.length, primaryInstance: primary ? { file: primary.filePath, line: primary.line } : null, duplicateGroups: duplicates.length, unusedInstances: instanceDetails.filter(i => i.isUnused).length },
    instances: instanceDetails,
    duplicates: duplicates.map(d => ({ hash: d.hash, count: d.count, files: d.instances.map(i => i.file) })),
    directImports: [],
    recommendations: generateRecommendations(instances, primary, duplicates, usageMap),
    action: primary ? { type: 'edit', file: primary.filePath, line: primary.line, message: `Editar esta instancia` } : null
  };
}
