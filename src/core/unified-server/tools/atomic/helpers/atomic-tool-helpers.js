import { buildToolError } from '../../tool-helpers.js';
import { calculateRiskMetrics } from './risk-helpers.js';
import { buildMetricCategories } from './catalog-helpers.js';
import { getRecommendation, getAllRecommendations, getTestingRecommendations } from '../recommendations/archetype-recommendations.js';
import {
  formatAtomBasic,
  formatSideEffects,
  formatCallGraph,
  formatQualityMetrics,
  formatFunctionSummary,
  formatInsights
} from '../formatters/atom-formatters.js';

export function buildAtomicToolError(error) {
  return buildToolError(error);
}

export function buildFunctionDetailsResponse(atom) {
  return {
    atom: formatAtomBasic(atom),
    archetype: atom.archetype,
    sideEffects: formatSideEffects(atom),
    callGraph: formatCallGraph(atom),
    quality: formatQualityMetrics(atom)
  };
}

export function buildMoleculeSummaryResponse(filePath, data) {
  return {
    filePath,
    atomsAvailable: true,
    molecule: data.derived,
    stats: data.stats,
    atoms: data.atoms.map(formatFunctionSummary),
    insights: formatInsights(data)
  };
}

export function buildFunctionImpactResponse(filePath, functionName, atom) {
  return {
    function: functionName,
    file: filePath,
    atomId: atom.id,
    directImpact: {
      callers: atom.calledBy || [],
      callerCount: atom.calledBy?.length || 0,
      isExported: atom.isExported
    },
    dependencies: {
      calls: atom.calls || [],
      externalCalls: atom.externalCalls || [],
      internalCalls: atom.internalCalls || []
    },
    risk: calculateRiskMetrics(atom),
    riskCategory: buildMetricCategories(atom.archetype?.severity || 0),
    recommendation: getRecommendation(atom.archetype?.type)
  };
}

export function buildAtomicFunctionLists(filePath, atoms) {
  const byArchetype = {};
  const exported = [];
  const internal = [];

  for (const atom of atoms) {
    const archetype = atom.archetype?.type || 'unknown';
    if (!byArchetype[archetype]) {
      byArchetype[archetype] = [];
    }
    byArchetype[archetype].push(formatFunctionSummary(atom));

    const targetList = atom.isExported ? exported : internal;
    targetList.push({
      name: atom.name,
      archetype,
      complexity: atom.complexity,
      calledBy: atom.calledBy?.length || 0
    });
  }

  return {
    filePath,
    summary: {
      total: atoms.length,
      exported: exported.length,
      internal: internal.length,
      archetypes: Object.keys(byArchetype)
    },
    byArchetype,
    exported: exported.sort((a, b) => b.calledBy - a.calledBy),
    internal: internal.sort((a, b) => b.calledBy - a.calledBy),
    insights: {
      deadCode: byArchetype['dead-function'] || [],
      hotPaths: byArchetype['hot-path'] || [],
      fragile: byArchetype['fragile-network'] || [],
      godFunctions: byArchetype['god-function'] || []
    }
  };
}

export function buildTestingRecommendations(atom) {
  return getTestingRecommendations(atom);
}

export function buildRecommendations(atom) {
  return {
    recommendation: getRecommendation(atom.archetype?.type),
    all: getAllRecommendations(atom)
  };
}
