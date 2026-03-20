function createFileLinksIndex(functionLinks = []) {
  const linksByFile = new Map();

  for (const link of functionLinks) {
    if (!linksByFile.has(link.file_to)) {
      linksByFile.set(link.file_to, new Set());
    }

    linksByFile.get(link.file_to).add(link.to);
  }

  return linksByFile;
}

function collectUsedIdentifiers(fileNode = {}) {
  const allCalls = new Set();
  const namespaceRoots = new Set();
  const functions = fileNode.functions || [];
  const calls = fileNode.calls || [];
  const refs = fileNode.identifierRefs || [];

  for (const func of functions) {
    for (const call of func.calls || []) {
      registerCallName(allCalls, namespaceRoots, call.name);
    }
  }

  for (const call of calls) {
    registerCallName(allCalls, namespaceRoots, call.name);
  }

  for (const ref of refs) {
    allCalls.add(ref);
  }

  return {
    allCalls,
    namespaceRoots
  };
}

function collectUnusedImports(fileNode, filePath, fileLinks) {
  const imports = fileNode.imports || [];

  if (imports.length === 0) {
    return [];
  }

  if (!hasUsageSources(fileNode)) {
    return collectAllImportsAsUnused(imports);
  }

  const usage = collectUsedIdentifiers(fileNode);
  return collectUnusedImportsWithUsage(imports, filePath, fileLinks, usage);
}

function hasUsageSources(fileNode = {}) {
  return Boolean(
    (fileNode.functions && fileNode.functions.length) ||
    (fileNode.calls && fileNode.calls.length) ||
    (fileNode.identifierRefs && fileNode.identifierRefs.length)
  );
}

function collectAllImportsAsUnused(imports) {
  const unusedInFile = [];

  for (const importStmt of imports) {
    for (const spec of importStmt.specifiers || []) {
      const importedName = spec.local || spec.imported;
      unusedInFile.push({
        name: importedName,
        source: importStmt.source,
        type: spec.type,
        severity: 'warning'
      });
    }
  }

  return unusedInFile;
}

function collectUnusedImportsWithUsage(imports, filePath, fileLinks, usage) {
  const unusedInFile = [];

  for (const importStmt of imports) {
    for (const spec of importStmt.specifiers || []) {
      const importedName = spec.local || spec.imported;
      const isUsed = isImportUsed(spec, importedName, filePath, fileLinks, usage);

      if (!isUsed) {
        unusedInFile.push({
          name: importedName,
          source: importStmt.source,
          type: spec.type,
          severity: 'warning'
        });
      }
    }
  }

  return unusedInFile;
}

function isImportUsed(spec, importedName, filePath, fileLinks, usage) {
  if (spec.type === 'namespace') {
    return usage.namespaceRoots.has(importedName) || usage.allCalls.has(importedName);
  }

  if (spec.type === 'default') {
    return usage.allCalls.has(importedName);
  }

  const targetId = `${filePath}:${importedName}`;
  return usage.allCalls.has(importedName) || fileLinks.has(targetId);
}

function registerCallName(allCalls, namespaceRoots, callName) {
  if (!callName) return;

  allCalls.add(callName);

  const separatorIndex = callName.indexOf('.');
  if (separatorIndex > 0) {
    namespaceRoots.add(callName.slice(0, separatorIndex));
  }
}

export function analyzeUnusedImports(systemMap = {}) {
  const unusedByFile = {};
  let totalUnused = 0;
  const linksByFile = createFileLinksIndex(systemMap.function_links || []);

  for (const [filePath, fileNode] of Object.entries(systemMap.files || {})) {
    const fileLinks = linksByFile.get(filePath) || new Set();
    const unusedInFile = collectUnusedImports(fileNode, filePath, fileLinks);

    if (unusedInFile.length > 0) {
      unusedByFile[filePath] = unusedInFile;
      totalUnused += unusedInFile.length;
    }
  }

  return {
    total: totalUnused,
    byFile: unusedByFile,
    recommendation: totalUnused > 0 ? `Remove ${totalUnused} unused import(s) to reduce confusion` : 'All imports are used'
  };
}
