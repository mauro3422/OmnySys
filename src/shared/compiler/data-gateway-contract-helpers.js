function normalizeCount(value) {
  const count = Number(value || 0);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function normalizePersistedFileCoverageSurface(surface = null) {
  if (!surface || typeof surface !== 'object') {
    return null;
  }

  const scannedFileTotal = normalizeCount(surface?.scannedFileTotal || surface?.totalFiles || surface?.filesTotal);
  const manifestFileTotal = normalizeCount(surface?.manifestFileTotal || surface?.liveIndexedFiles || surface?.activeFiles);

  return {
    ...surface,
    healthy: surface?.healthy !== false && surface?.synchronized !== false,
    filesTotal: scannedFileTotal,
    activeFiles: scannedFileTotal,
    primaryFilesWithImports: manifestFileTotal,
    systemFilesTotal: manifestFileTotal,
    fileDependenciesTotal: manifestFileTotal
  };
}

function normalizeFileImportEvidenceSurface(surface = null) {
  if (!surface || typeof surface !== 'object') {
    return null;
  }

  const filesTotal = normalizeCount(surface?.filesTotal || surface?.totalFiles || surface?.activeFiles);
  const importedFilesTotal = normalizeCount(surface?.primaryFilesWithImports || surface?.filesWithImports || surface?.importedFilesTotal);

  return {
    ...surface,
    healthy: surface?.healthy !== false,
    filesTotal,
    activeFiles: normalizeCount(surface?.activeFiles || surface?.filesTotal || surface?.totalFiles),
    primaryFilesWithImports: importedFilesTotal,
    systemFilesTotal: normalizeCount(surface?.systemFilesTotal || filesTotal),
    fileDependenciesTotal: normalizeCount(surface?.fileDependenciesTotal || filesTotal)
  };
}

export {
  normalizeCount,
  normalizePersistedFileCoverageSurface,
  normalizeFileImportEvidenceSurface
};
