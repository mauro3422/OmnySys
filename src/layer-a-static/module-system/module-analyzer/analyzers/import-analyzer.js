/**
 * @fileoverview Import Analyzer
 *
 * Analiza dependencias externas del modulo.
 *
 * @module module-analyzer/analyzers/import-analyzer
 * @version 1.0.0
 */

import {
  collectModuleImports,
  createImportPatterns,
  inferModuleFromCallName,
  inferModuleFromSource
} from './import-analyzer/helpers.js';

export class ImportAnalyzer {
  constructor(molecules, moduleName) {
    this.molecules = molecules;
    this.moduleName = moduleName;
    this.patterns = createImportPatterns();
  }

  analyze() {
    return collectModuleImports(this.molecules, this.moduleName, this.patterns);
  }

  inferModuleFromSource(source) {
    return inferModuleFromSource(source);
  }

  inferModuleFromCallName(functionName) {
    return inferModuleFromCallName(functionName, this.patterns);
  }
}

export default ImportAnalyzer;
