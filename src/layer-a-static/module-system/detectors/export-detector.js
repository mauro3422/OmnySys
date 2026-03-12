/**
 * @fileoverview Main Export Detector
 *
 * Detects the primary exports of modules.
 *
 * @module module-system/detectors/export-detector
 * @phase 3
 */

import path from 'path';

const MAIN_EXPORT_FILES = new Set(['index.js', 'main.js']);

function findMainExportFileNames(files = []) {
  const fileNames = new Set();

  for (const file of files) {
    const fileName = path.basename(file.path);
    if (MAIN_EXPORT_FILES.has(fileName)) {
      fileNames.add(fileName);
    }
  }

  return fileNames;
}

function buildLibraryExport(moduleName, exportEntry) {
  return {
    type: 'library',
    name: exportEntry.name,
    module: moduleName,
    exportedFrom: exportEntry.file
  };
}

export function findMainExports(modules) {
  const exports = [];

  for (const module of modules) {
    const mainFileNames = findMainExportFileNames(module.files);
    if (mainFileNames.size === 0) {
      continue;
    }

    for (const exportEntry of module.exports || []) {
      if (mainFileNames.has(exportEntry.file)) {
        exports.push(buildLibraryExport(module.moduleName, exportEntry));
      }
    }
  }

  return exports;
}
