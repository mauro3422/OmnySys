/**
 * @fileoverview Extracción y validación de exports
 */

import { createLogger } from '../../../../utils/logger.js';
import { getAtomsByName } from '#layer-c/storage/index.js';
import { summarizeAtomTestability } from '../../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:atomic:exports');

/**
 * Extrae imports de un string de código
 */
export function extractImportsFromCode(code) {
  const imports = [];
  const importRegex = /import\s+(?:{[^}]+}|[^'"]+)?\s*from\s+['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1] || match[2]);
  }
  return imports;
}

/**
 * Extrae importaciones y re-exportaciones de módulos desde un string de código.
 * Se usa para mover/renombrar archivos que también están referenciados por barrels.
 */
export function extractModuleDependencySourcesFromCode(code) {
  const sources = new Set(extractImportsFromCode(code));
  const exportRegex = /export\s+(?:\*|\{[\s\S]*?\})\s+from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = exportRegex.exec(code)) !== null) {
    const source = match[1];
    if (source) {
      sources.add(source);
    }
  }

  return Array.from(sources);
}

/**
 * Extrae exports de un string de código
 */
function appendNamedExports(exports, rawNames) {
  const names = rawNames
    .split(',')
    .map((name) => name.trim().split(/\s+as\s+/)[0].trim())
    .filter(Boolean);

  for (const name of names) {
    exports.push({ type: 'named', name });
  }
}

/**
 * Extrae exports de un string de código
 */
export function extractExportsFromCode(code) {
  const exports = [];
  const exportRegex = /export\s+(?:async\s+)?function\s+(\w+)|export\s+const\s+(\w+)|export\s+(?:default\s+)?class\s+(\w+)|export\s*{\s*([^}]+)\s*}/g;

  let match;
  while ((match = exportRegex.exec(code)) !== null) {
    if (match[1]) {
      exports.push({ type: 'function', name: match[1] });
      continue;
    }

    if (match[2]) {
      exports.push({ type: 'const', name: match[2] });
      continue;
    }

    if (match[3]) {
      exports.push({ type: 'class', name: match[3] });
      continue;
    }

    if (match[4]) {
      appendNamedExports(exports, match[4]);
    }
  }

  return exports;
}

/**
 * Verifica si los exports del nuevo código colisionan con existentes
 */
export async function checkExportConflictsInGraph(exports, projectPath, excludePath = null) {
  const conflicts = [];

  try {
    for (const exportItem of exports) {
      const candidates = await getAtomsByName(projectPath, exportItem.name);
      const existing = candidates.filter(atom =>
        atom.name === exportItem.name &&
        atom.isExported &&
        (!excludePath || !excludePath.includes(atom.filePath))
      );

      if (existing.length > 0) {
        const testability = summarizeAtomTestability(existing);
        conflicts.push({
          name: exportItem.name,
          type: exportItem.type,
          testability,
          existingLocations: existing.map(e => ({
            filePath: e.filePath,
            line: e.line,
            complexity: e.complexity,
            calledBy: e.calledBy?.length || 0
          }))
        });
      }
    }
  } catch (error) {
    logger.warn(`[CheckExports] Error checking conflicts: ${error.message}`);
  }

  return conflicts;
}

/**
 * Verifica si la edición crearía duplicados de exports en el grafo global
 */
export async function checkEditExportConflicts(oldString, newString, filePath, projectPath) {
  const conflicts = {
    newExports: [],
    renamedExports: [],
    globalConflicts: [],
    warnings: []
  };

  try {
    const oldExports = extractExportsFromCode(oldString);
    const newExports = extractExportsFromCode(newString);

    const addedExports = newExports.filter(ne =>
      !oldExports.some(oe => oe.name === ne.name)
    );

    if (oldExports.length > 0 && newExports.length > 0) {
      const removedFromOld = oldExports.filter(oe =>
        !newExports.some(ne => ne.name === oe.name)
      );

      if (removedFromOld.length === 1 && addedExports.length === 1) {
        conflicts.renamedExports.push({
          from: removedFromOld[0].name,
          to: addedExports[0].name,
          type: removedFromOld[0].type
        });
      }
    }

    conflicts.newExports = addedExports;

    const exportsToCheck = [...addedExports, ...conflicts.renamedExports.map(r => ({ name: r.to, type: r.type }))];

    for (const exportItem of exportsToCheck) {
      const candidates = await getAtomsByName(projectPath, exportItem.name);
      const existing = candidates.filter(atom =>
        atom.name === exportItem.name &&
        atom.isExported &&
        !filePath.includes(atom.filePath)
      );

      if (existing.length > 0) {
        const critical = existing.filter(e => (e.calledBy?.length || 0) > 0);
        const testability = summarizeAtomTestability(existing);

        conflicts.globalConflicts.push({
          name: exportItem.name,
          type: exportItem.type,
          isNew: addedExports.some(ae => ae.name === exportItem.name),
          isRename: conflicts.renamedExports.some(re => re.to === exportItem.name),
          testability,
          existingLocations: existing.map(e => ({
            filePath: e.filePath,
            line: e.line,
            calledBy: e.calledBy?.length || 0
          })),
          isCritical: critical.length > 0
        });

        if (critical.length > 0) {
          conflicts.warnings.push(`❌ CRITICAL: "${exportItem.name}" already exists and is used by ${critical[0].calledBy?.length || 0} callers`);
        } else {
          conflicts.warnings.push(`⚠️ WARNING: "${exportItem.name}" already exists in ${existing.length} location(s)`);
        }
      }
    }

  } catch (error) {
    logger.warn(`[CheckEditConflicts] Error: ${error.message}`);
  }

  return conflicts;
}
