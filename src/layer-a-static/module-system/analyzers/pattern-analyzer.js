/**
 * @fileoverview Architectural Pattern Analyzer
 * 
 * Detecta patrones arquitectónicos en el sistema
 * 
 * @module module-system/analyzers/pattern-analyzer
 * @phase 3
 */

/**
 * Detecta patrones arquitectónicos
 * @param {Array} modules - Módulos del proyecto
 * @returns {Array} - Patrones detectados
 */
export function detectArchitecturalPatterns(modules) {
  const patterns = [];
  
  // Patrón: Layered Architecture
  const hasLayers = modules.some(m =>
    ['controllers', 'services', 'repositories', 'models'].includes(m.moduleName)
  );
  
  if (hasLayers) {
    patterns.push({
      name: 'Layered Architecture',
      confidence: 0.8,
      evidence: 'Modules organized in layers'
    });
  }
  
  // Patrón: Microservices-like
  const serviceModules = modules.filter(m =>
    m.moduleName.includes('service') ||
    m.exports?.some(e => e.type === 'service')
  );
  
  if (serviceModules.length >= 3) {
    patterns.push({
      name: 'Service-Oriented',
      confidence: 0.7,
      evidence: `${serviceModules.length} service modules detected`
    });
  }
  
  // Patrón: Event-Driven
  const hasEvents = modules.some(m =>
    m.moduleName === 'events' ||
    m.files.some(f => f.path.includes('event'))
  );
  
  if (hasEvents) {
    patterns.push({
      name: 'Event-Driven Elements',
      confidence: 0.6,
      evidence: 'Event-related modules found'
    });
  }
  
  return patterns;
}
