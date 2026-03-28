import fs from 'fs/promises';
import { collectAndIndexFile } from '../analyze.js';
import { guardRegistry } from '../guards/registry.js';
import { isLowSignalName } from '../guards/guard-standards.js';
import { emitFileLifecycleEvent, formatOriginSuffix, logFileLifecycle } from './file-handler-events.js';

export async function handleFileCreatedForWatcher(fileWatcher, filePath, fullPath, changeContext = {}) {
  const stats = await fs.stat(fullPath).catch(() => null);
  if (!stats || stats.isDirectory()) {
    return;
  }

  logFileLifecycle(`[FILE CREATED] ${filePath}${formatOriginSuffix(changeContext)}`);

  const analysis = await collectAndIndexFile.call(fileWatcher, filePath, fullPath, false);
  const atoms = analysis.moleculeAtoms || analysis.atoms || [];

  await guardRegistry.initializeDefaultGuards();
  await guardRegistry.runImpactGuards(fileWatcher.rootPath, filePath, fileWatcher, {
    fullPath,
    atoms,
    analysis
  });

  const highSignalAtoms = atoms.filter(atom => !isLowSignalName(atom?.name));
  const watcherLogger = fileWatcher._logger;
  if (watcherLogger?.info) {
    watcherLogger.info(`[FILE COMPILED] ${filePath} -> ${atoms.length} atoms (${highSignalAtoms.length} high-signal)`);
  } else {
    console.info(`[FILE COMPILED] ${filePath} -> ${atoms.length} atoms (${highSignalAtoms.length} high-signal)`);
  }

  emitFileLifecycleEvent(fileWatcher, 'file:created', filePath, changeContext, { analysis });
}
