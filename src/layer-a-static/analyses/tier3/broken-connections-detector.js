/**
 * @fileoverview broken-connections-detector.js
 *
 * Detecta conexiones rotas entre modulos:
 * - Named imports cuyo simbolo no esta exportado por el archivo fuente
 * - Default imports de archivos sin default export
 * - Broken workers, dynamic imports, duplicates, dead functions, suspicious URLs
 *   (delegado a BrokenConnectionsDetector class)
 *
 * @module layer-a-static/analyses/tier3/broken-connections-detector
 * @phase Layer A (Static Extraction)
 */

import { BrokenConnectionsDetector } from './detectors/BrokenConnectionsDetector.js';

/**
 * Construye un mapa de exports por archivo.
 * Combina: exports del file node, functions index y barrel export index.
 *
 * @param {Object} systemMap
 * @returns {Map<string, { names: Set<string>, hasDefault: boolean }>}
 */
function buildFileExportMap(systemMap) {
  const fileExports = new Map();

  for (const [filePath, fileNode] of Object.entries(systemMap.files || {})) {
    const names = new Set();
    let hasDefault = false;

    for (const exp of (fileNode.exports || [])) {
      if (exp.type === 'default') {
        hasDefault = true;
      } else if (exp.name) {
        names.add(exp.name);
      }
    }

    for (const func of (systemMap.functions?.[filePath] || [])) {
      if (func.isExported && func.name) {
        names.add(func.name);
      }
    }

    for (const exportName of Object.keys(systemMap.exportIndex?.[filePath] || {})) {
      names.add(exportName);
    }

    fileExports.set(filePath, { names, hasDefault });
  }

  return fileExports;
}

function createMissingDefaultExportIssue(dep) {
  return {
    sourceFile: dep.from,
    targetFile: dep.to,
    importedName: 'default',
    type: 'MISSING_DEFAULT_EXPORT',
    severity: 'critical',
    reason: `'${dep.to}' has no default export`,
    suggestion: 'Add a default export or change to a named import'
  };
}

function createMissingNamedExportIssue(dep, importedName) {
  return {
    sourceFile: dep.from,
    targetFile: dep.to,
    importedName,
    type: 'MISSING_NAMED_EXPORT',
    severity: 'warning',
    reason: `'${importedName}' is not exported by '${dep.to}'`,
    suggestion: `Check if '${importedName}' was renamed, removed, or moved to another module`
  };
}

function analyzeDependencySymbols(dep, targetExports) {
  const issues = [];

  for (const sym of (dep.symbols || [])) {
    if (!sym || typeof sym !== 'object' || !sym.type || sym.type === 'namespace') {
      continue;
    }

    if (sym.type === 'default') {
      if (!targetExports.hasDefault) {
        issues.push(createMissingDefaultExportIssue(dep));
      }
      continue;
    }

    if (sym.type === 'named' && sym.imported && !targetExports.names.has(sym.imported)) {
      issues.push(createMissingNamedExportIssue(dep, sym.imported));
    }
  }

  return issues;
}

function collectBrokenImportIssues(systemMap, fileExports) {
  const broken = [];

  for (const dep of (systemMap.dependencies || [])) {
    const targetExports = fileExports.get(dep.to);
    if (!targetExports) continue;

    broken.push(...analyzeDependencySymbols(dep, targetExports));
  }

  return broken;
}

function normalizeStructuralIssue(issue) {
  return {
    sourceFile: issue.sourceFile || issue.file,
    targetFile: issue.workerPath || issue.importPath || null,
    importedName: issue.functionName || null,
    type: issue.type,
    severity: issue.severity === 'HIGH' ? 'critical' : 'warning',
    reason: issue.reason,
    suggestion: issue.suggestion
  };
}

function summarizeBrokenIssues(broken, structural) {
  const critical = broken.filter((issue) => issue.severity === 'critical').length;
  const warnings = broken.filter((issue) => issue.severity === 'warning').length;
  const missingExports = broken.filter(
    (issue) => issue.type === 'MISSING_NAMED_EXPORT' || issue.type === 'MISSING_DEFAULT_EXPORT'
  ).length;

  return {
    total: broken.length,
    critical,
    warnings,
    missingExports,
    structuralIssues: structural.summary.total
  };
}

/**
 * Analiza el systemMap en busca de conexiones rotas.
 *
 * @param {Object} systemMap - Mapa del sistema (archivos, imports, exports, dependencies)
 * @param {Object} advancedConnections - Conexiones avanzadas (workers, URLs, etc.)
 * @returns {{ summary: Object, broken: Array, metadata: Object }}
 */
export function analyzeBrokenConnections(systemMap, advancedConnections) {
  if (!systemMap) {
    return {
      summary: { total: 0, critical: 0, warnings: 0 },
      broken: [],
      metadata: { analyzedAt: new Date().toISOString(), status: 'ok' }
    };
  }

  const fileExports = buildFileExportMap(systemMap);
  const broken = collectBrokenImportIssues(systemMap, fileExports);

  const detector = new BrokenConnectionsDetector();
  const structural = detector.analyze(systemMap, advancedConnections);

  for (const issue of (structural.all || [])) {
    broken.push(normalizeStructuralIssue(issue));
  }

  return {
    summary: summarizeBrokenIssues(broken, structural),
    broken,
    metadata: {
      analyzedAt: new Date().toISOString(),
      filesAnalyzed: Object.keys(systemMap.files || {}).length,
      status: 'ok'
    }
  };
}
