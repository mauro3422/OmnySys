/**
 * @fileoverview JavaScript Handler - Context Transitions
 * 
 * Transiciones de contexto para JavaScript/TypeScript.
 * 
 * @module preprocessor/handlers/javascript/transitions
 */

import { CONTEXTS } from '../../context-model.js';

/**
 * Determina transiciones de contexto basándose en caracteres/tokens
 * 
 * @param {string} char - Caracter actual
 * @param {Object} lookahead - Información de lookahead
 * @param {ContextModel} context - Modelo de contexto
 * @returns {Array<{action: string, context: string}>} Transiciones a aplicar
 */
export function getContextTransitions(char, lookahead, context) {
  const transitions = [];
  
  // ─── Class body ───────────────────────────────────────────────
  // Entrar a class body cuando encontramos 'class'
  if (lookahead.prevChars?.endsWith('class ')) {
    transitions.push({ action: 'PUSH', context: CONTEXTS.CLASS_BODY });
  }
  
  // Salir de class body al encontrar } que cierra
  if (char === '}' && context.isIn(CONTEXTS.CLASS_BODY)) {
    // Solo salir si la profundidad de braces indica que cerramos la clase
    // Este es un enfoque simplificado; uno más robusto necesitaría
    // trackear el brace de apertura de la clase específicamente
    transitions.push({ action: 'POP_IF_DEPTH', context: CONTEXTS.CLASS_BODY });
  }
  
  // ─── Pipeline expression ───────────────────────────────────────
  // Entrar a pipeline cuando encontramos |>
  if (lookahead.prevChars?.endsWith('|>')) {
    transitions.push({ action: 'PUSH', context: CONTEXTS.PIPELINE_EXPR });
  }
  
  // Salir de pipeline al terminar la expresión
  if (char === ';' || (char === '}' && context.isIn(CONTEXTS.PIPELINE_EXPR))) {
    transitions.push({ action: 'POP', context: CONTEXTS.PIPELINE_EXPR });
  }
  
  // ─── Function/Arrow body ───────────────────────────────────────
  // Trackear funciones para contexto de pipeline arrows
  if (lookahead.prevChars?.match(/=>\s*$/)) {
    transitions.push({ action: 'PUSH', context: CONTEXTS.ARROW_BODY });
  }
  
  if (char === '}' && context.isIn(CONTEXTS.ARROW_BODY)) {
    transitions.push({ action: 'POP', context: CONTEXTS.ARROW_BODY });
  }
  
  // ─── Strings ───────────────────────────────────────────────────
  if (char === '"' || char === "'" || char === '`') {
    // Toggle string context
    if (context.isCurrent(CONTEXTS.STRING)) {
      transitions.push({ action: 'POP', context: CONTEXTS.STRING });
    } else if (!context.isIn(CONTEXTS.STRING)) {
      transitions.push({ action: 'PUSH', context: CONTEXTS.STRING });
    }
  }
  
  // ─── Comments ──────────────────────────────────────────────────
  if (lookahead.nextChars?.startsWith('//')) {
    transitions.push({ action: 'PUSH', context: CONTEXTS.LINE_COMMENT });
  }
  
  if (char === '\n' && context.isIn(CONTEXTS.LINE_COMMENT)) {
    transitions.push({ action: 'POP', context: CONTEXTS.LINE_COMMENT });
  }
  
  if (lookahead.nextChars?.startsWith('/*')) {
    transitions.push({ action: 'PUSH', context: CONTEXTS.BLOCK_COMMENT });
  }
  
  if (lookahead.prevChars?.endsWith('*/')) {
    transitions.push({ action: 'POP', context: CONTEXTS.BLOCK_COMMENT });
  }
  
  return transitions;
}
