/**
 * @fileoverview MCP Tool: split_large_file
 * Divide archivos grandes en múltiples archivos usando patrón coordinador/barrel.
 *
 * @module layer-c-memory/mcp/tools/split-large-file
 */

import { createLogger } from '../../../utils/logger.js';
import { getRepository } from '../../storage/repository/repository-factory.js';
import { atomic_write, atomic_edit } from './atomic-edit/index.js';
import {
  groupAtomsByResponsibility,
  extractImports,
  buildSplitPlan
} from '../../../shared/compiler/split-large-file-helpers.js';

const logger = createLogger('OmnySys:mcp:split_large_file');

/**
 * Analiza un archivo y extrae información para división
 */
async function analyzeFileForSplit(filePath, projectPath) {
  const repo = getRepository(projectPath);
  if (!repo?.db) {
    throw new Error('Repository not available');
  }

  // Obtener átomos del archivo
  const atoms = repo.db.prepare(`
    SELECT id, name, file_path, atom_type, line_start, line_end,
           lines_of_code, is_exported, complexity, dna_json
    FROM atoms
    WHERE file_path = ? AND (is_removed IS NULL OR is_removed = 0)
    ORDER BY line_start
  `).all(filePath);

  if (atoms.length === 0) {
    throw new Error(`No atoms found in ${filePath}`);
  }

  // Leer contenido del archivo
  const fs = await import('fs/promises');
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  // Extraer imports del archivo
  const imports = extractImports(content);

  // Agrupar átomos por responsabilidad (usando helpers del compiler)
  const groups = groupAtomsByResponsibility(atoms, content, lines);

  return {
    filePath,
    totalLines: lines.length,
    totalAtoms: atoms.length,
    atoms,
    imports,
    groups,
    content,
    lines
  };
}

/**
 * Ejecuta el plan de división
 */
async function executeSplitPlan(plan, context) {
  const { projectPath } = context;

  const results = {
    createdFiles: [],
    modifiedFiles: [],
    rewrittenImports: []
  };

  // 1. Crear archivos nuevos
  for (const group of plan.groups) {
    logger.info(`[Split] Creating file: ${group.newFilePath}`);

    const writeResult = await atomic_write({
      filePath: group.newFilePath,
      content: group.content
    }, context);

    if (!writeResult.success) {
      return {
        success: false,
        error: `Failed to create ${group.newFilePath}: ${writeResult.error}`,
        results
      };
    }

    results.createdFiles.push({
      path: group.newFilePath,
      exports: group.exports
    });
  }

  // 2. Convertir archivo original en barrel
  logger.info(`[Split] Converting original to barrel: ${plan.originalFile}`);

  const editResult = await atomic_edit({
    filePath: plan.originalFile,
    oldString: plan.originalContent,
    newString: plan.barrel.content
  }, context);

  if (!editResult.success) {
    return {
      success: false,
      error: `Failed to convert to barrel: ${editResult.error}`,
      results
    };
  }

  results.modifiedFiles.push(plan.originalFile);

  return {
    success: true,
    mode: 'applied',
    plan,
    results
  };
}

/**
 * Función principal MCP
 */
export async function split_large_file(args, context) {
  const {
    filePath,
    execute = false,
    groupBy = 'responsibility',
    maxLinesPerFile = 250,
    barrelStyle = 're-export'
  } = args;
  const { projectPath } = context;

  if (!filePath) {
    return { success: false, error: 'Missing required parameter: filePath' };
  }

  try {
    // 1. Analizar archivo
    logger.info(`[Split] Analyzing file: ${filePath}`);
    const analysis = await analyzeFileForSplit(filePath, projectPath);

    if (analysis.totalLines < 300) {
      return {
        success: false,
        error: `File is only ${analysis.totalLines} lines (threshold: 300). No split needed.`
      };
    }

    // 2. Construir plan (usando helpers del compiler)
    const plan = buildSplitPlan(analysis, { maxLinesPerFile, barrelStyle });

    if (!plan.shouldSplit) {
      return {
        success: false,
        error: plan.reason || 'File cannot be split meaningfully'
      };
    }

    // 3. Preview o ejecutar
    if (!execute) {
      return {
        success: true,
        mode: 'preview',
        plan,
        analysis: {
          totalLines: analysis.totalLines,
          totalAtoms: analysis.totalAtoms,
          groupsFound: plan.groups.length
        }
      };
    }

    // 4. Ejecutar
    return await executeSplitPlan(plan, context);

  } catch (error) {
    logger.error(`[Split] Failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { split_large_file };