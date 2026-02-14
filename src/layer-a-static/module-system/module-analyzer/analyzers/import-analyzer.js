/**
 * @fileoverview Import Analyzer
 * 
 * Analiza dependencias externas del módulo.
 * 
 * @module module-analyzer/analyzers/import-analyzer
 * @version 1.0.0
 */

export class ImportAnalyzer {
  constructor(molecules, moduleName) {
    this.molecules = molecules;
    this.moduleName = moduleName;
    this.patterns = [
      { prefix: /^db\./, module: 'database' },
      { prefix: /^redis\./, module: 'redis' },
      { prefix: /^cache\./, module: 'cache' },
      { prefix: /^logger\./, module: 'logger' },
      { prefix: /^config\./, module: 'config' }
    ];
  }

  analyze() {
    const imports = new Map();
    
    for (const mol of this.molecules) {
      for (const atom of mol.atoms || []) {
        for (const call of atom.calls || []) {
          if (call.type === 'external') {
            const moduleName = this.inferModule(call.name);
            
            if (moduleName && moduleName !== this.moduleName) {
              if (!imports.has(moduleName)) {
                imports.set(moduleName, new Set());
              }
              imports.get(moduleName).add(call.name);
            }
          }
        }
      }
    }
    
    return Array.from(imports.entries()).map(([module, functions]) => ({
      module,
      functions: Array.from(functions),
      count: functions.size
    }));
  }

  inferModule(functionName) {
    for (const { prefix, module } of this.patterns) {
      if (prefix.test(functionName)) return module;
    }
    return 'external';
  }
}

export default ImportAnalyzer;
