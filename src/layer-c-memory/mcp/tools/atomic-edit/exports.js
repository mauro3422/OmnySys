/**
 * @fileoverview Extracción y validación de exports
 */

import path from 'path';
import { createLogger } from '../../../../utils/logger.js';
import { getAllAtoms } from '#layer-c/storage/index.js';

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
 * Extrae exports de un string de código
 */
export function extractExportsFromCode(code) {
  const exports = [];
  
  const exportFunctionRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
  let match;
  while ((match = exportFunctionRegex.exec(code)) !== null) {
    exports.push({ type: 'function', name: match[1] });
  }
  
  const exportConstRegex = /export\s+const\s+(\w+)/g;
  while ((match = exportConstRegex.exec(code)) !== null) {
    exports.push({ type: 'const', name: match[1] });
  }
  
  const exportClassRegex = /export\s+(?:default\s+)?class\s+(\w+)/g;
  while ((match = exportClassRegex.exec(code)) !== null) {
    exports.push({ type: 'class', name: match[1] });
  }
  
  const exportNamedRegex = /export\s*{\s*([^}]+)\s*}/g;
  while ((match = exportNamedRegex.exec(code)) !== null) {
    const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim());
    for (const name of names) {
      if (name) exports.push({ type: 'named', name });
    }
  }
  
  return exports;
}

/**
 * Verifica si los exports del nuevo código colisionan con existentes
 */
export async function checkExportConflictsInGraph(exports, projectPath) {
  const conflicts = [];
  
  try {
    const allAtoms = await getAllAtoms(projectPath);
    
    for (const exportItem of exports) {
      const existing = allAtoms.filter(atom => 
        atom.name === exportItem.name && atom.isExported
      );
      
      if (existing.length > 0) {
        conflicts.push({
          name: exportItem.name,
          type: exportItem.type,
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
    
    const allAtoms = await getAllAtoms(projectPath);
    const exportsToCheck = [...addedExports, ...conflicts.renamedExports.map(r => ({ name: r.to, type: r.type }))];
    
    for (const exportItem of exportsToCheck) {
      const existing = allAtoms.filter(atom => 
        atom.name === exportItem.name && 
        atom.isExported &&
        !filePath.includes(atom.filePath)
      );
      
      if (existing.length > 0) {
        const critical = existing.filter(e => (e.calledBy?.length || 0) > 0);
        
        conflicts.globalConflicts.push({
          name: exportItem.name,
          type: exportItem.type,
          isNew: addedExports.some(ae => ae.name === exportItem.name),
          isRename: conflicts.renamedExports.some(re => re.to === exportItem.name),
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
