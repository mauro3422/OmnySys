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
export class ImpactScorer {
  score(race, projectData) {
    let impact = 0.5;

    const affectedFlows = this.getAffectedBusinessFlows(race, projectData);
    if (affectedFlows.length > 0) {
      impact += 0.2 * Math.min(affectedFlows.length / 3, 1.0);
    }

    const affectedEntries = this.getAffectedEntryPoints(race, projectData);
    if (affectedEntries.length > 0) {
      impact += 0.2 * Math.min(affectedEntries.length / 2, 1.0);
    }

    const hasExportedAccess = race.accesses.some(a => a.isExported);
    if (hasExportedAccess) {
      impact += 0.1;
    }

    return Math.min(impact, 1.0);
  }

  getAffectedBusinessFlows(race, projectData) {
    const system = projectData?.system;
    if (!system?.businessFlows) return [];

    const affected = [];
    const accessAtoms = new Set(race.accesses.map(a => a.atom));

    for (const flow of system.businessFlows) {
      for (const step of flow.steps || []) {
        if (step.function && accessAtoms.has(step.function)) {
          affected.push(flow.name);
          break;
        }
      }
    }

    return affected;
  }

  getAffectedEntryPoints(race, projectData) {
    const system = projectData?.system;
    if (!system?.entryPoints) return [];

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
