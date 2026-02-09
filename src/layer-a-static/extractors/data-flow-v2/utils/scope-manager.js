/**
 * @fileoverview Scope Manager - Gestiona scopes y variables
 * 
 * Mantiene track de:
 * - Parámetros de función
 * - Variables locales declaradas
 * - Referencias entre variables
 * - Estado async
 * 
 * @module data-flow-v2/utils/scope-manager
 */

export class ScopeManager {
  constructor() {
    this.scopes = []; // Stack de scopes
    this.currentScope = null;
    this.functionInfo = {
      name: null,
      isAsync: false,
      hasBranches: false,
      hasLoops: false
    };
  }

  /**
   * Inicializa un nuevo scope de función
   */
  initializeFunction(name, isAsync = false) {
    this.functionInfo = {
      name,
      isAsync,
      hasBranches: false,
      hasLoops: false
    };
    
    this.pushScope('function');
  }

  /**
   * Agrega un nuevo scope al stack
   */
  pushScope(type = 'block') {
    const scope = {
      type,
      variables: new Map(),
      parent: this.currentScope
    };
    
    this.scopes.push(scope);
    this.currentScope = scope;
    
    return scope;
  }

  /**
   * Sale del scope actual
   */
  popScope() {
    if (this.scopes.length > 1) {
      this.scopes.pop();
      this.currentScope = this.scopes[this.scopes.length - 1];
    }
  }

  /**
   * Registra un parámetro de función
   */
  registerParam(name, metadata = {}) {
    if (!this.currentScope) return;
    
    this.currentScope.variables.set(name, {
      type: 'param',
      ...metadata,
      declaredAt: metadata.line || 0
    });
  }

  /**
   * Registra una variable local
   */
  registerVariable(name, metadata = {}) {
    if (!this.currentScope) return;
    
    this.currentScope.variables.set(name, {
      type: 'local',
      ...metadata,
      declaredAt: metadata.line || 0
    });
  }

  /**
   * Busca información de una variable
   */
  lookupVariable(name) {
    let scope = this.currentScope;
    
    while (scope) {
      if (scope.variables.has(name)) {
        return scope.variables.get(name);
      }
      scope = scope.parent;
    }
    
    return null;
  }

  /**
   * Verifica si un nombre es un parámetro
   */
  isParam(name) {
    const info = this.lookupVariable(name);
    return info?.type === 'param';
  }

  /**
   * Verifica si un nombre es una variable conocida
   */
  isKnown(name) {
    return this.lookupVariable(name) !== null;
  }

  /**
   * Obtiene todos los parámetros de la función
   */
  getParams() {
    // Buscar en el scope de función (el más externo)
    const functionScope = this.scopes[0];
    if (!functionScope) return [];
    
    return Array.from(functionScope.variables.entries())
      .filter(([_, info]) => info.type === 'param')
      .map(([name, info]) => ({ name, ...info }));
  }

  /**
   * Obtiene todas las variables locales
   */
  getVariables() {
    const all = new Map();
    
    for (const scope of this.scopes) {
      for (const [name, info] of scope.variables) {
        if (!all.has(name)) {
          all.set(name, { ...info, scope: scope.type });
        }
      }
    }
    
    return Array.from(all.entries()).map(([name, info]) => ({
      name,
      ...info
    }));
  }

  /**
   * Marca la función como async
   */
  setAsync(isAsync) {
    this.functionInfo.isAsync = isAsync;
  }

  /**
   * Consulta si estamos en contexto async
   */
  get isAsync() {
    return this.functionInfo.isAsync;
  }

  /**
   * Marca que la función tiene branches (if/else)
   */
  setHasBranches(hasBranches) {
    this.functionInfo.hasBranches = hasBranches;
  }

  /**
   * Marca que la función tiene loops
   */
  setHasLoops(hasLoops) {
    this.functionInfo.hasLoops = hasLoops;
  }

  /**
   * Obtiene información de la función
   */
  getFunctionInfo() {
    return { ...this.functionInfo };
  }

  /**
   * Debug: imprime el estado actual
   */
  debug() {
    return {
      function: this.functionInfo,
      scopes: this.scopes.map(s => ({
        type: s.type,
        variables: Array.from(s.variables.keys())
      }))
    };
  }
}

export default ScopeManager;
