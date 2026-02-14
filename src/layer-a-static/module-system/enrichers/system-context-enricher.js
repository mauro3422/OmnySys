/**
 * @fileoverview System Context Enricher - Enriquece moléculas con contexto
 * 
 * Responsabilidad Única (SRP): Agregar contexto de módulo y sistema a moléculas.
 * 
 * @module module-system/enrichers
 */

import path from 'path';

/**
 * Enriquece moléculas con contexto de módulo y sistema
 * 
 * @param {Array} molecules - Moléculas originales
 * @param {Object} moduleData - Output de analyzeModules
 * @param {Array} moduleData.modules - Módulos analizados
 * @param {Object} moduleData.system - Datos del sistema
 * @returns {Array} - Moléculas enriquecidas
 */
export function enrichMoleculesWithSystemContext(molecules, moduleData) {
  const { modules, system } = moduleData;
  
  // Indexar datos por archivo
  const moduleByFile = new Map();
  for (const module of modules) {
    for (const file of module.files) {
      moduleByFile.set(file.path, module);
    }
  }
  
  const businessFlowsByFile = new Map();
  for (const flow of system.businessFlows) {
    for (const step of flow.steps) {
      const key = `${step.module}/${step.file}`;
      if (!businessFlowsByFile.has(key)) {
        businessFlowsByFile.set(key, []);
      }
      businessFlowsByFile.get(key).push(flow);
    }
  }

  return molecules.map(mol => enrichMolecule(mol, moduleByFile, businessFlowsByFile, system));
}

/**
 * Enriquece una sola molécula
 * @param {Object} mol - Molécula original
 * @param {Map} moduleByFile - Mapa de archivo -> módulo
 * @param {Map} businessFlowsByFile - Mapa de archivo -> flows
 * @param {Object} system - Datos del sistema
 * @returns {Object} Molécula enriquecida
 */
function enrichMolecule(mol, moduleByFile, businessFlowsByFile, system) {
  const fileName = path.basename(mol.filePath);
  const module = moduleByFile.get(mol.filePath);
  
  if (!module) {
    return mol;
  }

  // Encontrar chains que incluyen este archivo
  const fileChains = module.internalChains?.filter(chain =>
    chain.steps.some(s => s.file === fileName)
  ) || [];
  
  // Encontrar conexiones cross-file
  const connections = module.crossFileConnections?.filter(conn =>
    conn.from.file === fileName || conn.to.file === fileName
  ) || [];
  
  // Encontrar business flows
  const fileKey = `${module.moduleName}/${fileName}`;
  const flows = businessFlowsByFile.get(fileKey) || [];
  
  // Calcular dependencias
  const upstream = connections
    .filter(c => c.to.file === fileName)
    .map(c => ({ file: c.from.file, function: c.from.function }));
  
  const downstream = connections
    .filter(c => c.from.file === fileName)
    .map(c => ({ file: c.to.file, function: c.to.function }));

  return {
    ...mol,
    
    // Nuevo: Contexto de módulo
    moduleContext: {
      moduleName: module.moduleName,
      modulePath: module.modulePath,
      
      // Chains en las que participa
      internalChains: fileChains.map(c => c.id),
      
      // Conexiones con otros archivos del módulo
      connectedFiles: [...new Set([
        ...connections.map(c => c.from.file),
        ...connections.map(c => c.to.file)
      ])].filter(f => f !== fileName),
      
      // Dependencias dentro del módulo
      upstream,
      downstream,
      
      // Métricas del módulo
      moduleMetrics: module.metrics
    },
    
    // Nuevo: Contexto de sistema
    systemContext: {
      // Business flows donde participa
      businessFlows: flows.map(f => ({
        name: f.name,
        type: f.type,
        step: f.steps.find(s => 
          s.file === fileName
        )?.order
      })),
      
      // Entry points que usan este archivo
      entryPoints: system.entryPoints.filter(ep =>
        ep.handler?.file === fileName ||
        ep.handler?.module === module.moduleName
      ),
      
      // Dependencias globales
      moduleDependencies: {
        imports: module.imports,
        exports: module.exports?.filter(e =>
          mol.atoms?.some(a => a.name === e.name && a.isExported)
        )
      },
      
      // Patrones arquitectónicos
      architecturalPatterns: system.patterns
    },
    
    // Metadata
    _meta: {
      ...mol._meta,
      moduleSystemVersion: '3.0.0',
      analyzedAt: new Date().toISOString()
    }
  };
}

/**
 * Crea contexto vacío para moléculas sin módulo
 * @returns {Object} Contexto vacío
 */
export function createEmptyContext() {
  return {
    moduleContext: null,
    systemContext: null
  };
}
