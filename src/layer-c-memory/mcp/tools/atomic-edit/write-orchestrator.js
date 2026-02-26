/**
 * @fileoverview Orquestador para la operación atomic_write
 */

import path from 'path';
import fs from 'fs';
import { getAtomicEditor } from '#core/atomic-editor/index.js';
import { reindexFile } from './reindex.js';
import { extractExportsFromCode, checkExportConflictsInGraph } from './exports.js';
import { validateImportsInEdit } from './validators.js';
import { analyzeFullImpact, analyzeNamespaceRisk } from './analysis.js';
import { generateRefactoringSuggestionsOptimized } from './refactoring.js';
import { validateBeforeWrite } from '../../core/validation-utils.js';
import { getAllAtoms, loadAtoms, enrichAtomsWithRelations } from '#layer-c/storage/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:atomic:write:orchestrator');

/**
 * Normaliza la ruta del archivo específicamente para herramientas atómicas
 */
export function normalizeAtomicPath(filePath, projectPath) {
  if (path.isAbsolute(filePath)) {
    return path.relative(projectPath, filePath).replace(/\\/g, '/');
  }
  return filePath;
}

/**
 * Valida sintaxis del código usando Tree-Sitter
 */
export async function validateAtomicSyntax(code, filePath = 'temp.js') {
  try {
    const { getTree } = await import('#layer-a/parser/index.js');
    const tree = await getTree(filePath, code);

    if (tree && tree.rootNode && tree.rootNode.hasError) {
      return {
        valid: false,
        error: 'Sintaxis inválida (Tree-sitter reportó nodos ERROR)'
      };
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Realiza validaciones pre-vuelo para escritura
 */
export async function performPreWriteValidation(filePath, content, projectPath) {
  const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);
  
  // 1. Validación base
  const validation = await validateBeforeWrite({ filePath });
  if (!validation.valid) {
    return { error: 'VALIDATION_FAILED', validation };
  }

  // 2. Importaciones
  const brokenImports = await validateImportsInEdit(filePath, content, projectPath);
  if (brokenImports.length > 0) {
    return { error: 'BROKEN_IMPORTS', brokenImports };
  }

  // 3. Sintaxis
  const syntaxCheck = await validateAtomicSyntax(content, filePath);
  if (!syntaxCheck.valid) {
    return { error: 'SYNTAX_ERROR', syntaxCheck };
  }

  return { valid: true, absoluteFilePath };
}

/**
 * Analiza exportaciones y riesgos de namespace
 */
export async function analyzeExports(content, filePath, projectPath) {
  const exports = extractExportsFromCode(content);
  const conflicts = await checkExportConflictsInGraph(exports, projectPath, filePath);
  
  const critical = conflicts.filter(c =>
    c.existingLocations.some(loc => loc.calledBy > 5) || filePath.endsWith('index.js')
  );

  const namespaceRisk = await analyzeNamespaceRisk(content, projectPath);
  const refactoring = await generateRefactoringSuggestionsOptimized(exports, filePath, projectPath);

  return { exports, conflicts, critical, namespaceRisk, refactoring };
}

/**
 * Ejecuta el impacto post-escritura
 */
export async function computeWriteImpact(filePath, projectPath, previousAtoms, reindexResult) {
  try {
    const allAtoms = await getAllAtoms(projectPath);
    const enrichedAtoms = await enrichAtomsWithRelations(allAtoms, { withStats: true }, projectPath);
    return await analyzeFullImpact(filePath, projectPath, previousAtoms, reindexResult.atoms || [], enrichedAtoms);
  } catch (e) {
    logger.warn(`Could not compute impact map: ${e.message}`);
    return null;
  }
}
