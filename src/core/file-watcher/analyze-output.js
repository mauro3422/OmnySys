export function buildFileWatcherCompileLogMessage(filePath, analysis, isUpdate = false) {
  const atomCount = analysis?.moleculeAtoms?.length || 0;
  const shadowVolume = analysis?.metadata?.shadowVolume ?? 'n/a';
  return `FileWatcher compile: ${filePath} -> ${atomCount} atoms, shadow=${shadowVolume}%${isUpdate ? ' [update]' : ' [create]'}`;
}
