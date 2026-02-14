/**
 * @fileoverview index.js
 *
 * Public API for atom extraction phase
 *
 * @module pipeline/phases/atom-extraction
 */

export { AtomExtractionPhase } from './AtomExtractionPhase.js';
export { extractAtoms, extractAtomMetadata } from './extraction/atom-extractor.js';
export { buildAtomMetadata } from './builders/metadata-builder.js';
export { calculateComplexity } from './metadata/complexity.js';
export { detectAtomArchetype, recalculateArchetypes } from './metadata/archetype.js';
export { buildCallGraph } from './graph/call-graph.js';
