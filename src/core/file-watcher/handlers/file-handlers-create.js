import fs from 'fs/promises';
import { collectAndIndexFile } from '../analyze.js';
import { guardRegistry } from '../guards/registry.js';
import { isLowSignalName } from '../guards/guard-standards.js';

export async function handleFileCreatedForWatcher(fileWatcher, filePath, fullPath, changeContext = {}) {
  const stats = await fs.stat(fullPath).catch(() => null);
  if (!stats || stats.isDirectory()) {
    return;
  }

  const originSuffix = changeContext.origin ? ` (origin=${changeContext.origin})` : '';
  fileWatcher._logger.info(`[FILE CREATED] ${filePath}${originSuffix}`);

  const analysis = await collectAndIndexFile.call(fileWatcher, filePath, fullPath, false);
  const atoms = analysis.moleculeAtoms || analysis.atoms || [];

  await guardRegistry.initializeDefaultGuards();
  await guardRegistry.runImpactGuards(fileWatcher.rootPath, filePath, fileWatcher, {
    fullPath,
    atoms,
    analysis
  });

  const highSignalAtoms = atoms.filter(atom => !isLowSignalName(atom?.name));
  fileWatcher._logger.info(`[FILE COMPILED] ${filePath} -> ${atoms.length} atoms (${highSignalAtoms.length} high-signal)`);

  fileWatcher.emit('file:created', {
    filePath,
    analysis,
    origin: changeContext.origin || 'unknown',
    source: changeContext.source || null
  });
}
