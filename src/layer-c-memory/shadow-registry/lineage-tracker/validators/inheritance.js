/**
 * @fileoverview Inheritance Validator
 * 
 * Calcula y propaga herencia entre sombras y átomos.
 * 
 * @module layer-c-memory/shadow-registry/lineage-tracker/validators/inheritance
 */

import { calculateVibrationScore } from '../utils/vibration.js';

/**
 * Calcula qué datos se pueden heredar de un átomo
 * @param {Object} atom - Átomo fuente
 * @returns {Object} Datos heredables
 */
export function calculateInheritance(atom) {
  const connections = atom.connections || [];
  
  return {
    connections: connections.map(c => ({
      target: c.target,
      type: c.type,
      weight: c.weight || 1.0,
      via: c.via
    })),
    
    connectionCount: connections.length,
    
    vibrationScore: calculateVibrationScore(atom),
    
    rupturedConnections: [], // Se llena cuando se detecta reemplazo
    
    // Huellas para matching
    dnaFingerprint: atom.dna ? {
      structuralHash: atom.dna.structuralHash,
      patternHash: atom.dna.patternHash,
      flowType: atom.dna.flowType
    } : null
  };
}

/**
 * Propaga herencia de una sombra a su descendiente
 * 
 * @param {Object} shadow - Sombra ancestro
 * @param {Object} atom - Átomo descendiente
 * @returns {Object} Ancestry enriquecido
 */
export function propagateInheritance(shadow, atom) {
  const ancestry = {
    replaced: shadow.shadowId,
    lineage: [
      shadow.shadowId,
      ...(shadow.lineage?.ancestors || [])
    ],
    generation: (shadow.lineage?.generation || 0) + 1,
    vibrationScore: shadow.inheritance.vibrationScore,
    strongConnections: [],
    warnings: []
  };
  
  // Heredar conexiones que siguen existiendo
  const currentConnections = new Set((atom.connections || []).map(c => c.target));
  
  ancestry.strongConnections = shadow.inheritance.connections.filter(c => 
    currentConnections.has(c.target)
  );
  
  // Detectar conexiones rotas
  const ruptured = shadow.inheritance.connections.filter(c => 
    !currentConnections.has(c.target)
  );
  
  if (ruptured.length > 0) {
    ancestry.warnings.push({
      type: 'ruptured_lineage',
      count: ruptured.length,
      connections: ruptured.map(c => c.target)
    });
  }
  
  // Detectar cambios significativos
  if (shadow.dna && atom.dna) {
    if (shadow.dna.complexityScore > atom.dna.complexityScore + 3) {
      ancestry.warnings.push({
        type: 'complexity_drop',
        message: `Complexity dropped from ${shadow.dna.complexityScore} to ${atom.dna.complexityScore}`
      });
    }
    
    if (shadow.dna.flowType !== atom.dna.flowType) {
      ancestry.warnings.push({
        type: 'flow_type_change',
        from: shadow.dna.flowType,
        to: atom.dna.flowType
      });
    }
  }
  
  return ancestry;
}
