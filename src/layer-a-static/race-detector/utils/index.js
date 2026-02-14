/**
 * @fileoverview Race Detector Utils - Index
 * 
 * Centralizes all utility functions for the race detector.
 * Follows SSOT principle for helper functions.
 * 
 * @module race-detector/utils
 * @version 1.0.0
 */

export {
  findAtomById,
  extractQueueName,
  isSharedStateVariable,
  isJavaScriptKeyword
} from './atom-utils.js';
