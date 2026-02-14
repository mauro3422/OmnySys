/**
 * @fileoverview Analysis Orchestrator - Orquestador de análisis de módulos
 * 
 * Responsabilidad Única (SRP): Orquestar el análisis completo de módulos y sistema.
 * 
 * @module module-system/orchestrators
 */

import { createLogger } from '../../../utils/logger.js';
import { ModuleAnalyzer } from '../module-analyzer/ModuleAnalyzer.js';
import { SystemAnalyzer } from '../system-analyzer.js';
import { groupMoleculesByModule } from '../groupers/module-grouper.js';

const logger = createLogger('OmnySys:module-system:orchestrator');

/**
 * Resultado del análisis de módulos
 * @typedef {Object} ModuleAnalysisResult
 * @property {Array} modules - Módulos analizados
 * @property {Object} system - Análisis del sistema
 * @property {Object} summary - Resumen del análisis
 */

/**
 * Analiza todos los módulos del proyecto
 * 
 * @param {string} projectRoot - Raíz del proyecto
 * @param {Array} molecules - Todas las moléculas (de Fase 2)
 * @returns {ModuleAnalysisResult} Resultado del análisis
 */
export function analyzeModules(projectRoot, molecules) {
  logger.info(`[ModuleSystem] Analyzing modules in ${projectRoot}...`);

  // PASO 1: Agrupar moléculas por módulo
  const moleculesByModule = groupMoleculesByModule(projectRoot, molecules);
  
  // PASO 2: Analizar cada módulo
  const modules = [];
  
  for (const [modulePath, moduleMolecules] of moleculesByModule) {
    const analyzer = new ModuleAnalyzer(modulePath, moduleMolecules);
    const moduleAnalysis = analyzer.analyze();
    modules.push(moduleAnalysis);
  }

  logger.info(`[ModuleSystem] Analyzed ${modules.length} modules`);

  // PASO 3: Analizar sistema completo
  const systemAnalyzer = new SystemAnalyzer(projectRoot, modules);
  const system = systemAnalyzer.analyze();

  logger.info(`[ModuleSystem] Detected ${system.businessFlows.length} business flows`);

  return {
    modules,
    system,
    
    // Resumen
    summary: {
      totalModules: modules.length,
      totalFiles: molecules.length,
      totalFunctions: modules.reduce((sum, m) => sum + m.metrics.totalFunctions, 0),
      totalBusinessFlows: system.businessFlows.length,
      totalEntryPoints: system.entryPoints.length,
      architecturalPatterns: system.patterns.map(p => p.name)
    }
  };
}

/**
 * Analiza un único módulo
 * @param {string} modulePath - Path del módulo
 * @param {Array} molecules - Moléculas del módulo
 * @returns {Object} Análisis del módulo
 */
export function analyzeSingleModule(modulePath, molecules) {
  const analyzer = new ModuleAnalyzer(modulePath, molecules);
  return analyzer.analyze();
}

/**
 * Analiza el sistema completo a partir de módulos ya analizados
 * @param {string} projectRoot - Raíz del proyecto
 * @param {Array} modules - Módulos analizados
 * @returns {Object} Análisis del sistema
 */
export function analyzeSystemOnly(projectRoot, modules) {
  const systemAnalyzer = new SystemAnalyzer(projectRoot, modules);
  return systemAnalyzer.analyze();
}
