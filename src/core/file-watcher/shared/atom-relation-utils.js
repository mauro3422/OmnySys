import { safeArray } from '../../../shared/compiler/index.js';

export function countRequiredSignatureParams(atom) {
  return safeArray(atom?.signature?.params).filter(param => !param?.optional).length;
}

function extractAtomFilePath(atomId) {
  return typeof atomId === 'string' && atomId.includes('::') ? atomId.split('::')[0] : null;
}

export function extractRelatedFilePath(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return extractAtomFilePath(entry);

  const direct = entry.filePath || entry.file || entry.targetFile || entry.sourcePath || entry.targetPath;
  if (direct && typeof direct === 'string') return direct;

  const id = entry.id || entry.atomId || entry.targetId || entry.sourceId;
  return extractAtomFilePath(id);
}
