/**
 * @fileoverview Code Processor
 * Processes code character by character
 * 
 * @module preprocessor/engine/code-processor
 */

import { createLookahead } from './lookahead-creator.js';
import { updateContext } from './context-updater.js';
import { trackToken } from './token-tracker.js';
import { ACTIONS } from '../token-classifier.js';

/**
 * Processes code and applies transformations
 * @param {string} code - Source code
 * @param {Object} context - Context model
 * @param {Object} classifier - Token classifier
 * @param {Object} handler - Language handler
 * @param {Object} options - Processing options
 * @returns {{ code: string, debug?: Array, transformations: Array, warnings: Array }}
 */
export function processCode(code, context, classifier, handler, options = {}) {
  let output = '';
  let i = 0;
  const debugLog = [];
  const transformations = [];
  const warnings = [];
  
  // Buffer for lookahead (previous characters)
  let prevChars = '';
  const maxPrev = options.maxBufferSize || 100;
  
  while (i < code.length) {
    const char = code[i];
    const lookahead = createLookahead(code, i, prevChars);
    
    // Update context before classifying
    updateContext(context, char, lookahead, handler);
    
    // Classify the character
    const classification = classifier.classify(char, i, lookahead);
    
    // Debug logging
    if (options.debug) {
      debugLog.push({
        position: i,
        char,
        context: context.current(),
        classification
      });
    }
    
    // Apply action based on classification
    const result = applyAction(char, i, classification, output, transformations, warnings);
    output = result.output;
    i = result.newIndex;
    
    // Update previous characters buffer
    prevChars = (prevChars + char).slice(-maxPrev);
    
    // Track tokens for context
    trackToken(context, char, lookahead);
  }
  
  return { 
    code: output, 
    debug: options.debug ? debugLog : undefined,
    transformations,
    warnings
  };
}

/**
 * Applies action based on token classification
 * @param {string} char - Current character
 * @param {number} position - Current position
 * @param {Object} classification - Token classification
 * @param {string} output - Current output
 * @param {Array} transformations - Transformations array
 * @param {Array} warnings - Warnings array
 * @returns {{ output: string, newIndex: number }}
 */
function applyAction(char, position, classification, output, transformations, warnings) {
  switch (classification.action) {
    case ACTIONS.KEEP:
      return {
        output: output + char,
        newIndex: position + 1
      };
      
    case ACTIONS.REPLACE:
      if (classification.transform) {
        const { placeholder, original, skipChars } = classification.transform;
        
        // Register transformation
        transformations.push({
          position: output.length,
          original,
          placeholder,
          type: classification.type,
          rule: classification.rule,
          originalPosition: position
        });
        
        return {
          output: output + placeholder,
          newIndex: position + (skipChars || original.length)
        };
      } else {
        // Fallback: keep if no transform
        return {
          output: output + char,
          newIndex: position + 1
        };
      }
      
    case ACTIONS.SKIP:
      return {
        output,
        newIndex: position + 1
      };
      
    case ACTIONS.ERROR:
      warnings.push({
        position,
        char,
        message: `Token no esperado: ${char}`,
        context: 'processing'
      });
      return {
        output: output + char,
        newIndex: position + 1
      };
      
    default:
      return {
        output: output + char,
        newIndex: position + 1
      };
  }
}
