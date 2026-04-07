import { normalizeFolderizationPath } from '../directory-structure-folderization-data.js';

function normalizeFocusPaths(filePaths = []) {
  return filePaths
    .map((filePath) => normalizeFolderizationPath(filePath))
    .filter(Boolean);
}

function normalizeGuidancePath(value = '') {
  const normalized = normalizeFolderizationPath(value);
  if (!normalized) {
    return null;
  }

  if (normalized.endsWith('.js')) {
    const slashIndex = normalized.lastIndexOf('/');
    return slashIndex > 0 ? normalized.slice(0, slashIndex) : normalized;
  }

  return normalized;
}

function splitPathSegments(path = '') {
  return String(path || '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function getPathTailSegment(path = '') {
  const segments = splitPathSegments(path);
  return segments.length > 0 ? segments[segments.length - 1] : '';
}

function countSharedPrefixSegments(left = '', right = '') {
  const leftSegments = splitPathSegments(left);
  const rightSegments = splitPathSegments(right);
  const limit = Math.min(leftSegments.length, rightSegments.length);
  let shared = 0;

  for (let index = 0; index < limit; index += 1) {
    if (leftSegments[index] !== rightSegments[index]) {
      break;
    }
    shared += 1;
  }

  return shared;
}

export {
  normalizeFocusPaths,
  normalizeGuidancePath,
  splitPathSegments,
  getPathTailSegment,
  countSharedPrefixSegments
};
