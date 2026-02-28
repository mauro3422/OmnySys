/**
 * @fileoverview atomic-edit - Entry Point
 * 
 * MCP Tool: atomic_edit + atomic_write
 * Edita y crea archivos con validación atómica completa usando el grafo
 * 
 * Modularizado desde atomic-edit.js (1616 líneas → 7 archivos)
 */

import path from 'path';
import { getAtomicEditor } from '#core/atomic-editor/index.js';
import { createLogger } from '../../../utils/logger.js';
import { validateBeforeEdit, validateBeforeWrite } from '#layer-c/mcp/core/validation-utils.js';
import { getAllAtoms, loadAtoms, enrichAtomsWithRelations } from '#layer-c/storage/index.js';

import { reindexFile } from './reindex.js';
import { findAtomsByName, findCallersEfficient } from './search.js';
import { extractImportsFromCode, extractExportsFromCode, checkExportConflictsInGraph, checkEditExportConflicts } from './exports.js';
import { validateImportsInEdit, validatePostEditOptimized } from './validators.js';
import { analyzeFullImpact, analyzeNamespaceRisk } from './analysis.js';
import { generateRefactoringSuggestionsOptimized } from './refactoring.js';
import { analyzeBlastRadius } from './graph-alerts.js';
import { AnalysisEngine } from '#layer-c/mcp/core/shared/analysis-engine.js';
import { atomic_write } from './atomic-writer-tool.js';
import { atomic_edit } from './atomic-editor-tool.js';
import {
  normalizeAtomicPath,
  performPreWriteValidation,
  analyzeExports,
  computeWriteImpact
} from './write-orchestrator.js';

const logger = createLogger('OmnySys:atomic:edit:tool');

/**
 * Valida sintaxis del código usando Tree-Sitter
 */


/**
 * Valida los argumentos de entrada para atomic_edit
 */
function validateEditArgs(args, projectPath) {
  const { filePath, oldString, newString, symbolName } = args;

  if (!projectPath) {
    return { error: 'MISSING_PROJECT_PATH', message: 'projectPath not provided in context' };
  }

  if (!filePath || (!oldString && !symbolName) || newString === undefined) {
    return {
      error: 'INVALID_PARAMS',
      message: 'Missing required: filePath, newString, and (oldString OR symbolName)'
    };
  }

  return null;
}

/**
 * Realiza todas las validaciones previas al edit (importaciones, exportaciones, etc.)
 */
async function performPreEditValidation(filePath, oldString, newString, symbolName, projectPath) {
  // 1. Validación base de estado
  const validation = await validateBeforeEdit({ filePath, symbolName: symbolName || null, projectPath });
  if (!validation.valid) {
    return { error: 'VALIDATION_FAILED', message: 'Pre-edit validation failed', errors: validation.errors };
  }

  // 2. Blast Radius & SOLID Detection (Unificado en Fase 9)
  const blastRadius = await analyzeBlastRadius(filePath, projectPath, symbolName);
  const atoms = (await loadAtoms(projectPath, filePath)) || [];
  const healthAudit = await AnalysisEngine.auditHealth(filePath, projectPath, atoms);
  const solidViolations = healthAudit.violations;

  // 3. Validación de importaciones rotas
  const brokenImports = await validateImportsInEdit(filePath, newString, projectPath);
  if (brokenImports.length > 0) {
    return { error: 'BROKEN_IMPORTS', message: `Found ${brokenImports.length} broken imports`, brokenImports };
  }

  // 4. Conflictos de exports
  const exportConflicts = await checkEditExportConflicts(oldString, newString, filePath, projectPath);
  if (exportConflicts.globalConflicts.some(c => c.isCritical)) {
    return {
      error: 'EXPORT_DUPLICATE_CONFLICT',
      message: 'Critical export conflict detected',
      conflicts: exportConflicts.globalConflicts.filter(c => c.isCritical)
    };
  }

  return { valid: true, exportConflicts, blastRadius, solidViolations };
}





export { atomic_edit, atomic_write };
export default { atomic_edit, atomic_write };
