/**
 * @fileoverview ModuleAnalyzer Class
 * 
 * Clase principal orquestadora.
 * 
 * @module module-analyzer/ModuleAnalyzer
 * @version 2.0.0
 */

import path from 'path';
import { ConnectionAnalyzer } from './analyzers/connection-analyzer.js';
import { ExportAnalyzer } from './analyzers/export-analyzer.js';
import { ImportAnalyzer } from './analyzers/import-analyzer.js';
import { MetricsCalculator } from './metrics/metrics-calculator.js';
import { ChainBuilder } from './chains/chain-builder.js';

export class ModuleAnalyzer {
  constructor(modulePath, molecules) {
    this.modulePath = modulePath;
    this.moduleName = path.basename(modulePath);
    this.molecules = molecules.filter(m =>
      m.filePath.startsWith(modulePath) ||
      m.filePath.includes(`/${this.moduleName}/`)
    );
  }

  analyze() {
    // Análisis paralelo independiente
    const connections = new ConnectionAnalyzer(this.molecules).analyze();
    const exports = new ExportAnalyzer(this.molecules).analyze();
    const imports = new ImportAnalyzer(this.molecules, this.moduleName).analyze();
    const metrics = new MetricsCalculator(this.molecules).calculate();
    const chains = new ChainBuilder(this.molecules, connections).build();

    return {
      modulePath: this.modulePath,
      moduleName: this.moduleName,
      files: this.molecules.map(m => ({
        path: m.filePath,
        atomCount: m.atomCount,
        exports: m.atoms.filter(a => a.isExported).map(a => a.name),
        hasSideEffects: m.atoms.some(a => a.hasSideEffects)
      })),
      crossFileConnections: connections,
      exports,
      imports,
      internalChains: chains,
      metrics
    };
  }
}

export default ModuleAnalyzer;
