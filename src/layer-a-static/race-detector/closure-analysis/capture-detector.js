/**
 * @fileoverview Capture Detector
 * 
 * Detects captured variables in closures that might cause races.
 * 
 * @module race-detector/closure-analysis/capture-detector
 * @version 1.0.0
 */

import { createLogger } from '#utils/logger.js';
import { extractDeclarations, extractReferences, extractAsyncCallbackVars } from './variable-extractor.js';
import { isSharedStateVariable } from '../utils/index.js';

const logger = createLogger('race-detector:closure');

// Closure patterns
const CLOSURE_PATTERNS = {
  arrow: {
    pattern: /\(([^)]*)\)\s*=>\s*{([^}]*)}/gs,
    location: 'arrow-function'
  },
  function: {
    pattern: /function\s*\w*\s*\([^)]*\)\s*{([^}]*)}/gs,
    location: 'function-expression'
  },
  asyncCallback: {
    pattern: /\.(then|catch|finally)\s*\([^)]*\)\s*=>/g,
    location: 'async-callback'
  }
};

/**
 * Find captured variables in closures
 * @param {Object} atom - Atom to analyze
 * @returns {Array<Object>} - Captured variables with metadata
 */
export function findCapturedVariables(atom) {
  if (!atom?.code) return [];
  
  const captured = [];
  
  try {
    const code = atom.code;
    
    // Pattern 1: Arrow functions
    captured.push(...analyzeArrowFunctions(code, atom));
    
    // Pattern 2: Regular function expressions
    captured.push(...analyzeFunctionExpressions(code, atom));
    
    // Pattern 3: Async callbacks (higher risk)
    captured.push(...analyzeAsyncCallbacks(code, atom));
    
  } catch (error) {
    logger?.debug(`Failed to parse closures in ${atom.id}: ${error.message}`);
  }
  
  return captured;
}

/**
 * Analyze arrow functions for captured variables
 * @private
 */
function analyzeArrowFunctions(code, atom) {
  const captured = [];
  const { pattern, location } = CLOSURE_PATTERNS.arrow;
  
  let match;
  while ((match = pattern.exec(code)) !== null) {
    const params = match[1];
    const body = match[2];
    
    const declaredInClosure = extractDeclarations(params + body);
    const referenced = extractReferences(body);
    
    for (const ref of referenced) {
      if (!declaredInClosure.includes(ref) && isSharedStateVariable(ref)) {
        captured.push({
          name: ref,
          type: 'closure-captured',
          location,
          risk: calculateCaptureRisk(ref, atom),
          atomId: atom.id
        });
      }
    }
  }
  
  return captured;
}

/**
 * Analyze function expressions for captured variables
 * @private
 */
function analyzeFunctionExpressions(code, atom) {
  const captured = [];
  const { pattern, location } = CLOSURE_PATTERNS.function;
  
  let match;
  while ((match = pattern.exec(code)) !== null) {
    const body = match[1];
    const declaredInClosure = extractDeclarations(body);
    const referenced = extractReferences(body);
    
    for (const ref of referenced) {
      if (!declaredInClosure.includes(ref) && isSharedStateVariable(ref)) {
        captured.push({
          name: ref,
          type: 'closure-captured',
          location,
          risk: calculateCaptureRisk(ref, atom),
          atomId: atom.id
        });
      }
    }
  }
  
  return captured;
}

/**
 * Analyze async callbacks for captured variables
 * @private
 */
function analyzeAsyncCallbacks(code, atom) {
  const captured = [];
  const { pattern } = CLOSURE_PATTERNS.asyncCallback;
  
  if (!pattern.test(code)) return captured;
  
  // Reset pattern
  pattern.lastIndex = 0;
  
  const asyncVars = extractAsyncCallbackVars(code);
  for (const ref of asyncVars) {
    if (isSharedStateVariable(ref)) {
      captured.push({
        name: ref,
        type: 'closure-captured',
        location: 'async-callback',
        risk: 'high',
        atomId: atom.id
      });
    }
  }
  
  return captured;
}

/**
 * Calculate risk level of captured variable
 * @param {string} variable - Variable name
 * @param {Object} atom - Atom metadata
 * @returns {string} - Risk level: 'low' | 'medium' | 'high'
 */
export function calculateCaptureRisk(variable, atom) {
  if (atom.isAsync) return 'high';
  if (variable.includes('state') || variable.includes('cache')) return 'high';
  if (variable.includes('shared') || variable.includes('global')) return 'high';
  return 'medium';
}
