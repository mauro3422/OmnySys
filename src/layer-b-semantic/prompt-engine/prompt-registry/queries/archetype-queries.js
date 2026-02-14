/**
 * @fileoverview Archetype Queries
 * 
 * Funciones de consulta sobre el registro de arquetipos.
 * 
 * @module prompt-registry/queries/archetype-queries
 * @version 1.0.0
 */

import { ARCHETYPE_REGISTRY } from '../registry-data.js';

export const getArchetype = (type) => ARCHETYPE_REGISTRY.find(a => a.type === type);

export const detectArchetypes = (metadata, logger) =>
  ARCHETYPE_REGISTRY
    .filter(a => a.type !== 'default')
    .filter(a => {
      try {
        return !!a.detector(metadata);
      } catch (error) {
        logger?.warn?.(`Archetype detector failed (${a.type}): ${error.message}`);
        return false;
      }
    })
    .map(a => ({ type: a.type, severity: Number.isFinite(a.severity) ? a.severity : 0 }));

export const selectArchetypeBySeverity = (archetypes) =>
  archetypes.length === 0 ? 'default' : archetypes.sort((a, b) => b.severity - a.severity)[0].type;

export const getTemplateForType = (type, defaultTemplate) =>
  getArchetype(type)?.template || defaultTemplate;

export const getMergeConfig = (type) => {
  const archetype = getArchetype(type);
  if (!archetype) return null;
  return { mergeKey: archetype.mergeKey, fields: archetype.fields, isDetectedByMetadata: archetype.detector };
};

export const listAvailableArchetypes = () =>
  ARCHETYPE_REGISTRY.map(a => ({ type: a.type, severity: a.severity, mergeKey: a.mergeKey, fields: a.fields }));

export const filterArchetypesRequiringLLM = (archetypes) =>
  archetypes.filter(a => {
    const archetype = getArchetype(a.type);
    return archetype?.requiresLLM === true || archetype?.requiresLLM === 'conditional';
  });

export const archetypeRequiresLLM = (type) => getArchetype(type)?.requiresLLM ?? true;

export default {
  getArchetype, detectArchetypes, selectArchetypeBySeverity, getTemplateForType,
  getMergeConfig, listAvailableArchetypes, filterArchetypesRequiringLLM, archetypeRequiresLLM
};
