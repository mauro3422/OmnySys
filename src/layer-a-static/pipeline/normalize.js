import path from 'path';

export function normalizeParsedFiles(parsedFiles, absoluteRootPath) {
  const normalizedParsedFiles = {};
  for (const [filePath, fileInfo] of Object.entries(parsedFiles)) {
    const projectRelative = path.relative(absoluteRootPath, filePath).replace(/\\/g, '/');
    normalizedParsedFiles[projectRelative] = fileInfo;
  }
  return normalizedParsedFiles;
}

export function normalizeResolvedImports(resolvedImports, absoluteRootPath) {
  const normalizedResolvedImports = {};
  for (const [filePath, imports] of Object.entries(resolvedImports)) {
    const projectRelative = path.relative(absoluteRootPath, filePath).replace(/\\/g, '/');
    normalizedResolvedImports[projectRelative] = imports;
  }
  return normalizedResolvedImports;
}
