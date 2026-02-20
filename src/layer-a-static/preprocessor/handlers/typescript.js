/**
 * @fileoverview TypeScript Context Handler
 * 
 * Extiende JavaScriptContextHandler con soporte para features
 * específicos de TypeScript:
 * - Type annotations
 * - Interface declarations
 * - Type aliases
 * - Enums
 * - Namespaces
 * 
 * @module preprocessor/handlers/typescript
 */

import { JavaScriptContextHandler } from './javascript.js';
import { CONTEXTS } from '../context-model.js';

/**
 * TypeScriptContextHandler - Reglas de clasificación para TypeScript
 * 
 * Extiende el handler de JavaScript añadiendo contextos específicos
 * de TypeScript para mejor detección de ambigüedades.
 */
export class TypeScriptContextHandler extends JavaScriptContextHandler {
  constructor() {
    super();
    
    // Añadir reglas específicas de TypeScript
    this.rules = [...this.rules, ...this.createTypeScriptRules()];
  }
  
  /**
   * Crea reglas específicas para TypeScript
   * @returns {Object[]}
   */
  createTypeScriptRules() {
    return [
      // ─────────────────────────────────────────────────────────────
      // El # en TypeScript tiene el mismo comportamiento que en JS
      // pero hay contextos adicionales donde puede aparecer
      // ─────────────────────────────────────────────────────────────
      
      // Private field en type annotation
      // class A { #field: string; } - ya cubierto por JavaScript handler
      
      // El readonly, private, protected keywords no afectan #
      // porque # es runtime private, private es compile-time
    ];
  }
  
  /**
   * Override: determina transiciones de contexto incluyendo TypeScript
   */
  getContextTransitions(char, lookahead, context) {
    const transitions = super.getContextTransitions(char, lookahead, context);
    
    // ─── Type Annotations ───────────────────────────────────────
    // Entrar a type annotation cuando encontramos :
    // Pero solo si no estamos ya en un string o comentario
    if (char === ':' && !context.isInAny([CONTEXTS.STRING, CONTEXTS.LINE_COMMENT, CONTEXTS.BLOCK_COMMENT])) {
      // Verificar si es type annotation (después de identifier o )
      const lastToken = context.getLastToken();
      if (lastToken?.type === 'identifier' || lastToken?.value === ')') {
        transitions.push({ action: 'PUSH', context: CONTEXTS.TYPE_ANNOTATION });
      }
    }
    
    // Salir de type annotation al encontrar ; o ,
    if ((char === ';' || char === ',' || char === '=' || char === ')') && 
        context.isIn(CONTEXTS.TYPE_ANNOTATION)) {
      transitions.push({ action: 'POP', context: CONTEXTS.TYPE_ANNOTATION });
    }
    
    // ─── Interface Body ──────────────────────────────────────────
    // Entrar a interface body
    if (lookahead.prevChars?.match(/interface\s+\w+\s*\{$/)) {
      transitions.push({ action: 'PUSH', context: CONTEXTS.INTERFACE_BODY });
    }
    
    // Salir de interface body
    if (char === '}' && context.isIn(CONTEXTS.INTERFACE_BODY)) {
      transitions.push({ action: 'POP', context: CONTEXTS.INTERFACE_BODY });
    }
    
    // ─── Type Body ───────────────────────────────────────────────
    // Entrar a type body (type X = { ... })
    if (lookahead.prevChars?.match(/type\s+\w+\s*=\s*\{$/)) {
      transitions.push({ action: 'PUSH', context: CONTEXTS.TYPE_BODY });
    }
    
    // Salir de type body
    if (char === '}' && context.isIn(CONTEXTS.TYPE_BODY)) {
      transitions.push({ action: 'POP', context: CONTEXTS.TYPE_BODY });
    }
    
    return transitions;
  }
  
  /**
   * Override: detecta features TypeScript adicionales
   */
  detectFeatures(code) {
    const result = super.detectFeatures(code);
    
    // Detectar TypeScript específico
    if (/\binterface\s+\w+/.test(code)) {
      result.features.push('interface');
    }
    
    if (/\btype\s+\w+\s*=/.test(code)) {
      result.features.push('type_alias');
    }
    
    if (/\benum\s+\w+/.test(code)) {
      result.features.push('enum');
    }
    
    if (/\bnamespace\s+\w+/.test(code)) {
      result.features.push('namespace');
    }
    
    if (/:\s*(string|number|boolean|any|void|never|object)\b/.test(code)) {
      result.features.push('type_annotations');
    }
    
    result.needsPreprocessing = result.features.length > 0;
    
    return result;
  }
}

export default TypeScriptContextHandler;