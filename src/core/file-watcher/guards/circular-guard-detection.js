import path from 'path';
import { createLogger } from '../../../utils/logger.js';
import { safeArray, classifyCircularCycle } from '../../../shared/compiler/index.js';
import { normalizePath } from '../../../shared/utils/path-utils.js';
import { detectCycles } from '../../../layer-graph/algorithms/cycle-detector.js';
import {
  persistModuleCycleIssue,
  persistLifecycleCycleIssue,
  persistFunctionalCycleIssue,
  isLikelyInfrastructureCycleAtom
} from './circular-guard-persistence.js';
import {
  getCircularCallRelations,
  getCircularFileImports,
  getCircularLocalAtoms
} from './circular-repository.js';
import { clearCircularIssues } from './circular-issue-service.js';

const logger = createLogger('OmnySys:file-watcher:guards:circular');

function buildFileGraph(allFiles = []) {
  const fileGraph = {};

  for (const file of allFiles) {
    if (!file.imports_json) continue;

    try {
      const parsed = JSON.parse(file.imports_json);
      const targets = safeArray(parsed)
        .filter((entry) => entry && entry.type === 'local' && entry.resolved)
        .map((entry) => entry.resolved);
      fileGraph[file.path] = { dependsOn: targets };
    } catch {
      // Ignore malformed cached payloads in incremental mode.
    }
  }

  return fileGraph;
}

async function detectAtomCycles(rootPath, filePath, relPath, repo, localAtoms, fileCycle) {
  try {
    const atomIdPattern = `${relPath}::%`;
    const relations = getCircularCallRelations(repo?.db, atomIdPattern);
    const callGraph = {};

    for (const relation of relations) {
      if (!callGraph[relation.source_id]) {
        callGraph[relation.source_id] = { dependsOn: [] };
      }
      callGraph[relation.source_id].dependsOn.push(relation.target_id);
    }

    const cycles = detectCycles(callGraph);

    for (const atom of localAtoms) {
      const atomCycle = cycles.find((cycle) => cycle.includes(atom.id));
      if (!atomCycle || atomCycle.length <= 2) continue;

      const atomNames = atomCycle.map((atomId) => atomId.split('::')[1] || atomId);
      const cycleClassification = classifyCircularCycle(relPath, atomCycle, atomNames);

      if (cycleClassification === 'algorithmic') {
        logger.debug(`[CIRCULAR FUNCTION GUARD][ALGORITHMIC] Ignoring intentional recursion: ${atomNames.join(' -> ')}`);
        await clearCircularIssues(rootPath, filePath);
        continue;
      }

      if (cycleClassification === 'lifecycle') {
        const context = await persistLifecycleCycleIssue(rootPath, filePath, atom, atomCycle, atomNames);
        return { fileCycle, atomCycle, context };
      }

      if (isLikelyInfrastructureCycleAtom(atom)) {
        logger.debug(`[CIRCULAR FUNCTION GUARD][INFRA] Ignoring infrastructure leaf cycle: ${atomNames.join(' -> ')}`);
        await clearCircularIssues(rootPath, filePath);
        continue;
      }

      const context = await persistFunctionalCycleIssue(rootPath, filePath, atom, atomCycle, atomNames);
      return { fileCycle, atomCycle, context };
    }

    await clearCircularIssues(rootPath, filePath);
    return { fileCycle, atomCycle: null };
  } catch (error) {
    logger.debug(`[CIRCULAR FUNCTION GUARD][SKIP] ${relPath}: ${error.message}`);
    return { fileCycle, atomCycle: null };
  }
}

export async function detectCircularDependencies(rootPath, filePath, repo) {
  const relPath = normalizePath(path.relative(rootPath, filePath));

  if (!repo || !repo.db) {
    logger.debug(`[CIRCULAR GUARD SKIP] No DB connection for ${relPath}`);
    return null;
  }

  try {
    const allFiles = getCircularFileImports(repo.db);
    const fileGraph = buildFileGraph(allFiles);
    const cycles = detectCycles(fileGraph);
    const fileCycle = cycles.find((cycle) => cycle.includes(relPath)) || null;

    if (fileCycle) {
      await persistModuleCycleIssue(rootPath, filePath, fileCycle);
    } else {
      await clearCircularIssues(rootPath, filePath);
    }

    const localAtoms = getCircularLocalAtoms(repo.db, relPath);

    if (localAtoms.length === 0) {
      return { fileCycle, atomCycle: null };
    }

    return detectAtomCycles(rootPath, filePath, relPath, repo, localAtoms, fileCycle);
  } catch (error) {
    logger.error(`[CIRCULAR GUARD FAILED] ${error.message}`);
    return null;
  }
}
