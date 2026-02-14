/**
 * @fileoverview Death Tracker
 * 
 * Registra la muerte de un átomo y crea su sombra.
 * 
 * @module layer-c-memory/shadow-registry/lineage-tracker/trackers/death
 */

import { ShadowStatus } from '../../types.js';
import { generateShadowId } from '../storage/id-generator.js';
import { extractMetadata } from '../storage/metadata.js';
import { calculateInheritance } from '../validators/inheritance.js';

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
