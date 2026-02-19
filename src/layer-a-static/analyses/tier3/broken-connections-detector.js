/**
 * @fileoverview broken-connections-detector.js
 *
 * Detecta conexiones rotas entre módulos:
 * - Named imports cuyo símbolo no está exportado por el archivo fuente
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

    // 1. Exports declarados en el nodo del archivo (parsed exports)
    for (const exp of (fileNode.exports || [])) {
      if (exp.type === 'default') {
        hasDefault = true;
      } else if (exp.name) {
        names.add(exp.name);
      }
    }

    // 2. Funciones marcadas como exportadas en el functions index
    for (const func of (systemMap.functions?.[filePath] || [])) {
      if (func.isExported && func.name) {
        names.add(func.name);
      }
    }

    // 3. Barrel exports: re-exports visibles desde este archivo
    for (const exportName of Object.keys(systemMap.exportIndex?.[filePath] || {})) {
      names.add(exportName);
    }

    fileExports.set(filePath, { names, hasDefault });
  }

  return fileExports;
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

  const broken = [];

  // ─────────────────────────────────────────────
  // 1. Symbol-level: cross imports vs exports
  // ─────────────────────────────────────────────
  const fileExports = buildFileExportMap(systemMap);

  for (const dep of (systemMap.dependencies || [])) {
    const targetExports = fileExports.get(dep.to);
    if (!targetExports) continue; // archivo destino fuera del grafo — tier2 lo maneja

    for (const sym of (dep.symbols || [])) {
      // Aceptar solo objetos con campo 'type' (specifier objects)
      if (!sym || typeof sym !== 'object' || !sym.type) continue;

      if (sym.type === 'namespace') {
        // import * as X — importa todo, no se puede validar símbolo a símbolo
        continue;
      }

      if (sym.type === 'default') {
        if (!targetExports.hasDefault) {
          broken.push({
            sourceFile: dep.from,
            targetFile: dep.to,
            importedName: 'default',
            type: 'MISSING_DEFAULT_EXPORT',
            severity: 'critical',
            reason: `'${dep.to}' has no default export`,
            suggestion: 'Add a default export or change to a named import'
          });
        }
      } else if (sym.type === 'named' && sym.imported) {
        if (!targetExports.names.has(sym.imported)) {
          broken.push({
            sourceFile: dep.from,
            targetFile: dep.to,
            importedName: sym.imported,
            type: 'MISSING_NAMED_EXPORT',
            severity: 'warning',
            reason: `'${sym.imported}' is not exported by '${dep.to}'`,
            suggestion: `Check if '${sym.imported}' was renamed, removed, or moved to another module`
          });
        }
      }
    }
  }

  // ─────────────────────────────────────────────
  // 2. Structural: workers, dynamic imports,
  //    duplicate functions, dead code, suspicious URLs
  // ─────────────────────────────────────────────
  const detector = new BrokenConnectionsDetector();
  const structural = detector.analyze(systemMap, advancedConnections);

  for (const issue of (structural.all || [])) {
    broken.push({
      sourceFile: issue.sourceFile || issue.file,
      targetFile: issue.workerPath || issue.importPath || null,
      importedName: issue.functionName || null,
      type: issue.type,
      severity: issue.severity === 'HIGH' ? 'critical' : 'warning',
      reason: issue.reason,
      suggestion: issue.suggestion
    });
  }

  // ─────────────────────────────────────────────
  // 3. Summary
  // ─────────────────────────────────────────────
  const critical = broken.filter(b => b.severity === 'critical').length;
  const warnings = broken.filter(b => b.severity === 'warning').length;

  return {
    summary: {
      total: broken.length,
      critical,
      warnings,
      missingExports: broken.filter(
        b => b.type === 'MISSING_NAMED_EXPORT' || b.type === 'MISSING_DEFAULT_EXPORT'
      ).length,
      structuralIssues: structural.summary.total
    },
    broken,
    metadata: {
      analyzedAt: new Date().toISOString(),
      filesAnalyzed: Object.keys(systemMap.files || {}).length,
      status: 'ok'
    }
  };
}
