/**
 * @fileoverview SOLID Suggest Split Tool
 * 
 * Analiza un archivo Monolítico y propone una división lógica 
 * basada en Arquetipos, Propósitos y Cohesión.
 */

import { loadAtoms } from '#layer-c/storage/index.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:patterns:solid-split');

/**
 * Propone una estrategia de división para un archivo
 */
export async function suggestSolidSplit(filePath, projectPath) {
  try {
    const atoms = await loadAtoms(projectPath, filePath);
    if (!atoms || atoms.length === 0) {
      return { error: 'No atoms found in file' };
    }

    // Agrupar por arquetipo y propósito
    const groups = {};
    for (const atom of atoms) {
      const groupKey = `${atom.archetype?.type || 'unknown'}_${atom.purpose || 'HELPER'}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(atom.name);
    }

    const proposals = Object.entries(groups).map(([key, functionNames]) => {
      const [archetype, purpose] = key.split('_');
      
      // Inferir nombre de archivo sugerido
      let suggestedName = cleanSymbolName(purpose.toLowerCase());
      if (archetype === 'factory') suggestedName += '-factory';
      if (archetype === 'utility') suggestedName += '-utils';
      
      return {
        targetFile: `${suggestedName}.js`,
        archetype,
        purpose,
        functions: functionNames,
        reason: `Agrupación por responsabilidad de ${purpose} (${archetype})`
      };
    });

    return {
      sourceFile: filePath,
      totalAtoms: atoms.length,
      proposalCount: proposals.length,
      proposals: proposals.sort((a, b) => b.functions.length - a.functions.length)
    };
  } catch (error) {
    logger.error(`Error suggesting split: ${error.message}`);
    return { error: error.message };
  }
}

function cleanSymbolName(name) {
  return name.toLowerCase().replace(/_/g, '-').replace(/[^a-z-]/g, '');
}
