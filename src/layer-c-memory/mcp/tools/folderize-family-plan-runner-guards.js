import path from 'path';
import { createLogger } from '../../../utils/logger.js';
import { runFileWatcherSemanticGuards } from '../../../core/file-watcher/analyze-flow.js';
import { loadAtomsForFile } from '../../../core/file-watcher/handlers/file-handlers-core-helpers-storage.js';

const logger = createLogger('OmnySys:mcp:folderize_family:guards');

export async function runDeferredGuards({ focusPlan, projectPath, moveContext, allTargets }) {
  const targets = Array.from(new Set((allTargets || []).map((value) => String(value || '').trim()).filter(Boolean)));
  logger.info(`[DEFERRED GUARDS] Running semantic guards for ${targets.length} target files...`);

  const guardContext = {
    rootPath: projectPath,
    ...moveContext,
    deferGuards: false,
    async getAtomsForFile(filePath) {
      try {
        return await loadAtomsForFile({ rootPath: projectPath }, filePath);
      } catch (error) {
        logger.warn(`[DEFERRED GUARDS] getAtomsForFile failed for ${filePath}: ${error.message}`);
        return [];
      }
    }
  };

  const results = [];

  for (const targetPath of targets) {
    try {
      const fullPath = path.resolve(projectPath, targetPath);
      const { collectAndBuildFileAnalysis } = await import('../../../core/file-watcher/analyze-flow.js');
      const analysis = await collectAndBuildFileAnalysis({ rootPath: projectPath }, targetPath, fullPath);

      const atoms = Array.isArray(analysis?.moleculeAtoms) ? analysis.moleculeAtoms : [];
      if (atoms.length === 0) {
        continue;
      }

      await runFileWatcherSemanticGuards(guardContext, targetPath, atoms);
      results.push({ filePath: targetPath, status: 'checked' });
    } catch (error) {
      logger.error(`[DEFERRED GUARD] Failed for ${targetPath}: ${error.message}`);
      results.push({ filePath: targetPath, status: 'error', error: error.message });
    }
  }

  logger.info(`[DEFERRED GUARDS] Complete: ${results.filter((r) => r.status === 'checked').length} checked, ${results.filter((r) => r.status === 'error').length} errors`);

  return {
    success: results.every((r) => r.status !== 'error'),
    checked: results.filter((r) => r.status === 'checked').length,
    errors: results.filter((r) => r.status === 'error'),
    total: results.length
  };
}
