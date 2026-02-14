/**
 * @fileoverview Export Analyzer
 * 
 * Analiza exports de un módulo.
 * 
 * @module module-analyzer/analyzers/export-analyzer
 * @version 1.0.0
 */

import path from 'path';

export class ExportAnalyzer {
  constructor(molecules) {
    this.molecules = molecules;
  }

  analyze() {
    const exports = [];
    
    for (const mol of this.molecules) {
      for (const atom of mol.atoms || []) {
        if (atom.isExported) {
          exports.push({
            name: atom.name,
            file: path.basename(mol.filePath),
            atomId: atom.id,
            type: this.classifyExport(atom),
            usedBy: atom.calledBy?.length || 0
          });
        }
      }
    }
    
    return exports;
  }

  classifyExport(atom) {
    const name = atom.name.toLowerCase();
    
    if (name.includes('middleware')) return 'middleware';
    if (/^handle|^on[A-Z]|^process/.test(atom.name)) return 'handler';
    if (atom.hasSideEffects) return 'service';
    if (atom.dataFlow?.transformations?.length === 0) return 'utility';
    
    return 'function';
  }
}

export default ExportAnalyzer;
