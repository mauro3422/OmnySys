/**
 * @fileoverview Module System - Entry Point Fase 3
 * 
 * Orquesta el análisis a nivel módulo y sistema.
 * 
 * @module module-system/index
 * @version 3.0.0
 * @phase 3
 */

import path from 'path';
import { ModuleAnalyzer } from './module-analyzer.js';
import { SystemAnalyzer } from './system-analyzer.js';

/**
 * Analiza todos los módulos del proyecto
 * 
 * @param {string} projectRoot - Raíz del proyecto
 * @param {Array} molecules - Todas las moléculas (de Fase 2)
 * @returns {Object} - { modules, system }
 */
export function analyzeModules(projectRoot, molecules) {
  console.log(`[ModuleSystem] Analyzing modules in ${projectRoot}...`);

  // PASO 1: Agrupar moléculas por módulo
  const moleculesByModule = groupMoleculesByModule(projectRoot, molecules);
  
  // PASO 2: Analizar cada módulo
  const modules = [];
  
  for (const [modulePath, moduleMolecules] of moleculesByModule) {
    const analyzer = new ModuleAnalyzer(modulePath, moduleMolecules);
    const moduleAnalysis = analyzer.analyze();
    modules.push(moduleAnalysis);
  }

  console.log(`[ModuleSystem] Analyzed ${modules.length} modules`);

  // PASO 3: Analizar sistema completo
  const systemAnalyzer = new SystemAnalyzer(projectRoot, modules);
  const system = systemAnalyzer.analyze();

  console.log(`[ModuleSystem] Detected ${system.businessFlows.length} business flows`);

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
 * Agrupa moléculas por módulo (carpeta)
 */
function groupMoleculesByModule(projectRoot, molecules) {
  const groups = new Map();
  
  for (const mol of molecules) {
    // Encontrar módulo (carpeta padre)
    const relativePath = path.relative(projectRoot, mol.filePath);
    const parts = relativePath.split(path.sep);
    
    // Asumir que el primer nivel es el módulo
    // Ej: src/auth/login.js → módulo: src/auth
    let modulePath;
    if (parts.length >= 2) {
      modulePath = path.join(projectRoot, parts[0]);
      // Si hay sub-niveles, considerar src/nivel1/nivel2
      if (parts[0] === 'src' && parts.length >= 3) {
        modulePath = path.join(projectRoot, parts[0], parts[1]);
      }
    } else {
      modulePath = projectRoot;
    }
    
    if (!groups.has(modulePath)) {
      groups.set(modulePath, []);
    }
    groups.get(modulePath).push(mol);
  }
  
  return groups;
}

/**
 * Enriquece moléculas con contexto de módulo y sistema
 * 
 * @param {Array} molecules - Moléculas originales
 * @param {Object} moduleData - Output de analyzeModules
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

  return molecules.map(mol => {
    const fileName = path.basename(mol.filePath);
    const module = moduleByFile.get(fileName);
    
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
  });
}

/**
 * Query: Impacto de cambiar una función
 */
export function queryImpact(functionName, moduleData) {
  const { modules, system } = moduleData;
  
  const impact = {
    function: functionName,
    local: {
      module: null,
      files: [],
      chains: []
    },
    global: {
      businessFlows: [],
      entryPoints: [],
      modules: []
    }
  };
  
  // Buscar en módulos
  for (const module of modules) {
    // Buscar función
    const foundInChains = module.internalChains?.filter(chain =>
      chain.steps.some(s => s.function === functionName)
    ) || [];
    
    if (foundInChains.length > 0) {
      impact.local.module = module.moduleName;
      impact.local.chains = foundInChains.map(c => c.id);
      
      // Archivos afectados
      impact.local.files = [...new Set(foundInChains.flatMap(c =>
        c.steps.map(s => s.file)
      ))];
    }
  }
  
  // Buscar en business flows
  for (const flow of system.businessFlows) {
    const usesFunction = flow.steps.some(s => s.function === functionName);
    if (usesFunction) {
      impact.global.businessFlows.push({
        name: flow.name,
        step: flow.steps.find(s => s.function === functionName)?.order
      });
    }
  }
  
  return impact;
}

/**
 * Query: Flujo completo de datos
 */
export function queryDataFlow(entryPoint, moduleData) {
  const { system } = moduleData;
  
  const flow = system.businessFlows.find(f =>
    f.entryPoint.handler?.function === entryPoint ||
    f.name === entryPoint
  );
  
  if (!flow) {
    return null;
  }
  
  return {
    name: flow.name,
    entry: flow.entryPoint,
    steps: flow.steps.map(s => ({
      order: s.order,
      location: `${s.module}/${s.file}`,
      function: s.function,
      input: s.input,
      output: s.output,
      async: s.async,
      sideEffects: s.sideEffects
    })),
    sideEffects: flow.sideEffects,
    modulesInvolved: flow.modulesInvolved
  };
}

export default {
  analyzeModules,
  enrichMoleculesWithSystemContext,
  queryImpact,
  queryDataFlow
};
