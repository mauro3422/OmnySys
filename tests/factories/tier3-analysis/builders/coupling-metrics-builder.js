/**
 * @fileoverview CouplingMetricsBuilder - Builder for coupling metrics
 */

export class CouplingMetricsBuilder {
  constructor() {
    this.problematicCycles = 0;
    this.coupledFiles = 0;
  }

  withCircularDependencies(count) {
    this.problematicCycles = count;
    return this;
  }

  withCoupledFiles(count) {
    this.coupledFiles = count;
    return this;
  }

  build() {
    return {
      problematicCycles: this.problematicCycles,
      coupledFiles: this.coupledFiles
    };
  }

  static create() {
    return new CouplingMetricsBuilder();
  }
}
