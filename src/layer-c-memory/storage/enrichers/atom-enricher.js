/**
 * @fileoverview atom-enricher.js
 * 
 * Enriquecedor de atomos que calcula vectores matematicos
 * antes de guardar en el repositorio.
 * 
 * Este modulo es el puente entre los extractores y el storage.
 * Agrega los vectores necesarios para Semantic Algebra.
 * 
 * @module storage/enrichers/atom-enricher
 */

import { calculateAtomVectors } from '../repository/utils/vector-calculator.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:Storage:AtomEnricher');

/**
 * Enriquece un atomo con vectores matematicos
 * @param {Object} atom - Atomo base desde extractores
 * @param {Object} context - Contexto adicional
 * @returns {Object} Atomo enriquecido
 */
export function enrichAtom(atom, context = {}) {
  logger.debug(`[AtomEnricher] Enriching atom: ${atom.id}`);
  
  // Calcular vectores matematicos
  const vectors = calculateAtomVectors(atom, context);
  
  // Crear atomo enriquecido
  const enrichedAtom = {
    ...atom,
    
    // Campos calculados
    linesOfCode: vectors.linesOfCode,
    parameterCount: vectors.parameterCount,
    
    // Vectores relacionales
    callersCount: vectors.callersCount,
    calleesCount: vectors.calleesCount,
    dependencyDepth: vectors.dependencyDepth,
    externalCallCount: vectors.externalCallCount,
    
    // Vectores semanticos
    archetypeWeight: vectors.archetypeWeight,
    cohesionScore: vectors.cohesionScore,
    couplingScore: vectors.couplingScore,
    
    // Vectores temporales
    changeFrequency: vectors.changeFrequency,
    ageDays: vectors.ageDays,
    
    // Vectores para Semantic Algebra
    importanceScore: vectors.importance,
    stabilityScore: vectors.stability,
    propagationScore: vectors.propagation,
    fragilityScore: vectors.fragility,
    testabilityScore: vectors.testability,
    
    // Derived completo
    derived: {
      ...(atom.derived || {}),
      fragilityScore: vectors.fragility,
      testabilityScore: vectors.testability,
      couplingScore: vectors.coupling,
      changeRisk: vectors.propagation
    }
  };
  
  logger.debug(`[AtomEnricher] Enriched with ${Object.keys(vectors).length} vectors`);
  
  return enrichedAtom;
}

/**
 * Enriquece multiples atomos en batch
 * @param {Array} atoms - Lista de atomos
 * @param {Object} context - Contexto compartido
 * @returns {Array} Atomos enriquecidos
 */
export function enrichAtoms(atoms, context = {}) {
  logger.info(`[AtomEnricher] Enriching ${atoms.length} atoms`);
  
  // Primero pasada: enriquecer cada atomo individualmente
  const enriched = atoms.map(atom => enrichAtom(atom, {
    ...context,
    // Contexto especifico del atomo
    callers: context.callGraph?.[atom.id]?.callers || [],
    callees: context.callGraph?.[atom.id]?.callees || []
  }));
  
  // Segunda pasada: recalcular vectores que dependen de otros atomos
  // (importance, propagation basados en callers/callees ya calculados)
  const finalEnriched = enriched.map(atom => {
    const updatedContext = {
      ...context,
      callers: enriched.filter(a => 
        a.calls?.some(c => {
          const calleeName = typeof c === 'string' ? c : c.callee;
          return calleeName === atom.name;
        })
      ),
      callees: enriched.filter(a => 
        atom.calls?.some(c => {
          const calleeName = typeof c === 'string' ? c : c.callee;
          return calleeName === a.name;
        })
      )
    };
    
    // Recalcular vectores con contexto actualizado
    const updatedVectors = calculateAtomVectors(atom, updatedContext);
    
    return {
      ...atom,
      importanceScore: updatedVectors.importance,
      propagationScore: updatedVectors.propagation,
      callersCount: updatedContext.callers.length,
      calleesCount: updatedContext.callees.length
    };
  });
  
  logger.info(`[AtomEnricher] Enriched ${finalEnriched.length} atoms successfully`);
  
  return finalEnriched;
}

/**
 * Re-enriquece átomos existentes con vectores actualizados
 * Esto asegura que mejoras en los enrichers se apliquen a átomos ya guardados
 * @param {string} rootPath - Ruta del proyecto
 * @param {boolean} verbose - Modo verbose
 */
export async function reEnrichExistingAtoms(rootPath, verbose = false) {
  const { queryAtoms, saveAtom } = await import('#layer-c/storage/atoms/atom.js');
  const { getRepository } = await import('#layer-c/storage/repository/index.js');
  
  const repo = getRepository(rootPath);
  const allAtoms = await queryAtoms(rootPath, {});
  
  if (verbose) {
    console.log(`[ReEnrich] Processing ${allAtoms.length} existing atoms...`);
  }
  
  let updated = 0;
  for (const atom of allAtoms) {
    // Re-calcular vectores con el enricher actualizado
    const enriched = enrichAtom(atom, {});
    
    // Actualizar solo si hay cambios significativos
    const needsUpdate = 
      enriched.cohesionScore !== atom.cohesionScore ||
      enriched.hasErrorHandling !== atom.hasErrorHandling ||
      enriched.changeFrequency !== atom.changeFrequency;
    
    if (needsUpdate) {
      try {
        await saveAtom(rootPath, atom.filePath, atom.name, enriched);
        updated++;
      } catch (e) {
        // Silently skip errors
      }
    }
  }
  
  if (verbose) {
    console.log(`[ReEnrich] Updated ${updated} atoms with new vectors`);
  }
  
  return { total: allAtoms.length, updated };
}

export default { enrichAtom, enrichAtoms, reEnrichExistingAtoms };