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
        // PRIMARY: use AST imports[] captured by the parser (real source paths)
        for (const imp of atom.imports || []) {
          const src = imp.source || '';
          const targetModule = this.inferModuleFromSource(src);
          if (targetModule && targetModule !== this.moduleName) {
            if (!imports.has(targetModule)) imports.set(targetModule, new Set());
            (imp.specifiers || []).forEach(s => {
              const name = s.imported || s.local || s.name || src;
              imports.get(targetModule).add(name);
            });
            // ensure at least one entry even if no named specifiers
            if ((imp.specifiers || []).length === 0) {
              imports.get(targetModule).add(src);
            }
          }
        }

        // FALLBACK: external calls with known prefix patterns
        for (const call of atom.calls || []) {
          if (call.type === 'external') {
            const moduleName = this.inferModuleFromCallName(call.name);
            if (moduleName && moduleName !== this.moduleName && moduleName !== 'external') {
              if (!imports.has(moduleName)) imports.set(moduleName, new Set());
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

  /**
   * Infer module name from an import source path.
   * e.g. '#layer-a/parser/...' → 'layer-a'
   *      'src/core/cache/...'  → 'core'
   *      '../../utils/logger'  → 'utils'
   */
  inferModuleFromSource(source) {
    if (!source) return null;
    // node built-ins and bare npm packages
    if (!source.startsWith('.') && !source.startsWith('#') && !source.startsWith('/')) {
      return source.split('/')[0]; // e.g. 'path', 'fs', 'express'
    }
    // alias imports (#layer-a/..., #layer-c/...)
    const aliasMatch = source.match(/^#([\w-]+)/);
    if (aliasMatch) return aliasMatch[1];
    // relative imports — extract first meaningful segment
    const parts = source.replace(/^[./]+/, '').split('/');
    // skip 'src' prefix, return next segment
    const idx = parts.indexOf('src');
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    return parts[0] || null;
  }

  inferModuleFromCallName(functionName) {
    for (const { prefix, module } of this.patterns) {
      if (prefix.test(functionName)) return module;
    }
    return 'external';
  }
}

export default ImportAnalyzer;
