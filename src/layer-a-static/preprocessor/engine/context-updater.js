/**
 * @fileoverview Context Updater
 * Updates context based on current character and lookahead
 * 
 * @module preprocessor/engine/context-updater
 */

/**
 * Updates bracket depths in context
 * @param {Object} context - Context model
 * @param {string} char - Current character
 */
export function updateBracketDepths(context, char) {
  if (char === '{') context.incrementDepth('braces');
  if (char === '}') context.decrementDepth('braces');
  if (char === '[') context.incrementDepth('brackets');
  if (char === ']') context.decrementDepth('brackets');
  if (char === '(') context.incrementDepth('parens');
  if (char === ')') context.decrementDepth('parens');
  if (char === '<') context.incrementDepth('angles');
  if (char === '>') context.decrementDepth('angles');
}

/**
 * Applies context transitions
 * @param {Object} context - Context model
 * @param {Array} transitions - Transitions from handler
 */
export function applyTransitions(context, transitions) {
  for (const transition of transitions) {
    switch (transition.action) {
      case 'PUSH':
        context.enter(transition.context);
        break;
      case 'POP':
        context.exitContext(transition.context);
        break;
      case 'POP_IF_DEPTH':
        // Only exit if at depth 1 (closing main block)
        if (context.getDepth('braces') <= 1) {
          context.exitContext(transition.context);
        }
        break;
    }
  }
}

/**
 * Updates context based on character and lookahead
 * @param {Object} context - Context model
 * @param {string} char - Current character
 * @param {Object} lookahead - Lookahead object
 * @param {Object} handler - Language handler
 */
export function updateContext(context, char, lookahead, handler) {
  // Update bracket depths
  updateBracketDepths(context, char);
  
  // Get transitions from handler
  const transitions = handler.getContextTransitions(char, lookahead, context);
  
  // Apply transitions
  applyTransitions(context, transitions);
}
