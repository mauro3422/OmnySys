/**
 * @fileoverview Scope Tracker - Rastrea variables y su contexto
 * 
 * Mantiene el estado de:
 * - Parámetros de la función
 * - Variables locales declaradas
 * - Usos de cada variable (property access, paso a funciones, etc.)
 * 
 * @module data-flow/utils/scope-tracker
 */

export class ScopeTracker {
  constructor() {
    this.functionName = null;
    this.filePath = null;
    this.params = new Map();      // paramName -> ParamInfo
    this.variables = new Map();   // varName -> VarInfo
    this.usages = new Map();      // varName -> Array of usages
  }
  
  setFunctionInfo(name, filePath) {
    this.functionName = name;
    this.filePath = filePath;
  }
  
  /**
   * Registra un parámetro de la función
   */
  registerParam(paramInfo) {
    const { name, position, ...rest } = paramInfo;
    
    this.params.set(name, {
      name,
      position,
      isParam: true,
      ...rest
    });
    
    // Inicializar lista de usos
    this.usages.set(name, []);
  }
  
  /**
   * Registra una variable local
   */
  registerVariable(name, declaration) {
    this.variables.set(name, {
      name,
      isLocal: true,
      declaration,
      declaredAt: declaration?.line || 0
    });
    
    this.usages.set(name, []);
  }
  
  /**
   * Agrega un uso de una variable
   */
  addUsage(usage) {
    const { target, ...usageInfo } = usage;
    
    if (!this.usages.has(target)) {
      this.usages.set(target, []);
    }
    
    this.usages.get(target).push({
      target,
      ...usageInfo,
      timestamp: Date.now()
    });
  }
  
  /**
   * Verifica si un nombre es un parámetro
   */
  isParam(name) {
    return this.params.has(name);
  }
  
  /**
   * Verifica si un nombre es una variable conocida
   */
  isKnown(name) {
    return this.params.has(name) || this.variables.has(name);
  }
  
  /**
   * Obtiene todos los usos de una variable
   */
  getUsagesFor(name) {
    return this.usages.get(name) || [];
  }
  
  /**
   * Obtiene todos los parámetros
   */
  getParams() {
    return Array.from(this.params.values());
  }
  
  /**
   * Obtiene todas las variables locales
   */
  getVariables() {
    return Array.from(this.variables.values());
  }
  
  /**
   * Debug: imprime el estado actual
   */
  debug() {
    return {
      function: this.functionName,
      file: this.filePath,
      params: this.getParams(),
      variables: this.getVariables(),
      usages: Object.fromEntries(this.usages)
    };
  }
}
