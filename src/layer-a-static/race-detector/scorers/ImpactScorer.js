/**
 * @fileoverview ImpactScorer.js
 * 
 * Scores race by system impact.
 * 
 * @module race-detector/scorers/ImpactScorer
 */

/**
 * Scores race by system impact
 */
function getBusinessFlowFunctionIndex(system) {
  if (system?._businessFlowFunctionIndex?.source === system.businessFlows) {
    return system._businessFlowFunctionIndex.index;
  }

  const index = new Map();
  for (const flow of system.businessFlows || []) {
    for (const step of flow.steps || []) {
      const functionName = step?.function;
      if (!functionName) {
        continue;
      }

      const bucket = index.get(functionName) || [];
      bucket.push(flow.name);
      index.set(functionName, bucket);
    }
  }

  system._businessFlowFunctionIndex = {
    source: system.businessFlows,
    index,
  };

  return index;
}

export class ImpactScorer {
  score(race, projectData) {
    if (!race || !race.accesses || !Array.isArray(race.accesses)) {
      return 0.5;
    }
    let impact = 0.5;

    const affectedFlows = this.getAffectedBusinessFlows(race, projectData);
    if (affectedFlows.length > 0) {
      impact += 0.2 * Math.min(affectedFlows.length / 3, 1.0);
    }

    const affectedEntries = this.getAffectedEntryPoints(race, projectData);
    if (affectedEntries.length > 0) {
      impact += 0.2 * Math.min(affectedEntries.length / 2, 1.0);
    }

    const hasExportedAccess = race.accesses.some(a => a?.isExported);
    if (hasExportedAccess) {
      impact += 0.1;
    }

    // Cap at 1.0
    return Math.min(impact, 1.0);
  }

  getAffectedBusinessFlows(race, projectData) {
    const system = projectData?.system;
    if (!system?.businessFlows || system.businessFlows.length === 0) return [];

    const affected = new Set();
    const accessAtoms = new Set(race.accesses.map((access) => access.atom).filter(Boolean));
    const flowIndex = getBusinessFlowFunctionIndex(system);

    for (const atomName of accessAtoms) {
      const flowNames = flowIndex.get(atomName);
      if (!flowNames) {
        continue;
      }

      for (const flowName of flowNames) {
        affected.add(flowName);
      }
    }

    return [...affected];
  }

  getAffectedEntryPoints(race, projectData) {
    const system = projectData?.system;
    if (!system?.entryPoints || system.entryPoints.length === 0) return [];

    const affected = [];
    const accessModules = new Set(race.accesses.map(a => a.module));

    for (const entry of system.entryPoints) {
      if (entry.module && accessModules.has(entry.module)) {
        affected.push(entry.handler?.function || entry.type);
      }
    }

    return affected;
  }
}

export default ImpactScorer;
