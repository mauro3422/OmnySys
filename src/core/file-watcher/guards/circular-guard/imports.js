import { createLogger } from '../../../../utils/logger.js';
import { prepareFileDependencyLookup } from './repository.js';
import { clearCircularIssues } from './issue-service.js';

const logger = createLogger('OmnySys:file-watcher:guards:circular');

export async function detectCircularImportsForFile(rootPath, filePath, EventEmitterContext, options = {}) {
  const { maxDepth = 5 } = options;

  try {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(rootPath);
    if (!repo?.db) return null;

    const startNode = filePath.replace(/\\/g, '/');
    const cyclesFound = [];
    const queue = [{ path: startNode, chain: [startNode] }];
    const visited = new Set();

    const getDeps = prepareFileDependencyLookup(repo.db);
    if (!getDeps) {
      return null;
    }

    let iterationCount = 0;
    while (queue.length > 0 && iterationCount < 1000) {
      iterationCount++;
      const { path: currentPath, chain } = queue.shift();

      if (chain.length > maxDepth) continue;

      const outgoing = getDeps.all(currentPath);
      for (const row of outgoing) {
        const nextPath = row.target_path;
        if (nextPath === startNode) {
          cyclesFound.push([...chain, startNode]);
          continue;
        }

        const visitKey = `${currentPath}->${nextPath}`;
        if (!visited.has(visitKey) && !chain.includes(nextPath)) {
          visited.add(visitKey);
          queue.push({ path: nextPath, chain: [...chain, nextPath] });
        }
      }
    }

    if (cyclesFound.length === 0) {
      await clearCircularIssues(rootPath, filePath);
      return [];
    }

    const shortestCycle = cyclesFound.sort((a, b) => a.length - b.length)[0];
    const cycleStr = shortestCycle.join(' -> ');
    logger.warn(`[CIRCULAR GUARD] Circular import detected: ${cycleStr}`);

    const context = {
      severity: 'high',
      suggestedAction: 'Break the circular import by extracting shared code',
      suggestedAlternatives: [
        'Create a shared types/utils module',
        'Use dependency injection',
        'Merge tightly coupled modules'
      ],
      extraData: {
        cycleType: 'import',
        cycles: cyclesFound,
        shortestCycle,
        cycleLength: shortestCycle.length
      }
    };

    const { persistCircularIssue } = await import('./issue-service.js');
    await persistCircularIssue(rootPath, filePath, 'high', `Circular dependency: ${cycleStr}`, context);

    EventEmitterContext.emit('arch:circular', { filePath, cycles: cyclesFound });
    return cyclesFound;
  } catch (error) {
    logger.debug(`[CIRCULAR GUARD SKIP] ${filePath}: ${error.message}`);
    return null;
  }
}
