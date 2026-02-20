/**
 * @fileoverview JavaScript Context Handler
 * 
 * Maneja las ambigüedades léxicas específicas de JavaScript/TypeScript:
 * - # como shebang (#!/usr/bin/env node)
 * - # como private field (#field)
 * - # como pipeline topic token (|> f(#))
 * 
 * También maneja otras ambigüedades de JS:
 * - / como división o regex
 * - < como comparación o inicio de JSX
 * 
 * @module preprocessor/handlers/javascript
 */

import { CONTEXTS } from '../context-model.js';
import { ACTIONS, HASH_TYPES } from '../token-classifier.js';

/**
 * JavaScriptContextHandler - Reglas de clasificación para JavaScript
 */
export class JavaScriptContextHandler {
  constructor() {
    /**
     * Placeholder prefix para transformaciones
     * @type {string}
     */
    this.placeholderPrefix = '__OMNY_';
    
    /**
     * Reglas de clasificación para JavaScript
     * @type {Object[]}
     */
    this.rules = this.createRules();
  }
  
  /**
   * Crea todas las reglas de clasificación para JavaScript
   * @returns {Object[]}
   */
  createRules() {
    return [
      // ═══════════════════════════════════════════════════════════════
      // REGLA 1: SHEBANG
      // #! al inicio del archivo = shebang
      // ═══════════════════════════════════════════════════════════════
      {
        name: 'shebang',
        token: '#',
        type: HASH_TYPES.SHEBANG,
        action: ACTIONS.REPLACE,
        
        match: (token, position, lookahead, context) => {
          // Shebang solo puede estar en posición 0
          if (position !== 0) {
            return { matched: false };
          }
          
          // El siguiente caracter debe ser !
          if (lookahead.nextChar !== '!') {
            return { matched: false };
          }
          
          return { matched: true };
        },
        
        getTransform: (token, position, lookahead) => ({
          placeholder: `${this.placeholderPrefix}SHEBANG__`,
          original: '#!',
          skipChars: 2  // Saltar #! completo
        })
      },
      
      // ═══════════════════════════════════════════════════════════════
      // REGLA 2: PRIVATE FIELD ACCESS (obj.#field)
      // # precedido por . = acceso a private field
      // ═══════════════════════════════════════════════════════════════
      {
        name: 'private_field_access',
        token: '#',
        type: HASH_TYPES.PRIVATE_FIELD_ACCESS,
        action: ACTIONS.REPLACE,
        
        match: (token, position, lookahead, context) => {
          // Debe estar precedido por .
          if (lookahead.prevChar !== '.') {
            return { matched: false };
          }
          
          // Debe seguir un identifier
          if (!lookahead.nextIdentifier) {
            return { matched: false };
          }
          
          return { matched: true };
        },
        
        getTransform: (token, position, lookahead) => ({
          placeholder: `${this.placeholderPrefix}PRIVATE_ACCESS_${lookahead.nextIdentifier}__`,
          original: `#${lookahead.nextIdentifier}`,
          skipChars: 1 + lookahead.nextIdentifier.length
        })
      },
      
      // ═══════════════════════════════════════════════════════════════
      // REGLA 3: PRIVATE FIELD DECLARATION
      // # dentro de class body = private field
      // ═══════════════════════════════════════════════════════════════
      {
        name: 'private_field_declaration',
        token: '#',
        type: HASH_TYPES.PRIVATE_FIELD,
        action: ACTIONS.REPLACE,
        
        match: (token, position, lookahead, context) => {
          // Debe estar dentro de class body
          if (!context.isIn(CONTEXTS.CLASS_BODY)) {
            return { matched: false };
          }
          
          // Debe seguir un identifier
          if (!lookahead.nextIdentifier) {
            return { matched: false };
          }
          
          // No debe estar precedido por . (eso es private_field_access)
          if (lookahead.prevChar === '.') {
            return { matched: false };
          }
          
          return { matched: true };
        },
        
        getTransform: (token, position, lookahead) => ({
          placeholder: `${this.placeholderPrefix}PRIVATE_${lookahead.nextIdentifier}__`,
          original: `#${lookahead.nextIdentifier}`,
          skipChars: 1 + lookahead.nextIdentifier.length
        })
      },
      
      // ═══════════════════════════════════════════════════════════════
      // REGLA 4: PIPELINE TOPIC TOKEN
      // # en contexto de pipeline = topic token
      // ═══════════════════════════════════════════════════════════════
      {
        name: 'pipeline_topic',
        token: '#',
        type: HASH_TYPES.PIPELINE_TOPIC,
        action: ACTIONS.KEEP,  // Babel lo procesa
        
        match: (token, position, lookahead, context) => {
          // Debe estar en contexto pipeline
          const inPipeline = context.isIn(CONTEXTS.PIPELINE_EXPR);
          
          // O debe estar precedido por |> (con posible whitespace)
          const lastTokens = context.getLastTokens(3);
          const hasPipelineOp = lastTokens.some(t => t.value === '|>');
          
          // O está seguido por ) o , (fin de argumento en pipeline)
          const followedByEnd = lookahead.nextChar === ')' || lookahead.nextChar === ',';
          
          if (inPipeline || hasPipelineOp || followedByEnd) {
            return { matched: true };
          }
          
          // También puede ser: f(#) donde # es topic en arrow implícita
          // Patrón: después de ( y antes de )
          const lastToken = context.getLastToken();
          if (lastToken?.value === '(' || lastToken?.value === ',') {
            // Verificar si estamos en contexto que podría ser pipeline
            const ctxs = context.getAll();
            if (ctxs.some(c => c === CONTEXTS.ARROW_BODY || c === CONTEXTS.FUNCTION_BODY)) {
              return { matched: true };
            }
          }
          
          return { matched: false };
        },
        
        getTransform: null  // KEEP action no necesita transform
      }
    ];
  }
  
  /**
   * Obtiene las reglas de clasificación
   * @returns {Object[]}
   */
  getRules() {
    return this.rules;
  }
  
  /**
   * Determina transiciones de contexto basándose en caracteres/tokens
   * 
   * @param {string} char - Caracter actual
   * @param {Object} lookahead - Información de lookahead
   * @param {ContextModel} context - Modelo de contexto
   * @returns {Array<{action: string, context: string}>} Transiciones a aplicar
   */
  getContextTransitions(char, lookahead, context) {
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
  
  /**
   * Detecta si el código contiene features que requieren preprocesamiento
   * 
   * @param {string} code - Código a analizar
   * @returns {{ needsPreprocessing: boolean, features: string[] }}
   */
  detectFeatures(code) {
    const features = [];
    
    // Detectar shebang
    if (code.startsWith('#!')) {
      features.push('shebang');
    }
    
    // Detectar private fields
    if (/#[a-zA-Z_$]/.test(code) && /class\s/.test(code)) {
      features.push('private_fields');
    }
    
    // Detectar pipeline operator
    if (/\|>/.test(code)) {
      features.push('pipeline_operator');
    }
    
    // Detectar JSX
    if (/<[A-Z][a-zA-Z]*[^>]*>/.test(code) || /<\/[A-Z][a-zA-Z]*>/.test(code)) {
      features.push('jsx');
    }
    
    return {
      needsPreprocessing: features.length > 0,
      features
    };
  }
}

export default JavaScriptContextHandler;