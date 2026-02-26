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

import { reindexFile } from './reindex.js';
import { findAtomsByName, findCallersEfficient } from './search.js';
import { extractImportsFromCode, extractExportsFromCode, checkExportConflictsInGraph, checkEditExportConflicts } from './exports.js';
import { validateImportsInEdit, validatePostEditOptimized } from './validators.js';
import { analyzeFullImpact, analyzeNamespaceRisk } from './analysis.js';
import { generateRefactoringSuggestionsOptimized } from './refactoring.js';
import { analyzeBlastRadius } from './graph-alerts.js';
import { AnalysisEngine } from '../core/shared/analysis-engine.js';
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

/**
 * Tool: atomic_edit
 * Edita un archivo con validación atómica completa
 * REFACTORIZADO: Grado A de mantenibilidad
 */
export async function atomic_edit(args, context) {
  let { filePath, oldString, newString, symbolName } = args;
  const { orchestrator, projectPath } = context;

  // Normalize path to relative explicitly to fix DX absolute path friction
  if (path.isAbsolute(filePath)) {
    filePath = path.relative(projectPath, filePath).replace(/\\/g, '/');
  }

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
        brokenCallers: postValidation.brokenCallers,
        suggestion: `You broke ${postValidation.affectedFiles} file(s) that depend on the modified function signature. See 'brokenCallers' for details.`,
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
      warnings: preValidation.exportConflicts.warnings.length > 0 ? preValidation.exportConflicts.warnings : undefined,
      blastRadius: preValidation.blastRadius,
      solidViolations: Object.values(preValidation.solidViolations).some(v => v !== null) ? preValidation.solidViolations : undefined
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
  let { filePath, content } = args;
  const { orchestrator, projectPath } = context;

  filePath = normalizeAtomicPath(filePath, projectPath);
  logger.info(`[Tool] atomic_write("${filePath}")`);

  if (!filePath || !content) {
    return { error: 'Missing required parameters: filePath, content' };
  }

  try {
    // 1. Cargar estado previo
    let previousAtoms = [];
    try {
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);
      previousAtoms = await loadAtoms(projectPath, path.relative(projectPath, absolutePath));
    } catch (e) { }

    // 2. Validaciones pre-vuelo críticas
    const preRes = await performPreWriteValidation(filePath, content, projectPath);
    if (!preRes.valid) {
      const errorPayload = { file: filePath, canProceed: false };
      if (preRes.error === 'VALIDATION_FAILED') return { ...errorPayload, error: 'VALIDATION_FAILED', message: 'Pre-analysis check failed', errors: preRes.validation.errors };
      if (preRes.error === 'BROKEN_IMPORTS') return { ...errorPayload, error: 'BROKEN_IMPORTS', message: 'Broken imports in new content', brokenImports: preRes.brokenImports };
      if (preRes.error === 'SYNTAX_ERROR') return { ...errorPayload, error: 'SYNTAX_ERROR', message: preRes.syntaxCheck.error };
    }

    // 3. Análisis de Exportaciones y Riesgos
    const analysis = await analyzeExports(content, filePath, projectPath);
    if (analysis.critical.length > 0) {
      return {
        error: 'EXPORT_CONFLICT',
        message: `Found ${analysis.critical.length} extremely critical export conflicts.`,
        suggestion: `Conflict resolving options: 1) Run 'find_symbol_instances' 2) Use 'atomic_edit' if override is intended.`,
        file: filePath,
        conflicts: analysis.critical,
        severity: 'critical',
        canProceed: false
      };
    }

    if (analysis.namespaceRisk.level === 'high') {
      return {
        error: 'HIGH_NAMESPACE_RISK',
        message: 'High namespace risk detected',
        file: filePath,
        risk: analysis.namespaceRisk,
        canProceed: false
      };
    }

    // 4. Persistencia
    const atomicEditor = orchestrator?.atomicEditor || getAtomicEditor(projectPath, orchestrator);
    const fs = await import('fs');
    const dirPath = path.dirname(preRes.absoluteFilePath);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    await atomicEditor.write(filePath, content);
    const reindexResult = await reindexFile(filePath, projectPath);

    // 5. Verificación de Ciclos y Calidad
    const { validateImportsEngine } = await import('../../layer-a-static/analyses/tier3/detectors/import-detector.js');
    const circularCheck = await validateImportsEngine(projectPath, { checkBroken: false, checkUnused: false, checkCircular: true, filePath: preRes.absoluteFilePath });

    // 6. Análisis de Impacto y Respuesta
    const impact = await computeWriteImpact(filePath, projectPath, previousAtoms, reindexResult);

    const response = {
      success: true,
      file: filePath,
      message: `✅ Atomic write successful`,
      impact: impact ? {
        level: impact.level,
        score: impact.score,
        affectedFiles: impact.affectedFiles?.size || 0,
        changes: impact.dependencyTree?.map(tree => ({ function: tree.name, changes: tree.changes, dependentsCount: tree.dependents?.length || 0 })) || []
      } : undefined,
      validation: {
        syntax: true,
        imports: true,
        exports: { count: analysis.exports.length, conflicts: analysis.conflicts.length },
        circular: circularCheck.summary?.totalCircular || 0
      },
      refactoring: analysis.refactoring.duplicates.length > 0 ? analysis.refactoring : undefined
    };

    if (analysis.conflicts.length > 0 || analysis.namespaceRisk.warnings.length > 0) {
      response.warnings = [...(analysis.conflicts.length > 0 ? [`⚠️ ${analysis.conflicts.length} export name(s) already exist`] : []), ...analysis.namespaceRisk.warnings.map(w => w.message)];
    }

    return response;

  } catch (error) {
    logger.error(`[Tool] atomic_write failed: ${error.message}`);
    return { error: error.message, file: filePath };
  }
}

export default { atomic_edit, atomic_write };
