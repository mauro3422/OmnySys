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
import { validateBeforeEdit, validateBeforeWrite } from '../../core/validation-utils.js';
import { getAllAtoms, loadAtoms, enrichAtomsWithRelations } from '#layer-c/storage/index.js';

// Módulos internos
import { reindexFile } from './reindex.js';
import { findAtomsByName, findCallersEfficient } from './search.js';
import { extractImportsFromCode, extractExportsFromCode, checkExportConflictsInGraph, checkEditExportConflicts } from './exports.js';
import { validateImportsInEdit, validatePostEditOptimized } from './validators.js';
import { analyzeFullImpact, analyzeNamespaceRisk } from './analysis.js';
import { generateRefactoringSuggestionsOptimized } from './refactoring.js';

const logger = createLogger('OmnySys:atomic:edit:tool');

/**
 * Valida sintaxis del código usando Tree-Sitter
 */
async function validateSyntax(code, filePath = 'temp.js') {
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
    return {
      valid: false,
      error: error.message
    };
  }
}

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

  // 2. Validación de importaciones rotas
  const brokenImports = await validateImportsInEdit(filePath, newString, projectPath);
  if (brokenImports.length > 0) {
    return { error: 'BROKEN_IMPORTS', message: `Found ${brokenImports.length} broken imports`, brokenImports };
  }

  // 3. Conflictos de exports
  const exportConflicts = await checkEditExportConflicts(oldString, newString, filePath, projectPath);
  if (exportConflicts.globalConflicts.some(c => c.isCritical)) {
    return {
      error: 'EXPORT_DUPLICATE_CONFLICT',
      message: 'Critical export conflict detected',
      conflicts: exportConflicts.globalConflicts.filter(c => c.isCritical)
    };
  }

  return { valid: true, exportConflicts };
}

/**
 * Tool: atomic_edit
 * Edita un archivo con validación atómica completa
 * REFACTORIZADO: Grado A de mantenibilidad
 */
export async function atomic_edit(args, context) {
  const { filePath, oldString, newString, symbolName } = args;
  const { orchestrator, projectPath } = context;

  // 1. Validación de entrada
  const argError = validateEditArgs(args, projectPath);
  if (argError) return { ...argError, file: filePath, severity: 'critical' };

  logger.info(`[Tool] atomic_edit("${filePath}", symbol: ${symbolName || 'none'})`);

  let previousAtoms = [];
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);
    const relativePath = path.relative(projectPath, absolutePath);
    previousAtoms = await loadAtoms(projectPath, relativePath);
  } catch (e) {
    logger.warn(`[PreEdit] Could not load previous atoms: ${e.message}`);
  }

  try {
    // 2. Validaciones pre-vuelo
    const preValidation = await performPreEditValidation(filePath, oldString, newString, symbolName, projectPath);
    if (preValidation.error) return { ...preValidation, file: filePath, severity: 'critical', canProceed: false };

    // 3. Ejecución del Edit
    const atomicEditor = orchestrator?.atomicEditor || getAtomicEditor(projectPath, orchestrator);
    const editResult = await atomicEditor.edit(filePath, oldString, newString, { symbolName });
    if (!editResult.success) throw new Error(editResult.error || 'Edit operation failed');

    // 4. Re-indexado y Post-Validación
    const reindexResult = await reindexFile(filePath, projectPath);
    if (!reindexResult.success) {
      await atomicEditor.undo(filePath, editResult.undoData);
      return { error: 'REINDEX_FAILED', message: reindexResult.error, file: filePath, rolledBack: true };
    }

    const postValidation = await validatePostEditOptimized(filePath, projectPath, previousAtoms, reindexResult.atoms);
    if (!postValidation.valid) {
      await atomicEditor.undo(filePath, editResult.undoData);
      await reindexFile(filePath, projectPath);
      return {
        error: 'POST_EDIT_VALIDATION_FAILED',
        message: 'Edit broke dependencies, rolled back',
        file: filePath,
        errors: postValidation.errors,
        rolledBack: true
      };
    }

    // 5. Análisis de Impacto y Respuesta
    const allAtoms = await getAllAtoms(projectPath);
    const enrichedAtoms = await enrichAtomsWithRelations(allAtoms, { withStats: true }, projectPath);
    const impact = await analyzeFullImpact(filePath, projectPath, previousAtoms, reindexResult.atoms, enrichedAtoms);

    return {
      success: true,
      file: filePath,
      message: `✅ Atomic edit successful`,
      impact: {
        level: impact.level,
        score: impact.score,
        affectedFiles: impact.affectedFiles.size,
        reindexedAtoms: reindexResult.atoms?.length || 0
      },
      changes: impact.dependencyTree.map(tree => ({
        function: tree.name,
        changes: tree.changes,
        dependentsCount: tree.dependents.length
      })),
      warnings: preValidation.exportConflicts.warnings.length > 0 ? preValidation.exportConflicts.warnings : undefined
    };

  } catch (error) {
    logger.error(`[Tool] atomic_edit failed: ${error.message}`);
    return {
      error: error.message.includes('Syntax') ? 'SYNTAX_ERROR' : 'EXECUTION_ERROR',
      message: error.message,
      file: filePath,
      severity: 'critical'
    };
  }
}

/**
 * Tool: atomic_write
 * Escribe un archivo nuevo con validación atómica mejorada
 */
export async function atomic_write(args, context) {
  const { filePath, content } = args;
  const { orchestrator, projectPath } = context;

  logger.info(`[Tool] atomic_write("${filePath}")`);

  if (!filePath || !content) {
    return {
      error: 'Missing required parameters: filePath, content'
    };
  }

  try {
    const validation = await validateBeforeWrite({ filePath });
    if (!validation.valid) {
      return {
        error: 'VALIDATION_FAILED',
        message: 'Pre-write validation failed',
        file: filePath,
        errors: validation.errors,
        warnings: validation.warnings
      };
    }

    const brokenImports = await validateImportsInEdit(filePath, content, projectPath);
    if (brokenImports.length > 0) {
      return {
        error: 'BROKEN_IMPORTS',
        message: `Found ${brokenImports.length} broken imports in the new file`,
        file: filePath,
        brokenImports
      };
    }

    const syntaxCheck = await validateSyntax(content, filePath);
    if (!syntaxCheck.valid) {
      return {
        error: 'SYNTAX_ERROR',
        message: `Syntax error in new file: ${syntaxCheck.error}`,
        file: filePath,
        line: syntaxCheck.line,
        column: syntaxCheck.column,
        canProceed: false
      };
    }

    const exports = extractExportsFromCode(content);
    const exportConflicts = await checkExportConflictsInGraph(exports, projectPath);

    if (exportConflicts.length > 0) {
      const criticalConflicts = exportConflicts.filter(c =>
        c.existingLocations.some(loc => loc.calledBy > 0)
      );

      if (criticalConflicts.length > 0) {
        return {
          error: 'EXPORT_CONFLICT',
          message: `Found ${criticalConflicts.length} critical export conflicts`,
          file: filePath,
          conflicts: criticalConflicts,
          severity: 'critical',
          canProceed: false
        };
      }

      logger.warn(`[atomic_write] ${exportConflicts.length} non-critical export conflicts`);
    }

    const namespaceRisk = await analyzeNamespaceRisk(content, projectPath);

    if (namespaceRisk.level === 'high') {
      return {
        error: 'HIGH_NAMESPACE_RISK',
        message: `High namespace risk detected: ${namespaceRisk.warnings.length} warnings`,
        file: filePath,
        risk: namespaceRisk,
        severity: 'high',
        canProceed: false,
        suggestion: 'Consider renaming exports to avoid confusion'
      };
    }

    const refactoringSuggestions = await generateRefactoringSuggestionsOptimized(
      exports,
      filePath,
      projectPath
    );

    const atomicEditor = orchestrator?.atomicEditor || getAtomicEditor(projectPath, orchestrator);
    await atomicEditor.write(filePath, content);

    const reindexResult = await reindexFile(filePath, projectPath);

    const response = {
      success: true,
      file: filePath,
      message: `✅ Atomic write successful`,
      reindexed: reindexResult.success,
      atomsCount: reindexResult.atoms?.length || 0,
      validation: {
        syntax: true,
        imports: true,
        exports: {
          count: exports.length,
          conflicts: exportConflicts.length,
          hasCriticalConflicts: exportConflicts.some(c =>
            c.existingLocations.some(loc => loc.calledBy > 0)
          )
        },
        namespaceRisk: {
          level: namespaceRisk.level,
          score: namespaceRisk.score,
          warningCount: namespaceRisk.warnings.length
        }
      }
    };

    if (exportConflicts.length > 0 || namespaceRisk.warnings.length > 0) {
      response.warnings = [];

      if (exportConflicts.length > 0) {
        response.warnings.push(`⚠️ ${exportConflicts.length} export name(s) already exist in other files`);
      }

      if (namespaceRisk.warnings.length > 0) {
        response.warnings.push(...namespaceRisk.warnings.map(w => w.message));
      }
    }

    if (refactoringSuggestions.duplicates.length > 0) {
      response.refactoring = {
        canConsolidate: refactoringSuggestions.canConsolidate,
        totalSavings: refactoringSuggestions.totalSavings,
        duplicates: refactoringSuggestions.duplicates.map(d => ({
          name: d.name,
          occurrences: d.occurrenceCount,
          potentialSavings: `${d.potentialSavings} LOC`,
          bestCandidate: d.bestConsolidationCandidate,
          riskLevel: d.riskLevel
        })),
        recommendedActions: refactoringSuggestions.recommendedActions,
        codeExamples: refactoringSuggestions.codeExamples
      };

      if (!response.warnings) response.warnings = [];
      response.warnings.push(
        `💡 ${refactoringSuggestions.duplicates.length} function(s) can be consolidated from ${refactoringSuggestions.totalSavings.files} files (save ~${refactoringSuggestions.totalSavings.lines} LOC)`,
        `📋 Check response.refactoring for detailed suggestions`
      );
    }

    return response;

  } catch (error) {
    return {
      error: error.message,
      file: filePath
    };
  }
}

export default { atomic_edit, atomic_write };
