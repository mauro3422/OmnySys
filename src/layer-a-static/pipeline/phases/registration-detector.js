/**
 * @fileoverview registration-detector.js
 *
 * Detecta registros dinámicos en el código (guards, handlers, providers)
 * que afectan el comportamiento runtime del sistema.
 *
 * Esto permite al grafo de impacto considerar efectos dinámicos,
 * no solo estáticos.
 *
 * @module pipeline/phases/registration-detector
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:RegistrationDetector');

// Patrones de registro conocidos
const REGISTRATION_PATTERNS = [
  {
    name: 'semanticGuard',
    pattern: /registerSemanticGuard\s*\(\s*['"`]([^'"`]+)['"`]/g,
    type: 'guard',
    impact: 'all_files',
    description: 'Registers a semantic guard that runs on all file changes'
  },
  {
    name: 'impactGuard',
    pattern: /registerImpactGuard\s*\(\s*['"`]([^'"`]+)['"`]/g,
    type: 'guard',
    impact: 'all_files',
    description: 'Registers an impact guard that runs on all file changes'
  },
  {
    name: 'eventHandler',
    pattern: /\.on\s*\(\s*['"`]([^'"`]+)['"`]/g,
    type: 'event',
    impact: 'event_listeners',
    description: 'Registers an event handler'
  },
  {
    name: 'eventEmitter',
    pattern: /\.emit\s*\(\s*['"`]([^'"`]+)['"`]/g,
    type: 'event',
    impact: 'event_emitters',
    description: 'Emits an event that listeners may handle'
  },
  {
    name: 'providerRegistration',
    pattern: /provide\s*\(\s*['"`]([^'"`]+)['"`]/g,
    type: 'provider',
    impact: 'dependency_injection',
    description: 'Registers a provider for dependency injection'
  },
  {
    name: 'dynamicImport',
    pattern: /import\s*\(\s*['"`]([^'"`]+)['"`]/g,
    type: 'dynamic_import',
    impact: 'lazy_loading',
    description: 'Dynamic import that loads code at runtime'
  }
];

/**
 * Detecta todos los registros dinámicos en un archivo
 * @param {string} filePath - Ruta del archivo
 * @param {string} code - Código fuente del archivo
 * @returns {Array<Object>} Lista de registros detectados
 */
export function detectRegistrations(filePath, code) {
  if (!code || typeof code !== 'string') {
    return [];
  }

  const registrations = [];

  for (const patternDef of REGISTRATION_PATTERNS) {
    const regex = new RegExp(patternDef.pattern);
    let match;

    while ((match = regex.exec(code)) !== null) {
      const registration = {
        type: patternDef.type,
        pattern: patternDef.name,
        name: match[1], // El nombre capturado (ej: 'async-safety')
        line: getLineNumber(code, match.index),
        impact: patternDef.impact,
        description: patternDef.description,
        filePath
      };

      registrations.push(registration);
    }
  }

  if (registrations.length > 0) {
    logger.debug(`Detected ${registrations.length} registrations in ${filePath}`);
  }

  return registrations;
}

/**
 * Calcula el número de línea para un índice en el código
 * @param {string} code - Código fuente
 * @param {number} index - Índice en el string
 * @returns {number} Número de línea (1-based)
 */
function getLineNumber(code, index) {
  const lines = code.substring(0, index).split('\n');
  return lines.length;
}

/**
 * Calcula el impacto de una modificación considerando registros dinámicos
 * @param {string} filePath - Archivo modificado
 * @param {Array<Object>} registrations - Registros detectados en el archivo
 * @param {Array<string>} allFiles - Todos los archivos del proyecto
 * @returns {Object} Análisis de impacto
 */
export function calculateDynamicImpact(filePath, registrations, allFiles) {
  if (!registrations || registrations.length === 0) {
    return {
      hasDynamicImpact: false,
      affectedFiles: [],
      impactType: 'none',
      details: []
    };
  }

  const impact = {
    hasDynamicImpact: true,
    affectedFiles: [],
    impactType: 'dynamic_registration',
    details: registrations
  };

  // Si hay guards registrados, afecta a todos los archivos
  const hasGuards = registrations.some(r => r.type === 'guard');
  if (hasGuards) {
    impact.impactType = 'global_guard';
    impact.affectedFiles = allFiles.filter(f => f !== filePath);
    impact.description = `Modifying guard registration affects ${impact.affectedFiles.length} files`;
  }

  // Si hay event handlers, afecta a archivos que emiten esos eventos
  const eventHandlers = registrations.filter(r => r.type === 'event' && r.pattern === 'eventHandler');
  if (eventHandlers.length > 0) {
    impact.eventTypes = eventHandlers.map(h => h.name);
    impact.description = `Registers handlers for events: ${impact.eventTypes.join(', ')}`;
  }

  return impact;
}

/**
 * Enriquece el grafo de impacto con información de registros dinámicos
 * @param {Object} impactGraph - Grafo de impacto existente
 * @param {Object} parsedFiles - Archivos parseados con sus registros
 * @returns {Object} Grafo enriquecido
 */
export function enrichImpactGraphWithRegistrations(impactGraph, parsedFiles) {
  const enriched = { ...impactGraph };

  for (const [filePath, fileData] of Object.entries(parsedFiles)) {
    const registrations = fileData.registrations || [];

    if (registrations.length > 0) {
      // Añadir metadatos de registro al grafo
      if (!enriched.nodes) enriched.nodes = {};
      if (!enriched.nodes[filePath]) enriched.nodes[filePath] = {};

      enriched.nodes[filePath].registrations = registrations;
      enriched.nodes[filePath].hasDynamicImpact = true;

      // Añadir edges de impacto dinámico
      if (!enriched.dynamicEdges) enriched.dynamicEdges = [];

      for (const reg of registrations) {
        if (reg.impact === 'all_files') {
          // Este archivo afecta a todos los demás
          enriched.dynamicEdges.push({
            from: filePath,
            to: '*', // Wildcard para "todos los archivos"
            type: 'dynamic_registration',
            registrationType: reg.type,
            registrationName: reg.name
          });
        }
      }
    }
  }

  return enriched;
}

export default {
  detectRegistrations,
  calculateDynamicImpact,
  enrichImpactGraphWithRegistrations
};
