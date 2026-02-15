/**
 * @fileoverview Ancestry Extractor - Extracción de conexiones heredadas
 * 
 * @module pipeline/enhancers/connections/ancestry
 */

import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:connections:ancestry');

/**
 * Extrae conexiones heredadas de ancestry (Shadow Registry)
 * 
 * NOTA: Esta función usa datos ya presentes en los átomos (ancestry),
 * no consulta directamente al Shadow Registry para evitar dependencias
 * circulares entre layers.
 * 
 * @param {Array} atoms - Todos los átomos
 * @returns {Promise<Array>} Conexiones heredadas
 */
export async function extractInheritedConnections(atoms) {
  const connections = [];
  
  try {
    for (const atom of atoms) {
      if (!atom.ancestry?.replaced) continue;
      
      // Conexiones fuertes que sobrevivieron
      for (const conn of atom.ancestry.strongConnections || []) {
        connections.push({
          type: 'inherited',
          from: atom.id,
          to: conn.target,
          weight: conn.weight,
          generation: atom.ancestry.generation,
          inheritedFrom: atom.ancestry.replaced,
          confidence: 0.7,
          evidence: {
            survivalGenerations: atom.ancestry.generation
          }
        });
      }
      
      // Advertencias de conexiones rotas
      for (const warning of atom.ancestry.warnings || []) {
        if (warning.type === 'ruptured_lineage') {
          for (const target of warning.connections || []) {
            connections.push({
              type: 'ruptured',
              from: atom.id,
              to: target,
              status: 'broken',
              warning: true,
              confidence: 0.9,
              reason: 'Connection existed in ancestor but not in current'
            });
          }
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to extract inherited connections:', error.message);
  }
  
  logger.debug(`Extracted ${connections.length} inherited connections`);
  return connections;
}

/**
 * Calcula score de vibración promedio
 * @param {Array} atoms - Átomos a analizar
 * @returns {number} Vibración promedio
 */
export function calculateAverageVibration(atoms) {
  const vibrations = atoms
    .filter(a => a.ancestry?.vibrationScore)
    .map(a => a.ancestry.vibrationScore);
  
  if (vibrations.length === 0) return 0;
  
  return vibrations.reduce((a, b) => a + b, 0) / vibrations.length;
}
