/**
 * MCP Tool: get_module_overview
 *
 * Phase 3: Module & System level analysis.
 *
 * Groups atoms by directory (module = folder) and derives module-level
 * metadata: entrypoints, dependencies, health metrics, business flows.
 * Builds on the existing module-system infrastructure.
 *
 * @module mcp/tools/get-module-overview
 */

import { getAllAtoms } from '#layer-c/storage/atoms/atom.js';
import { analyzeModules } from '#layer-a/module-system/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:module-overview');

/**
 * Build pseudo-molecules from atoms grouped by filePath.
 * Molecules are what analyzeModules() expects.
 */
function buildMoleculesFromAtoms(allAtoms) {
  const byFile = new Map();

  for (const atom of allAtoms) {
    const fp = atom.filePath;
    if (!byFile.has(fp)) {
      byFile.set(fp, { filePath: fp, type: 'molecule', atoms: [], atomCount: 0 });
    }
    const mol = byFile.get(fp);
    mol.atoms.push(atom);
    mol.atomCount++;
  }

  return [...byFile.values()];
}

export async function get_module_overview(args, context) {
  const { modulePath, topN = 10 } = args;
  const { projectPath } = context;

  logger.debug('Phase 3: get_module_overview');

  const allAtoms = await getAllAtoms(projectPath);
  const molecules = buildMoleculesFromAtoms(allAtoms);

  let moduleData;
  try {
    moduleData = analyzeModules(projectPath, molecules);
  } catch (err) {
    return { error: `Module analysis failed: ${err.message}` };
  }

  const { modules, system, summary } = moduleData;

  // Filter to specific module path if requested
  let filteredModules = modules;
  if (modulePath) {
    const norm = modulePath.replace(/\\/g, '/');
    filteredModules = modules.filter(m =>
      m.path?.includes(norm) || m.name?.includes(norm)
    );
  }

  // Sort by complexity/risk and take topN
  const sorted = filteredModules
    .sort((a, b) => (b.metrics?.complexity || 0) - (a.metrics?.complexity || 0))
    .slice(0, topN);

  return {
    summary: {
      totalModules: summary.totalModules,
      totalFiles: molecules.length,
      totalAtoms: allAtoms.length,
      totalBusinessFlows: summary.totalBusinessFlows || 0,
    },
    system: system ? {
      entryPoints: system.entryPoints?.slice(0, 10) || [],
      businessFlows: system.businessFlows?.slice(0, 10) || [],
      criticalPaths: system.criticalPaths?.slice(0, 5) || [],
      externalDependencies: system.externalDependencies?.slice(0, 10) || [],
    } : null,
    modules: sorted.map(m => ({
      name: m.name || m.path,
      path: m.path,
      fileCount: m.files?.length || m.molecules?.length || 0,
      atomCount: m.atoms?.length || 0,
      metrics: m.metrics || null,
      entryPoints: m.entryPoints?.slice(0, 5) || [],
      dependencies: m.dependencies?.slice(0, 5) || [],
      patterns: m.patterns?.slice(0, 5) || [],
    })),
    hint: filteredModules.length === 0 && modulePath
      ? `No modules found for "${modulePath}". Call without modulePath to see all modules.`
      : null,
  };
}

export default { get_module_overview };
