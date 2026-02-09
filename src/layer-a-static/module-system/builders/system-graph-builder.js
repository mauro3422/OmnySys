/**
 * @fileoverview System Graph Builder
 * 
 * Construye el grafo del sistema desde módulos y conexiones
 * 
 * @module module-system/builders/system-graph-builder
 * @phase 3
 */

import path from 'path';

/**
 * Construye grafo del sistema
 * @param {Array} modules - Módulos del proyecto
 * @param {Array} connections - Conexiones entre módulos
 * @returns {Object} - Grafo del sistema { nodes, edges }
 */
export function buildSystemGraph(modules, connections) {
  const nodes = modules.map(m => ({
    id: m.moduleName,
    type: 'module',
    metrics: m.metrics,
    exports: m.exports?.length || 0,
    entryPoints: findModuleEntryPoints(m)
  }));
  
  const edges = connections.map(c => ({
    from: c.from,
    to: c.to,
    type: c.type,
    strength: c.strength,
    dataFlow: c.dataFlow
  }));
  
  return { nodes, edges };
}

/**
 * Mapea conexiones entre módulos
 * @param {Array} modules - Módulos
 * @returns {Array} - Conexiones
 */
export function mapModuleConnections(modules) {
  const connections = [];
  const moduleByName = new Map(modules.map(m => [m.moduleName, m]));
  
  for (const fromModule of modules) {
    for (const toModule of modules) {
      if (fromModule.moduleName === toModule.moduleName) continue;
      
      // Verificar si fromModule importa de toModule
      const imports = fromModule.imports?.filter(imp =>
        imp.module === toModule.moduleName
      ) || [];
      
      if (imports.length > 0) {
        connections.push({
          from: fromModule.moduleName,
          to: toModule.moduleName,
          type: 'dependency',
          dataFlow: {
            imports: imports.flatMap(i => i.functions),
            count: imports.reduce((sum, i) => sum + i.count, 0)
          },
          strength: calculateConnectionStrength(fromModule, toModule)
        });
      }
    }
  }
  
  return connections;
}

/**
 * Calcula fuerza de conexión entre módulos
 * @param {Object} from - Módulo origen
 * @param {Object} to - Módulo destino
 * @returns {string} - Fuerza ('strong'|'medium'|'weak')
 */
function calculateConnectionStrength(from, to) {
  const importCount = from.imports?.find(i => i.module === to.moduleName)?.count || 0;
  const totalFunctions = from.metrics?.totalFunctions || 1;
  
  const ratio = importCount / totalFunctions;
  
  if (ratio > 0.5) return 'strong';
  if (ratio > 0.2) return 'medium';
  return 'weak';
}

/**
 * Encuentra entry points de un módulo
 * @param {Object} module - Módulo
 * @returns {Array} - Entry points
 */
function findModuleEntryPoints(module) {
  const entries = [];
  
  // API routes
  const apiFiles = module.files?.filter(f =>
    f.path.includes('routes') || f.path.includes('api')
  ) || [];
  
  for (const file of apiFiles) {
    entries.push({ type: 'api', file: path.basename(file.path) });
  }
  
  // Main exports
  for (const exp of module.exports || []) {
    if (exp.type === 'handler' || exp.usedBy > 5) {
      entries.push({
        type: 'export',
        function: exp.name,
        file: exp.file
      });
    }
  }
  
  return entries;
}
