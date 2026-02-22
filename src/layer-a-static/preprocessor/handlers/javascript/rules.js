/**
 * @fileoverview JavaScript Handler - Rules
 * 
 * Reglas de clasificación para JavaScript/TypeScript.
 * 
 * @module preprocessor/handlers/javascript/rules
 */

import { ACTIONS, HASH_TYPES } from '../../token-classifier.js';
import { CONTEXTS } from '../../context-model.js';

/**
 * Crea todas las reglas de clasificación para JavaScript
 * @param {string} placeholderPrefix - Prefijo para placeholders
 * @returns {Object[]}
 */
export function createRules(placeholderPrefix) {
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
        placeholder: `${placeholderPrefix}SHEBANG__`,
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
        placeholder: `${placeholderPrefix}PRIVATE_ACCESS_${lookahead.nextIdentifier}__`,
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
        placeholder: `${placeholderPrefix}PRIVATE_${lookahead.nextIdentifier}__`,
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
