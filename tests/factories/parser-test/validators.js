/**
 * @fileoverview Parser Test Factory - Validators
 */

export class ParserValidator {
  static isValidFileInfo(result) {
    return result !== null && 
           typeof result === 'object' &&
           typeof result.filePath === 'string' &&
           typeof result.fileName === 'string' &&
           Array.isArray(result.imports) &&
           Array.isArray(result.exports) &&
           Array.isArray(result.definitions);
  }

  static hasRequiredArrays(result) {
    const required = ['imports', 'exports', 'definitions', 'calls', 'functions'];
    return required.every(field => Array.isArray(result[field]));
  }

  static isValidImport(imp) {
    return imp && 
           typeof imp.source === 'string' &&
           typeof imp.type === 'string';
  }

  static isValidExport(exp) {
    return exp && 
           typeof exp.type === 'string';
  }

  static isValidFunction(func) {
    return func && 
           typeof func.name === 'string' &&
           typeof func.type === 'string';
  }

  static isValidClass(cls) {
    return cls && 
           typeof cls.name === 'string' &&
           cls.type === 'class';
  }
}

// Common test data constants

