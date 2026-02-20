/**
 * @fileoverview Relationship Analyzer
 * 
 * Analiza relaciones entre archivos/átomos - "Sociedad de Átomos"
 * 
 * Principio: "Los archivos son como casas en un vecindario - 
 * si comparten cercas (imports), son vecinos"
 * 
 * @module inference-engine/relationship-analyzer
 */

import { analyzeNeighborhood } from './detectors/neighborhood.js';

/**
 * Analizador de relaciones
 */
export class RelationshipAnalyzer {
  constructor() {
    // Cache de análisis previos
    this._cache = new Map();
  }

  /**
   * Analiza relaciones de un archivo con el resto del proyecto
   * 
   * @param {Object} fileAnalysis - Análisis del archivo
   * @param {Map} allFiles - Mapa de todos los archivos (filePath → fileAnalysis)
   * @returns {Object} Relaciones detectadas
   */
  analyze(fileAnalysis, allFiles = new Map()) {
    const filePath = fileAnalysis.filePath || '';
    
    // Verificar cache
    if (this._cache.has(filePath)) {
      return this._cache.get(filePath);
    }

    const relationships = {
      // Vecinos: archivos que comparten imports
      neighbors: [],
      
      // Jerarquía: callers y callees
      hierarchy: {
        callers: [],   // Quién llama a este archivo
        callees: []    // A quién llama este archivo
      },
      
      // Barreras: validaciones, error handlers
      barriers: {
        hasValidation: false,
        hasErrorHandling: false,
        validationPoints: []
      },
      
      // Acoplamiento
      coupling: {
        incoming: 0,   // Cuántos dependen de este
        outgoing: 0,   // De cuántos depende este
        score: 0       // 0-1, donde 1 es muy acoplado
      }
    };

    // Analizar vecindario
    const neighborhood = analyzeNeighborhood(fileAnalysis, allFiles);
    relationships.neighbors = neighborhood.neighbors;

    // Analizar jerarquía
    relationships.hierarchy = this._analyzeHierarchy(fileAnalysis);

    // Analizar barreras
    relationships.barriers = this._analyzeBarriers(fileAnalysis);

    // Calcular acoplamiento
    relationships.coupling = this._calculateCoupling(fileAnalysis);

    // Guardar en cache
    this._cache.set(filePath, relationships);

    return relationships;
  }

  /**
   * @private - Analiza jerarquía de llamadas
   */
  _analyzeHierarchy(fileAnalysis) {
    const callers = [];
    const callees = [];

    // Callers: usedBy
    if (fileAnalysis.usedBy) {
      callers.push(...fileAnalysis.usedBy);
    }

    // Callees: imports que son usados
    if (fileAnalysis.imports) {
      callees.push(...fileAnalysis.imports.map(i => i.source || i));
    }

    // También llamados por atoms
    if (fileAnalysis.atoms) {
      for (const atom of fileAnalysis.atoms) {
        if (atom.calls) {
          for (const call of atom.calls) {
            if (call.type === 'external' && !callees.includes(call.name)) {
              callees.push(call.name);
            }
          }
        }
      }
    }

    return { callers, callees };
  }

  /**
   * @private - Analiza barreras de protección
   */
  _analyzeBarriers(fileAnalysis) {
    const barriers = {
      hasValidation: false,
      hasErrorHandling: false,
      validationPoints: []
    };

    if (!fileAnalysis.atoms) return barriers;

    for (const atom of fileAnalysis.atoms) {
      // Verificar validación
      if (atom.hasValidation || 
          atom.params?.some(p => p.validation)) {
        barriers.hasValidation = true;
        barriers.validationPoints.push(atom.name);
      }

      // Verificar error handling
      if (atom.hasErrorHandling || 
          atom.errorFlow?.hasTryCatch) {
        barriers.hasErrorHandling = true;
      }
    }

    return barriers;
  }

  /**
   * @private - Calcula score de acoplamiento
   */
  _calculateCoupling(fileAnalysis) {
    const incoming = (fileAnalysis.usedBy?.length || 0);
    const outgoing = (fileAnalysis.imports?.length || 0);
    
    // Score normalizado: 0 = aislado, 1 = muy conectado
    // Usamos una fórmula logarítmica para evitar que archivos muy conectados
    // dominen el score
    const totalConnections = incoming + outgoing;
    const score = Math.min(1, Math.log10(totalConnections + 1) / 2);

    return { incoming, outgoing, score };
  }

  /**
   * Limpia el cache
   */
  clearCache() {
    this._cache.clear();
  }
}

export default RelationshipAnalyzer;