/**
 * @fileoverview Prompt Engine Utils - Index
 * 
 * Utilidades para el motor de prompts.
 * 
 * @module prompt-engine/utils
 * @version 1.0.0
 */

export {
  extractPlaceholders,
  replacePlaceholder,
  replaceAllPlaceholders,
  createReplacementMap,
  applyReplacements
} from './placeholder-replacer.js';

export {
  compactBlock,
  compactMetadataSection,
  insertFileContent,
  formatMetadataForDisplay
} from './metadata-formatter.js';
