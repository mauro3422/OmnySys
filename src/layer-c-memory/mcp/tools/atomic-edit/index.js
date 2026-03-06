/**
 * @fileoverview atomic-edit - Entry Point
 *
 * MCP Tool: atomic_edit + atomic_write
 * Edita y crea archivos con validacion atomica completa usando el grafo
 *
 * Modularizado desde atomic-edit.js (1616 lineas -> 7 archivos)
 */

import { createLogger } from '../../../utils/logger.js';
import { validateBeforeEdit } from '#layer-c/mcp/core/validation-utils.js';
import { loadAtoms } from '#layer-c/storage/index.js';

import { checkEditExportConflicts } from './exports.js';
import { validateImportsInEdit } from './validators.js';
import { analyzeBlastRadius } from './graph-alerts.js';
import { AnalysisEngine } from '#layer-c/mcp/core/shared/analysis-engine.js';
import { atomic_write } from './atomic-writer-tool.js';
import { atomic_edit } from './atomic-editor-tool.js';

const logger = createLogger('OmnySys:atomic:edit:tool');

/**
 * Realiza todas las validaciones previas al edit (importaciones, exportaciones, etc.)
 */
async function performPreEditValidation(filePath, oldString, newString, symbolName, projectPath) {
  try {
    const validation = await validateBeforeEdit({ filePath, symbolName: symbolName || null, projectPath });
    if (!validation.valid) {
      return { error: 'VALIDATION_FAILED', message: 'Pre-edit validation failed', errors: validation.errors };
    }

    const blastRadius = await analyzeBlastRadius(filePath, projectPath, symbolName);
    const atoms = (await loadAtoms(projectPath, filePath)) || [];
    const healthAudit = await AnalysisEngine.auditHealth(filePath, projectPath, atoms);
    const solidViolations = healthAudit.violations;

    const brokenImports = await validateImportsInEdit(filePath, newString, projectPath);
    if (brokenImports.length > 0) {
      return { error: 'BROKEN_IMPORTS', message: `Found ${brokenImports.length} broken imports`, brokenImports };
    }

    const exportConflicts = await checkEditExportConflicts(oldString, newString, filePath, projectPath);
    if (exportConflicts.globalConflicts.some(c => c.isCritical)) {
      return {
        error: 'EXPORT_DUPLICATE_CONFLICT',
        message: 'Critical export conflict detected',
        conflicts: exportConflicts.globalConflicts.filter(c => c.isCritical)
      };
    }

    return { valid: true, exportConflicts, blastRadius, solidViolations };
  } catch (error) {
    logger.error(`Pre-edit validation failed for ${filePath}: ${error.message}`);
    return {
      error: 'PRE_EDIT_VALIDATION_RUNTIME_FAILURE',
      message: error.message
    };
  }
}

void performPreEditValidation;

export { atomic_edit, atomic_write };
export default { atomic_edit, atomic_write };
