/**
 * @fileoverview Lineage Tracker - Trazabilidad de ADN a través del tiempo
 * 
 * Responsabilidad: Mantener el árbol genealógico de átomos.
 * SSOT: Único lugar donde se registran las relaciones ancestro-descendiente.
 * 
 * @module layer-c-memory/shadow-registry/lineage-tracker
 */

import { ShadowStatus, EvolutionType } from './types.js';

/**
 * Registra el nacimiento de un nuevo átomo
 * 
 * @param {Object} atom - Átomo nuevo
 * @param {Object} [parentShadow] - Sombra padre (si evoluciona de otra)
 * @returns {Object} Información de lineage
 */
export function registerBirth(atom, parentShadow = null) {
  const lineage = {
    generation: 0,
    ancestors: [],
    parentId: null,
    evolutionType: null
  };
  
  if (parentShadow) {
    lineage.generation = parentShadow.lineage.generation + 1;
    lineage.parentId = parentShadow.shadowId;
    lineage.ancestors = [
      parentShadow.shadowId,
      ...(parentShadow.lineage?.ancestors || [])
    ];
    lineage.evolutionType = detectEvolutionType(parentShadow, atom);
  }
  
  return lineage;
}

/**
 * Registra la muerte de un átomo y crea su sombra
 * 
 * @param {Object} atom - Átomo que muere
 * @param {Object} options
 * @param {string} options.reason - Razón de la muerte
 * @param {string} options.replacementId - ID del reemplazo (opcional)
 * @returns {Object} Sombra creada
 */
export function registerDeath(atom, options = {}) {
  const now = new Date().toISOString();
  const born = new Date(atom.createdAt || now);
  const died = new Date(now);
  const lifespan = Math.floor((died - born) / (1000 * 60 * 60 * 24));
  
  return {
    shadowId: generateShadowId(),
    originalId: atom.id,
    status: options.replacementId ? ShadowStatus.REPLACED : ShadowStatus.DELETED,
    replacedBy: options.replacementId || null,
    bornAt: atom.createdAt || now,
    diedAt: now,
    lifespan,
    
    dna: atom.dna,
    metadata: extractMetadata(atom),
    
    lineage: atom.ancestry ? {
      parentShadowId: atom.ancestry.replaced,
      childShadowIds: [],
      evolutionType: null,
      generation: atom.ancestry.generation || 0
    } : {
      parentShadowId: null,
      childShadowIds: [],
      evolutionType: null,
      generation: 0
    },
    
    inheritance: calculateInheritance(atom),
    
    death: {
      reason: options.reason || 'unknown',
      commitsInvolved: options.commits || [],
      riskIntroduced: options.risk || 0,
      replacementId: options.replacementId || null
    }
  };
}

/**
 * Detecta el tipo de evolución entre sombra y nuevo átomo
 */
function detectEvolutionType(shadow, newAtom) {
  // Comparar DNA
  const dna1 = shadow.dna;
  const dna2 = newAtom.dna;
  
  if (!dna1 || !dna2) return EvolutionType.REFACTOR;
  
  // Mismo hash estructural = renombrado
  if (dna1.structuralHash === dna2.structuralHash) {
    return EvolutionType.RENAMED;
  }
  
  // Mismo patrón, diferente complejidad
  if (dna1.patternHash === dna2.patternHash) {
    if (dna2.complexityScore > dna1.complexityScore) {
      return EvolutionType.EXPANDED;
    }
    if (dna2.complexityScore < dna1.complexityScore) {
      return EvolutionType.SHRINKED;
    }
    return EvolutionType.REFACTOR;
  }
  
  // Cambio de dominio semántico
  if (dna1.semanticFingerprint !== dna2.semanticFingerprint) {
    return EvolutionType.DOMAIN_CHANGE;
  }
  
  // Cambio de patrón = reimplementación
  return EvolutionType.REIMPLEMENTED;
}

/**
 * Calcula qué datos se pueden heredar de un átomo
 */
function calculateInheritance(atom) {
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
 * Calcula el score de vibración (intensidad de conexiones)
 */
function calculateVibrationScore(atom) {
  const connections = atom.connections || [];
  if (connections.length === 0) return 0;
  
  // Promedio ponderado de pesos de conexión
  const totalWeight = connections.reduce((sum, c) => sum + (c.weight || 1), 0);
  const avgWeight = totalWeight / connections.length;
  
  // Factor de complejidad
  const complexity = atom.dna?.complexityScore || 5;
  
  // Normalizar a 0-1
  return Math.min(1, (avgWeight * connections.length * complexity) / 100);
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

/**
 * Genera ID único para sombra
 */
function generateShadowId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `shadow_${timestamp}_${random}`;
}

/**
 * Extrae metadata relevante para storage
 */
function extractMetadata(atom) {
  return {
    name: atom.name,
    dataFlow: atom.dataFlow ? {
      inputCount: atom.dataFlow.inputs?.length || 0,
      outputCount: atom.dataFlow.outputs?.length || 0,
      transformationCount: atom.dataFlow.transformations?.length || 0
    } : null,
    semantic: atom.semantic,
    filePath: atom.filePath,
    lineNumber: atom.lineNumber,
    isExported: atom.isExported
  };
}

/**
 * Reconstruye el árbol genealógico completo de un átomo
 * 
 * @param {string} shadowId - ID de la sombra más reciente
 * @param {Function} getShadow - Función para obtener sombra por ID
 * @returns {Object[]} Array de sombras desde el origen hasta la más reciente
 */
export async function reconstructLineage(shadowId, getShadow) {
  const lineage = [];
  let currentId = shadowId;
  
  while (currentId) {
    const shadow = await getShadow(currentId);
    if (!shadow) break;
    
    lineage.unshift(shadow); // Agregar al principio
    
    currentId = shadow.lineage?.parentShadowId;
    
    // Prevenir loops infinitos
    if (lineage.length > 100) {
      throw new Error('Lineage too deep (possible cycle)');
    }
  }
  
  return lineage;
}

/**
 * Calcula similitud de lineage entre dos átomos
 * 
 * @param {Object} atom1 
 * @param {Object} atom2
 * @returns {number} Similitud 0-1
 */
export function compareLineage(atom1, atom2) {
  const lineage1 = atom1.ancestry?.lineage || [];
  const lineage2 = atom2.ancestry?.lineage || [];
  
  if (lineage1.length === 0 && lineage2.length === 0) return 1;
  if (lineage1.length === 0 || lineage2.length === 0) return 0;
  
  // Contar ancestros comunes
  const common = lineage1.filter(id => lineage2.includes(id));
  const total = new Set([...lineage1, ...lineage2]).size;
  
  return common.length / total;
}
