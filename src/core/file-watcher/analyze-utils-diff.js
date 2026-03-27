export function _detectChangeType(oldAnalysis, newAnalysis) {
  const changes = [];

  const oldImports = new Set((oldAnalysis.imports || []).map((item) => item.source));
  const newImports = new Set((newAnalysis.imports || []).map((item) => item.source));

  const addedImports = [...newImports].filter((item) => !oldImports.has(item));
  const removedImports = [...oldImports].filter((item) => !newImports.has(item));

  if (addedImports.length > 0 || removedImports.length > 0) {
    changes.push({
      type: 'IMPORT_CHANGED',
      added: addedImports,
      removed: removedImports
    });
  }

  const oldExports = new Set((oldAnalysis.exports || []).map((item) => item.name));
  const newExports = new Set((newAnalysis.exports || []).map((item) => item.name));

  const addedExports = [...newExports].filter((item) => !oldExports.has(item));
  const removedExports = [...oldExports].filter((item) => !newExports.has(item));

  if (addedExports.length > 0 || removedExports.length > 0) {
    changes.push({
      type: 'EXPORT_CHANGED',
      added: addedExports,
      removed: removedExports
    });
  }

  const oldFuncs = new Set((oldAnalysis.definitions || []).filter((item) => item.type === 'function').map((item) => item.name));
  const newFuncs = new Set((newAnalysis.definitions || []).filter((item) => item.type === 'function').map((item) => item.name));

  if ([...oldFuncs].sort().join(',') !== [...newFuncs].sort().join(',')) {
    changes.push({ type: 'FUNCTIONS_CHANGED' });
  }

  return changes;
}
