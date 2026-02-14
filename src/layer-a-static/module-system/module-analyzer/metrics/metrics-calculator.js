/**
 * @fileoverview Metrics Calculator
 * 
 * Calcula métricas del módulo.
 * 
 * @module module-analyzer/metrics/metrics-calculator
 * @version 1.0.0
 */

export class MetricsCalculator {
  constructor(molecules) {
    this.molecules = molecules;
    this.allAtoms = molecules.flatMap(m => m.atoms || []);
  }

  calculate() {
    return {
      totalFiles: this.molecules.length,
      totalFunctions: this.allAtoms.length,
      exportedFunctions: this.countExported(),
      privateFunctions: this.allAtoms.length - this.countExported(),
      functionsWithSideEffects: this.countSideEffects(),
      averageComplexity: this.calculateAverageComplexity(),
      cohesion: this.calculateCohesion(),
      coupling: this.calculateCoupling()
    };
  }

  countExported() {
    return this.allAtoms.filter(a => a.isExported).length;
  }

  countSideEffects() {
    return this.allAtoms.filter(a => a.hasSideEffects).length;
  }

  calculateAverageComplexity() {
    const complexities = this.allAtoms.map(a => a.complexity || 0);
    if (complexities.length === 0) return 0;
    
    const sum = complexities.reduce((a, b) => a + b, 0);
    return Math.round((sum / complexities.length) * 10) / 10;
  }

  calculateCohesion() {
    const functionNames = new Set(this.allAtoms.map(a => a.name));
    let connectedCount = 0;
    
    for (const atom of this.allAtoms) {
      const hasInternalCalls = atom.calls?.some(c => functionNames.has(c.name));
      const hasInternalCallers = atom.calledBy?.some(caller => 
        functionNames.has(caller.split('::').pop())
      );
      
      if (hasInternalCalls || hasInternalCallers) {
        connectedCount++;
      }
    }
    
    return this.allAtoms.length > 0 ? connectedCount / this.allAtoms.length : 0;
  }

  calculateCoupling() {
    let externalCalls = 0;
    let totalCalls = 0;
    
    for (const atom of this.allAtoms) {
      for (const call of atom.calls || []) {
        totalCalls++;
        if (call.type === 'external') {
          externalCalls++;
        }
      }
    }
    
    return totalCalls > 0 ? externalCalls / totalCalls : 0;
  }
}

export default MetricsCalculator;
