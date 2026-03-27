export function resolveDeletedFilePath(rootPath, filePath) {
  return rootPath
    ? ((filePath.startsWith('/') || filePath.match(/^[A-Z]:/)) ? filePath : `${rootPath}/${filePath}`).replace(/\\/g, '/')
    : filePath;
}

export function clearDeletedFileState(context, filePath) {
  if (context.fileHashes) context.fileHashes.delete(filePath);
  if (context.fileStats) context.fileStats.delete(filePath);
}

export async function fileExistsOnDisk(fullPath) {
  const fs = await import('fs/promises');
  return await fs.access(fullPath).then(() => true).catch(() => false);
}

export async function createDeletedFileShadows(context, filePath, options = {}) {
  const { getShadowRegistry } = await import('../../../layer-c-memory/shadow-registry/index.js');
  const registry = getShadowRegistry(context.dataPath);
  await registry.initialize();

  const atoms = await context.getAtomsForFile(filePath);
  if (!atoms || atoms.length === 0) {
    return 0;
  }

  let created = 0;
  for (const atom of atoms) {
    try {
      atom.filePath = filePath;
      const shadow = await registry.createShadow(atom, {
        reason: 'file_deleted',
        commits: options.commits || []
      });
      created++;
    } catch {
      // Ignore shadow creation failures.
    }
  }

  return created;
}
