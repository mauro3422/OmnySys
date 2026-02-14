/**
 * @fileoverview Execution Order Detector
 * 
 * Detects implicit execution ordering constraints.
 * 
 * @module temporal-connections/execution
 */

const INIT_PATTERNS = [
  /^(init|setup|configure|prepare|bootstrap|start|create|initialize)[A-Z]/,
  /^(init|setup|configure|prepare|bootstrap|start|create|initialize)$/
];

/**
 * Detects implicit execution ordering
 * @param {string} code - Source code
 * @param {Object} functionInfo - Function metadata
 * @returns {Object} Execution order constraints
 */
export function detectExecutionOrder(code, functionInfo = {}) {
  const order = {
    mustRunBefore: [],
    mustRunAfter: [],
    canRunInParallel: []
  };

  const name = functionInfo.name || '';
  
  // Check for initialization patterns in name
  const isInitByName = INIT_PATTERNS.some(p => p.test(name));

  // Check for initialization behavior patterns
  const hasSingletonSetup = /(?:let|const|var)\s+\w+\s*=\s*(?:null|undefined)/.test(code) &&
                           /=\s*new\s+/.test(code);
  const hasConfigSetup = /(?:config|configuration|settings)\s*=/.test(code) &&
                        /(?:load|read|parse|default)/.test(code);
  const hasStateSetup = /(?:state|store|cache)\s*=/.test(code) &&
                       /(?:create|initialize|default)/.test(code);

  if (isInitByName || hasSingletonSetup || hasConfigSetup || hasStateSetup) {
    order.mustRunBefore.push({
      reason: 'initialization-provider',
      provides: ['config', 'state', 'singleton'],
      confidence: isInitByName ? 0.9 : 0.7,
      evidence: { isInitByName, hasSingletonSetup, hasConfigSetup, hasStateSetup }
    });
  }

  // Check for consumer patterns
  const consumerPattern = /(?:get|load|fetch)(?:Config|State|Data|Instance)/;
  if (consumerPattern.test(code)) {
    order.mustRunAfter.push({
      reason: 'initialization-consumer',
      needs: ['initialization'],
      confidence: 0.7
    });
  }

  return order;
}

/**
 * Checks if a function name indicates initialization
 * @param {string} name - Function name
 * @returns {boolean} True if initializer pattern
 */
export function isInitializerByName(name) {
  return INIT_PATTERNS.some(p => p.test(name || ''));
}

/**
 * Classifies function by execution role
 * @param {string} name - Function name
 * @param {string} code - Function code
 * @returns {string} Role classification
 */
export function classifyExecutionRole(name, code) {
  if (isInitializerByName(name)) return 'initializer';
  if (/(?:get|load|fetch)(?:Config|State|Data|Instance)/.test(code)) return 'consumer';
  if (/cleanup|dispose|teardown|destroy/i.test(name)) return 'cleanup';
  return 'standard';
}
