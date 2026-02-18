/**
 * @fileoverview System Analyzer - Analiza todo el proyecto
 * 
 * REFACTORIZADO: Ahora usa detectores, analizadores y builders modulares
 * siguiendo SRP y principios de arquitectura molecular.
 * 
 * @module module-system/system-analyzer
 * @phase 3
 */

import {
  findAPIRoutes,
  findCLICommands,
  findEventHandlers,
  findScheduledJobs,
  findMainExports
} from './detectors/index.js';

import { detectBusinessFlows } from './analyzers/business-flow-analyzer.js';
import { detectArchitecturalPatterns } from './analyzers/pattern-analyzer.js';
import { buildSystemGraph, mapModuleConnections } from '#layer-graph/index.js';
import { findMolecule, getAllAtoms } from './utils.js';
import { logger } from '../../utils/logger.js';

/**
 * System Analyzer - Entry Point Unificado
 * 
 * Orquesta el análisis del sistema completo usando componentes especializados.
 * Cada responsabilidad está delegada a módulos específicos.
 */
export class SystemAnalyzer {
  constructor(projectRoot, modules) {
    this.projectRoot = projectRoot;
    this.modules = modules;
    this.moduleByName = new Map(modules.map(m => [m.moduleName, m]));
  }

  /**
   * Analiza el sistema completo
   * @returns {Object} - Resultado completo del análisis
   */
  analyze() {
    logger.info('Starting system analysis...');

    // PASO 1: Entry Points (detectores especializados)
    const entryPoints = this.findSystemEntryPoints();
    logger.info(`Found ${entryPoints.length} entry points`);

    // PASO 2: Flujos de negocio (analizador especializado)
    const businessFlows = detectBusinessFlows(entryPoints, this.getAnalysisContext());
    logger.info(`Detected ${businessFlows.length} business flows`);

    // PASO 3: Conexiones entre módulos (builder)
    const moduleConnections = mapModuleConnections(this.modules);
    logger.info(`Mapped ${moduleConnections.length} module connections`);

    // PASO 4: Grafo del sistema (builder)
    const systemGraph = buildSystemGraph(this.modules, moduleConnections);
    logger.info(`Built system graph: ${systemGraph.nodes.length} nodes, ${systemGraph.edges.length} edges`);

    // PASO 5: Patrones arquitectónicos (analizador)
    const patterns = detectArchitecturalPatterns(this.modules);
    logger.info(`Detected ${patterns.length} architectural patterns`);

    return {
      projectRoot: this.projectRoot,
      entryPoints,
      businessFlows,
      moduleConnections,
      systemGraph,
      patterns,
      meta: {
        totalModules: this.modules.length,
        totalBusinessFlows: businessFlows.length,
        totalEntryPoints: entryPoints.length,
        totalConnections: moduleConnections.length,
        analyzedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Encuentra todos los entry points usando detectores especializados
   * @returns {Array} - Todos los entry points encontrados
   */
  findSystemEntryPoints() {
    const entryPoints = [];
    
    entryPoints.push(...findAPIRoutes(this.modules));
    entryPoints.push(...findCLICommands(this.modules));
    entryPoints.push(...findEventHandlers(this.modules));
    entryPoints.push(...findScheduledJobs(this.modules));
    entryPoints.push(...findMainExports(this.modules));

    return entryPoints;
  }

  /**
   * Prepara contexto para analizadores
   * @returns {Object} - Contexto de análisis
   */
  getAnalysisContext() {
    return {
      modules: this.modules,
      moduleByName: this.moduleByName,
      findAtom: this.findAtom.bind(this)
    };
  }

  // Helper methods - delegan a utilidades compartidas
  
  findMolecule(filePath) {
    return findMolecule(filePath, this.modules);
  }

  findAtom(moduleName, functionName) {
    const module = this.moduleByName.get(moduleName);
    if (!module) return null;
    
    const atoms = getAllAtoms(module, this.moduleByName);
    return atoms.find(a => a.name === functionName);
  }
}

export default SystemAnalyzer;
