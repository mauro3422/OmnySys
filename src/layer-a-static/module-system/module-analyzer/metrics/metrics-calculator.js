/**
 * @fileoverview Metrics Calculator
 *
 * Calculates module metrics.
 *
 * @module module-analyzer/metrics/metrics-calculator
 * @version 1.0.0
 */

export class MetricsCalculator {
  constructor(molecules) {
    this.molecules = molecules;
    this.allAtoms = molecules.flatMap(molecule => molecule.atoms || []);
    this.functionNames = new Set(this.allAtoms.map(atom => atom.name));
  }

  calculate() {
    const baseMetrics = collectBaseMetrics(this.allAtoms);
    const relationshipMetrics = collectRelationshipMetrics(
      this.allAtoms,
      this.functionNames
    );

    return {
      totalFiles: this.molecules.length,
      ...baseMetrics,
      ...relationshipMetrics
    };
  }
}

function collectBaseMetrics(allAtoms) {
  const totalFunctions = allAtoms.length;

  if (totalFunctions === 0) {
    return {
      totalFunctions: 0,
      exportedFunctions: 0,
      privateFunctions: 0,
      functionsWithSideEffects: 0,
      averageComplexity: 0
    };
  }

  let exportedFunctions = 0;
  let functionsWithSideEffects = 0;
  let complexitySum = 0;

  for (const atom of allAtoms) {
    if (atom.isExported) {
      exportedFunctions++;
    }

    if (atom.hasSideEffects) {
      functionsWithSideEffects++;
    }

    complexitySum += atom.complexity || 0;
  }

  return {
    totalFunctions,
    exportedFunctions,
    privateFunctions: totalFunctions - exportedFunctions,
    functionsWithSideEffects,
    averageComplexity: Math.round((complexitySum / totalFunctions) * 10) / 10
  };
}

function collectRelationshipMetrics(allAtoms, functionNames) {
  const totalFunctions = allAtoms.length;

  if (totalFunctions === 0) {
    return {
      cohesion: 0,
      coupling: 0
    };
  }

  let connectedFunctions = 0;
  let externalCalls = 0;
  let totalCalls = 0;

  for (const atom of allAtoms) {
    const relationshipStats = collectAtomRelationshipStats(atom, functionNames);
    connectedFunctions += relationshipStats.connectedFunctions;
    externalCalls += relationshipStats.externalCalls;
    totalCalls += relationshipStats.totalCalls;
  }

  return {
    cohesion: connectedFunctions / totalFunctions,
    coupling: totalCalls > 0 ? externalCalls / totalCalls : 0
  };
}

function collectAtomRelationshipStats(atom, functionNames) {
  let connectedFunctions = 0;
  let externalCalls = 0;
  let totalCalls = 0;
  let hasInternalRelationship = false;

  for (const call of atom.calls || []) {
    totalCalls++;

    if (call.type === 'external') {
      externalCalls++;
    }

    if (!hasInternalRelationship && call.name && functionNames.has(call.name)) {
      hasInternalRelationship = true;
    }
  }

  if (!hasInternalRelationship) {
    for (const caller of atom.calledBy || []) {
      const callerName = caller.split('::').pop();
      if (callerName && functionNames.has(callerName)) {
        hasInternalRelationship = true;
        break;
      }
    }
  }

  if (hasInternalRelationship) {
    connectedFunctions = 1;
  }

  return {
    connectedFunctions,
    externalCalls,
    totalCalls
  };
}

export default MetricsCalculator;
