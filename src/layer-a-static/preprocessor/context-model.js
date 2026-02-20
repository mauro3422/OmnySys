/**
 * @fileoverview Context Model
 * 
 * Modelo de contexto léxico que trackea el estado del parser
 * en cada posición del código. Permite resolver ambigüedades
 * basándose en el contexto actual.
 * 
 * @module preprocessor/context-model
 */

/**
 * Contextos léxicos posibles
 * Cada contexto representa un "modo" diferente del parser
 */
export const CONTEXTS = Object.freeze({
  // Niveles de scope
  TOP_LEVEL: 'top_level',           // Fuera de todo bloque
  CLASS_BODY: 'class_body',         // Dentro del cuerpo de una clase
  FUNCTION_BODY: 'function_body',   // Dentro del cuerpo de una función
  ARROW_BODY: 'arrow_body',         // Dentro de una arrow function
  BLOCK: 'block',                   // Dentro de un bloque {}
  
  // Expresiones especiales
  PIPELINE_EXPR: 'pipeline_expr',   // En expresión de pipeline (|>)
  TEMPLATE_LITERAL: 'template_lit', // Dentro de template string `...`
  JSX: 'jsx',                       // Dentro de JSX
  
  // Literales
  STRING: 'string',                 // Dentro de string literal
  REGEX: 'regex',                   // Dentro de regex literal
  
  // Comentarios
  LINE_COMMENT: 'line_comment',     // Dentro de comentario //
  BLOCK_COMMENT: 'block_comment',   // Dentro de comentario /* */
  
  // Tipos (TypeScript)
  TYPE_ANNOTATION: 'type_annotation', // En anotación de tipo
  INTERFACE_BODY: 'interface_body',   // Dentro de interface
  TYPE_BODY: 'type_body'              // Dentro de type alias
});

/**
 * ContextModel - Stack de contextos léxicos
 * 
 * Mantiene un stack de contextos que se actualiza conforme
 * se avanza en el código. Permite consultas rápidas sobre
 * el contexto actual.
 * 
 * @example
 * const ctx = new ContextModel();
 * ctx.enter(CONTEXTS.CLASS_BODY);
 * ctx.isIn(CONTEXTS.CLASS_BODY); // true
 * ctx.current(); // 'class_body'
 * ctx.exit();
 * ctx.current(); // 'top_level'
 */
export class ContextModel {
  constructor() {
    /**
     * Stack de contextos actuales
     * @type {string[]}
     * @private
     */
    this._stack = [];
    
    /**
     * Contador de profundidad de llaves
     * @type {Object<string, number>}
     * @private
     */
    this._depth = {
      braces: 0,      // {}
      brackets: 0,    // []
      parens: 0,      // ()
      angles: 0       // <> (JSX o generics)
    };
    
    /**
     * Últimos tokens vistos (para lookahead inverso)
     * @type {Array<{value: string, type: string}>}
     * @private
     */
    this._lastTokens = [];
    
    /**
     * Máximo de tokens a mantener en historial
     * @type {number}
     * @private
     */
    this._maxHistory = 10;
  }
  
  /**
   * Entra a un nuevo contexto
   * @param {string} context - Contexto a entrar (usar CONTEXTS.*)
   * @returns {ContextModel} this (para encadenar)
   */
  enter(context) {
    if (!Object.values(CONTEXTS).includes(context)) {
      throw new Error(`Contexto inválido: ${context}`);
    }
    this._stack.push(context);
    return this;
  }
  
  /**
   * Sale del contexto actual
   * @returns {string|null} Contexto del que se salió, o null si estaba vacío
   */
  exit() {
    return this._stack.pop() || null;
  }
  
  /**
   * Sale de un contexto específico (puede haber contextos intermedios)
   * @param {string} context - Contexto del que salir
   * @returns {boolean} true si se encontró y salió
   */
  exitContext(context) {
    const index = this._stack.lastIndexOf(context);
    if (index !== -1) {
      this._stack.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Obtiene el contexto actual (top del stack)
   * @returns {string} Contexto actual
   */
  current() {
    return this._stack[this._stack.length - 1] || CONTEXTS.TOP_LEVEL;
  }
  
  /**
   * Obtiene todos los contextos activos
   * @returns {string[]} Stack de contextos
   */
  getAll() {
    return [...this._stack];
  }
  
  /**
   * Verifica si está en un contexto específico
   * @param {string} context - Contexto a verificar
   * @returns {boolean}
   */
  isIn(context) {
    return this._stack.includes(context);
  }
  
  /**
   * Verifica si el contexto actual es uno específico
   * @param {string} context - Contexto a verificar
   * @returns {boolean}
   */
  isCurrent(context) {
    return this.current() === context;
  }
  
  /**
   * Verifica si está en alguno de varios contextos
   * @param {string[]} contexts - Contextos a verificar
   * @returns {boolean}
   */
  isInAny(contexts) {
    return contexts.some(ctx => this._stack.includes(ctx));
  }
  
  /**
   * Obtiene la profundidad de un tipo de bracket
   * @param {string} type - 'braces' | 'brackets' | 'parens' | 'angles'
   * @returns {number}
   */
  getDepth(type) {
    return this._depth[type] || 0;
  }
  
  /**
   * Incrementa la profundidad de un bracket
   * @param {string} type - Tipo de bracket
   */
  incrementDepth(type) {
    this._depth[type] = (this._depth[type] || 0) + 1;
  }
  
  /**
   * Decrementa la profundidad de un bracket
   * @param {string} type - Tipo de bracket
   */
  decrementDepth(type) {
    if (this._depth[type] > 0) {
      this._depth[type]--;
    }
  }
  
  /**
   * Registra un token en el historial
   * @param {string} value - Valor del token
   * @param {string} type - Tipo del token
   */
  pushToken(value, type = 'unknown') {
    this._lastTokens.push({ value, type });
    if (this._lastTokens.length > this._maxHistory) {
      this._lastTokens.shift();
    }
  }
  
  /**
   * Obtiene los últimos N tokens
   * @param {number} n - Cantidad de tokens
   * @returns {Array<{value: string, type: string}>}
   */
  getLastTokens(n = 3) {
    return this._lastTokens.slice(-n);
  }
  
  /**
   * Obtiene el último token
   * @returns {{value: string, type: string}|null}
   */
  getLastToken() {
    return this._lastTokens[this._lastTokens.length - 1] || null;
  }
  
  /**
   * Verifica si los últimos tokens coinciden con un patrón
   * @param {string[]} pattern - Patrón de valores a buscar (en orden)
   * @returns {boolean}
   */
  matchPattern(pattern) {
    const lastN = this._lastTokens.slice(-pattern.length);
    if (lastN.length !== pattern.length) return false;
    return pattern.every((p, i) => lastN[i]?.value === p);
  }
  
  /**
   * Resetea el modelo de contexto
   */
  reset() {
    this._stack = [];
    this._depth = { braces: 0, brackets: 0, parens: 0, angles: 0 };
    this._lastTokens = [];
  }
  
  /**
   * Crea un snapshot del estado actual
   * @returns {Object}
   */
  snapshot() {
    return {
      stack: [...this._stack],
      depth: { ...this._depth },
      lastTokens: [...this._lastTokens]
    };
  }
  
  /**
   * Restaura desde un snapshot
   * @param {Object} snap - Snapshot previo
   */
  restore(snap) {
    this._stack = [...snap.stack];
    this._depth = { ...snap.depth };
    this._lastTokens = [...snap.lastTokens];
  }
  
  /**
   * Debug: representa el estado actual como string
   * @returns {string}
   */
  toString() {
    const ctx = this.current();
    const depths = Object.entries(this._depth)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}:${v}`)
      .join(', ');
    const lastTokens = this._lastTokens.slice(-3).map(t => t.value).join(' ← ');
    
    return `Context: ${ctx}${depths ? ` | Depths: ${depths}` : ''}${lastTokens ? ` | Last: ${lastTokens}` : ''}`;
  }
}

export default ContextModel;