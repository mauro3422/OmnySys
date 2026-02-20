/**
 * @fileoverview Preprocessor Engine
 * 
 * Motor principal del sistema de pre-procesamiento que coordina:
 * 1. Detección de features
 * 2. Tracking de contexto
 * 3. Clasificación de tokens
 * 4. Transformación de código
 * 5. Registro de transformaciones para restauración
 * 
 * @module preprocessor/engine
 */

import { ContextModel, CONTEXTS } from './context-model.js';
import { TokenClassifier, ACTIONS } from './token-classifier.js';
import { JavaScriptContextHandler } from './handlers/javascript.js';
import { TypeScriptContextHandler } from './handlers/typescript.js';

/**
 * Handlers disponibles por lenguaje
 */
const LANGUAGE_HANDLERS = {
  javascript: JavaScriptContextHandler,
  typescript: TypeScriptContextHandler,
  js: JavaScriptContextHandler,
  ts: TypeScriptContextHandler
};

/**
 * PreprocessorEngine - Motor de pre-procesamiento
 * 
 * @example
 * const engine = new PreprocessorEngine('javascript');
 * const result = engine.preprocess(code);
 * // result.code - código transformado para Babel
 * // result.transformations - registro de cambios
 */
export class PreprocessorEngine {
  /**
   * @param {string} language - Lenguaje ('javascript', 'typescript')
   * @param {Object} options - Opciones de configuración
   * @param {boolean} options.debug - Activar modo debug
   * @param {number} options.maxBufferSize - Máximo tamaño de buffer para lookahead
   */
  constructor(language = 'javascript', options = {}) {
    this.language = language;
    this.options = {
      debug: false,
      maxBufferSize: 100,
      ...options
    };
    
    // Componentes principales
    this.context = new ContextModel();
    this.handler = this.createHandler(language);
    this.classifier = new TokenClassifier(language, this.context, this.handler.getRules());
    
    // Estado interno
    this.transformations = [];
    this.warnings = [];
  }
  
  /**
   * Crea el handler apropiado para el lenguaje
   * @param {string} language
   * @returns {Object}
   */
  createHandler(language) {
    const HandlerClass = LANGUAGE_HANDLERS[language.toLowerCase()];
    if (!HandlerClass) {
      throw new Error(`Lenguaje no soportado: ${language}. Disponibles: ${Object.keys(LANGUAGE_HANDLERS).join(', ')}`);
    }
    return new HandlerClass();
  }
  
  /**
   * Pre-procesa código para ser parseado por Babel
   * 
   * @param {string} code - Código fuente original
   * @param {Object} options - Opciones de este procesamiento específico
   * @returns {{ code: string, transformations: Array, warnings: Array, features: Array }}
   */
  preprocess(code, options = {}) {
    // Reset state
    this.context.reset();
    this.transformations = [];
    this.warnings = [];
    
    // Detectar features primero (optimización)
    const featureDetection = this.handler.detectFeatures(code);
    
    // Si no hay features problemáticas, retornar código sin cambios
    if (!featureDetection.needsPreprocessing) {
      return {
        code,
        transformations: [],
        warnings: [],
        features: featureDetection.features,
        originalCode: code
      };
    }
    
    // Pre-procesar
    const result = this.processCode(code);
    
    return {
      code: result.code,
      transformations: this.transformations,
      warnings: this.warnings,
      features: featureDetection.features,
      originalCode: code,
      debug: this.options.debug ? result.debug : undefined
    };
  }
  
  /**
   * Procesa el código caracter por caracter
   * @param {string} code
   * @returns {{ code: string, debug?: Array }}
   */
  processCode(code) {
    let output = '';
    let i = 0;
    const debugLog = [];
    
    // Buffer para lookahead (caracteres previos)
    let prevChars = '';
    const maxPrev = this.options.maxBufferSize;
    
    while (i < code.length) {
      const char = code[i];
      const lookahead = this.createLookahead(code, i, prevChars);
      
      // Actualizar contexto antes de clasificar
      this.updateContext(char, lookahead);
      
      // Clasificar el caracter
      const classification = this.classifier.classify(char, i, lookahead);
      
      // Debug logging
      if (this.options.debug) {
        debugLog.push({
          position: i,
          char,
          context: this.context.current(),
          classification
        });
      }
      
      // Aplicar acción según clasificación
      switch (classification.action) {
        case ACTIONS.KEEP:
          output += char;
          i++;
          break;
          
        case ACTIONS.REPLACE:
          if (classification.transform) {
            const { placeholder, original, skipChars } = classification.transform;
            
            // Registrar transformación
            this.transformations.push({
              position: output.length,
              original,
              placeholder,
              type: classification.type,
              rule: classification.rule,
              // Guardar posición en código original para debugging
              originalPosition: i
            });
            
            output += placeholder;
            i += skipChars || original.length;
          } else {
            // Fallback: mantener si no hay transform
            output += char;
            i++;
          }
          break;
          
        case ACTIONS.SKIP:
          i++;
          break;
          
        case ACTIONS.ERROR:
          this.warnings.push({
            position: i,
            char,
            message: `Token no esperado: ${char}`,
            context: this.context.current()
          });
          output += char;
          i++;
          break;
          
        default:
          output += char;
          i++;
      }
      
      // Actualizar buffer de caracteres previos
      prevChars = (prevChars + char).slice(-maxPrev);
      
      // Trackear tokens para contexto
      this.trackToken(char, lookahead);
    }
    
    return { code: output, debug: debugLog };
  }
  
  /**
   * Crea objeto de lookahead para una posición
   * @param {string} code
   * @param {number} position
   * @param {string} prevChars
   * @returns {Object}
   */
  createLookahead(code, position, prevChars) {
    const nextChar = code[position + 1];
    const nextChars = code.slice(position + 1, position + 10);
    const prevChar = prevChars[prevChars.length - 1];
    
    // Detectar identifier siguiente
    const identifierMatch = code.slice(position + 1).match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
    const nextIdentifier = identifierMatch ? identifierMatch[0] : null;
    
    return {
      nextChar,
      nextChars,
      prevChar,
      prevChars,
      nextIdentifier,
      // Helpers adicionales
      isEndOfLine: nextChar === '\n' || nextChar === '\r',
      isWhitespace: /\s/.test(nextChar),
      isIdentifierStart: /[a-zA-Z_$]/.test(nextChar),
      isDigit: /[0-9]/.test(nextChar)
    };
  }
  
  /**
   * Actualiza el contexto basándose en el caracter actual
   * @param {string} char
   * @param {Object} lookahead
   */
  updateContext(char, lookahead) {
    // Actualizar profundidad de brackets
    if (char === '{') this.context.incrementDepth('braces');
    if (char === '}') this.context.decrementDepth('braces');
    if (char === '[') this.context.incrementDepth('brackets');
    if (char === ']') this.context.decrementDepth('brackets');
    if (char === '(') this.context.incrementDepth('parens');
    if (char === ')') this.context.decrementDepth('parens');
    if (char === '<') this.context.incrementDepth('angles');
    if (char === '>') this.context.decrementDepth('angles');
    
    // Obtener transiciones del handler
    const transitions = this.handler.getContextTransitions(char, lookahead, this.context);
    
    // Aplicar transiciones
    for (const transition of transitions) {
      switch (transition.action) {
        case 'PUSH':
          this.context.enter(transition.context);
          break;
        case 'POP':
          this.context.exitContext(transition.context);
          break;
        case 'POP_IF_DEPTH':
          // Solo salir si estamos a profundidad 1 (cerrando el bloque principal)
          if (this.context.getDepth('braces') <= 1) {
            this.context.exitContext(transition.context);
          }
          break;
      }
    }
  }
  
  /**
   * Trackea tokens para contexto futuro
   * @param {string} char
   * @param {Object} lookahead
   */
  trackToken(char, lookahead) {
    // Detectar tokens significativos para el contexto
    
    // Operators
    if (char === '|' && lookahead.nextChar === '>') {
      this.context.pushToken('|>', 'operator');
    }
    
    // Brackets
    if ('{}[]()'.includes(char)) {
      this.context.pushToken(char, 'bracket');
    }
    
    // Keywords básicas
    if (lookahead.prevChars?.endsWith('class ')) {
      this.context.pushToken('class', 'keyword');
    }
    
    // Punctuation
    if ('.;,'.includes(char)) {
      this.context.pushToken(char, 'punctuation');
    }
    
    // Identifiers (simplified)
    if (/[a-zA-Z_$]/.test(char)) {
      // Buscar identifier completo
      // Por ahora solo trackeamos el char
    }
  }
  
  /**
   * Detecta si el código necesita preprocesamiento
   * @param {string} code
   * @returns {boolean}
   */
  needsPreprocessing(code) {
    return this.handler.detectFeatures(code).needsPreprocessing;
  }
  
  /**
   * Obtiene información de features detectados
   * @param {string} code
   * @returns {Object}
   */
  getFeatures(code) {
    return this.handler.detectFeatures(code);
  }
  
  /**
   * Valida que las transformaciones son reversibles
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateTransformations() {
    const errors = [];
    
    for (let i = 0; i < this.transformations.length; i++) {
      const t = this.transformations[i];
      
      if (!t.placeholder) {
        errors.push(`Transformación ${i}: falta placeholder`);
      }
      
      if (!t.original) {
        errors.push(`Transformación ${i}: falta original`);
      }
      
      // Verificar que el placeholder es único
      const duplicates = this.transformations.filter(t2 => t2.placeholder === t.placeholder);
      if (duplicates.length > 1) {
        errors.push(`Transformación ${i}: placeholder duplicado "${t.placeholder}"`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Crea un snapshot del estado actual del preprocesador
   * @returns {Object}
   */
  snapshot() {
    return {
      context: this.context.snapshot(),
      transformations: [...this.transformations],
      warnings: [...this.warnings]
    };
  }
}

export default PreprocessorEngine;