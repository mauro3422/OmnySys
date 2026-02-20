/**
 * @fileoverview Token Classifier
 * 
 * Clasificador de tokens ambigüos basándose en reglas
 * y el contexto actual del parser.
 * 
 * @module preprocessor/token-classifier
 */

import { CONTEXTS } from './context-model.js';

/**
 * Resultado de clasificación de un token
 * @typedef {Object} ClassificationResult
 * @property {boolean} matched - Si la regla coincidió
 * @property {string} [type] - Tipo de token clasificado
 * @property {string} [action] - Acción a tomar: 'KEEP' | 'REPLACE' | 'SKIP'
 * @property {Object} [transform] - Información de transformación
 * @property {string} transform.placeholder - Placeholder a usar
 * @property {string} transform.original - Valor original
 */

/**
 * Regla de clasificación
 * @typedef {Object} ClassificationRule
 * @property {string} name - Nombre descriptivo de la regla
 * @property {string} token - Token que dispara la regla (ej: '#')
 * @property {Function} match - Función que determina si la regla aplica
 * @property {string} type - Tipo de token si coincide
 * @property {string} action - Acción a tomar
 * @property {Function} [getTransform] - Función que genera la transformación
 */

/**
 * Acciones posibles para un token
 */
export const ACTIONS = Object.freeze({
  KEEP: 'KEEP',           // Mantener el token como está
  REPLACE: 'REPLACE',     // Reemplazar con placeholder
  SKIP: 'SKIP',           // Saltar el token (no incluir en output)
  ERROR: 'ERROR'          // Reportar error
});

/**
 * Tipos de token para #
 */
export const HASH_TYPES = Object.freeze({
  SHEBANG: 'SHEBANG',
  PRIVATE_FIELD: 'PRIVATE_FIELD',
  PRIVATE_FIELD_ACCESS: 'PRIVATE_FIELD_ACCESS',
  PIPELINE_TOPIC: 'PIPELINE_TOPIC',
  UNKNOWN: 'UNKNOWN'
});

/**
 * TokenClassifier - Clasifica tokens basándose en reglas y contexto
 * 
 * @example
 * const classifier = new TokenClassifier('javascript', contextModel);
 * const result = classifier.classify('#', 0, lookahead);
 * if (result.action === ACTIONS.REPLACE) {
 *   output += result.transform.placeholder;
 * }
 */
export class TokenClassifier {
  /**
   * @param {string} language - Lenguaje ('javascript', 'typescript', etc.)
   * @param {ContextModel} contextModel - Modelo de contexto
   * @param {ClassificationRule[]} [rules] - Reglas personalizadas
   */
  constructor(language, contextModel, rules = null) {
    this.language = language;
    this.context = contextModel;
    this.rules = rules || this.getDefaultRules();
  }
  
  /**
   * Obtiene las reglas por defecto para el lenguaje actual
   * @returns {ClassificationRule[]}
   */
  getDefaultRules() {
    // Las reglas se inyectan desde el handler del lenguaje
    // Esto permite extender a otros lenguajes fácilmente
    return [];
  }
  
  /**
   * Añade una regla de clasificación
   * @param {ClassificationRule} rule - Regla a añadir
   */
  addRule(rule) {
    this.rules.push(rule);
  }
  
  /**
   * Añade múltiples reglas
   * @param {ClassificationRule[]} rules - Reglas a añadir
   */
  addRules(rules) {
    this.rules.push(...rules);
  }
  
  /**
   * Clasifica un token basándose en todas las reglas
   * 
   * @param {string} token - Token a clasificar
   * @param {number} position - Posición en el código
   * @param {Object} lookahead - Información de contexto local
   * @returns {{ type: string, action: string, transform: Object|null, rule: string|null }}
   */
  classify(token, position, lookahead) {
    // Probar cada regla en orden (la primera que matchea gana)
    for (const rule of this.rules) {
      // Skip reglas que no aplican a este token
      if (rule.token && rule.token !== token) {
        continue;
      }
      
      const result = rule.match(token, position, lookahead, this.context);
      
      if (result.matched) {
        const classification = {
          type: result.type || rule.type,
          action: result.action || rule.action,
          transform: null,
          rule: rule.name
        };
        
        // Si hay transformación, calcularla
        if (classification.action === ACTIONS.REPLACE) {
          if (result.transform) {
            classification.transform = result.transform;
          } else if (rule.getTransform) {
            classification.transform = rule.getTransform(token, position, lookahead);
          }
        }
        
        return classification;
      }
    }
    
    // Sin regla que coincida - token normal
    return {
      type: 'LITERAL',
      action: ACTIONS.KEEP,
      transform: null,
      rule: null
    };
  }
  
  /**
   * Clasifica y devuelve información detallada para debugging
   * @param {string} token - Token a clasificar
   * @param {number} position - Posición
   * @param {Object} lookahead - Lookahead
   * @returns {Object} Clasificación con metadata de debug
   */
  classifyWithDebug(token, position, lookahead) {
    const classification = this.classify(token, position, lookahead);
    
    return {
      ...classification,
      debug: {
        token,
        position,
        currentContext: this.context.current(),
        allContexts: this.context.getAll(),
        lastTokens: this.context.getLastTokens(5),
        matchedRule: classification.rule
      }
    };
  }
  
  /**
   * Valida que las reglas estén bien formadas
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateRules() {
    const errors = [];
    
    for (let i = 0; i < this.rules.length; i++) {
      const rule = this.rules[i];
      
      if (!rule.name) {
        errors.push(`Regla ${i}: falta 'name'`);
      }
      
      if (!rule.match || typeof rule.match !== 'function') {
        errors.push(`Regla ${i} (${rule.name}): falta 'match' function`);
      }
      
      if (!rule.type && rule.action !== ACTIONS.SKIP) {
        errors.push(`Regla ${i} (${rule.name}): falta 'type'`);
      }
      
      if (!rule.action) {
        errors.push(`Regla ${i} (${rule.name}): falta 'action'`);
      }
      
      if (rule.action === ACTIONS.REPLACE && !rule.getTransform) {
        errors.push(`Regla ${i} (${rule.name}): acción REPLACE requiere 'getTransform'`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Factory para crear reglas de clasificación
 */
export class RuleBuilder {
  constructor() {
    this.rule = {
      name: '',
      token: null,
      type: '',
      action: ACTIONS.KEEP,
      match: null,
      getTransform: null
    };
  }
  
  /**
   * @param {string} name - Nombre de la regla
   * @returns {RuleBuilder}
   */
  named(name) {
    this.rule.name = name;
    return this;
  }
  
  /**
   * @param {string} token - Token que dispara la regla
   * @returns {RuleBuilder}
   */
  forToken(token) {
    this.rule.token = token;
    return this;
  }
  
  /**
   * @param {string} type - Tipo de token
   * @returns {RuleBuilder}
   */
  withType(type) {
    this.rule.type = type;
    return this;
  }
  
  /**
   * @param {string} action - Acción a tomar
   * @returns {RuleBuilder}
   */
  withAction(action) {
    this.rule.action = action;
    return this;
  }
  
  /**
   * @param {Function} matchFn - Función de matching
   * @returns {RuleBuilder}
   */
  matchWhen(matchFn) {
    this.rule.match = matchFn;
    return this;
  }
  
  /**
   * @param {Function} transformFn - Función que genera transformación
   * @returns {RuleBuilder}
   */
  transformWith(transformFn) {
    this.rule.getTransform = transformFn;
    return this;
  }
  
  /**
   * @returns {ClassificationRule}
   */
  build() {
    if (!this.rule.name) {
      throw new Error('Rule requires a name');
    }
    if (!this.rule.match) {
      throw new Error('Rule requires a match function');
    }
    return { ...this.rule };
  }
}

export default TokenClassifier;