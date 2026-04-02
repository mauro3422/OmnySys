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
} from '../../../shared/compiler/index.js';

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

  // Enriquecer átomos con calls desde call_graph
  const callGraph = repo.db.prepare(`
    SELECT caller_name, callee_name 
    FROM call_graph 
    WHERE caller_file = ? AND callee_file = ?
  `).all(filePath, filePath);

  // Indexar calls por caller_name
  const callsByCaller = new Map();
  for (const rel of callGraph) {
    if (!callsByCaller.has(rel.caller_name)) {
      callsByCaller.set(rel.caller_name, []);
    }
    callsByCaller.get(rel.caller_name).push(rel.callee_name);
  }

  // Agregar campo calls a cada átomo
  for (const atom of atoms) {
    atom.calls = callsByCaller.get(atom.name) || [];
  }

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
 * Ejecuta el plan de división con folderización automática
 * 
 * Crea estructura folderizada:
 *   file/
 *     ├── index.js (barrel)
 *     ├── public.js
 *     └── helpers.js
 * 
 * Y elimina el archivo original.
 */
async function executeSplitPlan(plan, context) {
  const { projectPath } = context;

  const results = {
    createdFiles: [],
    modifiedFiles: [],
    rewrittenImports: []
  };

  // 1. Crear archivos de cada grupo PRIMERO (antes del barrel)
  // Esto es necesario porque el barrel referencia estos archivos
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

  // 2. Crear barrel index.js DESPUÉS de los archivos split
  // Ahora el barrel puede referenciar los archivos que ya existen
  logger.info(`[Split] Creating barrel: ${plan.barrel.filePath}`);
  
  const barrelWriteResult = await atomic_write({
    filePath: plan.barrel.filePath,
    content: plan.barrel.content
  }, context);

  if (!barrelWriteResult.success) {
    return {
      success: false,
      error: `Failed to create barrel ${plan.barrel.filePath}: ${barrelWriteResult.error}`,
      results
    };
  }

  results.createdFiles.push({
    path: plan.barrel.filePath,
    exports: []
  });

  // 3. Eliminar archivo original (ya no es necesario, está folderizado)
  logger.info(`[Split] Removing original file: ${plan.originalFile}`);
  
  const fs = await import('fs/promises');
  try {
    await fs.unlink(plan.originalFile);
    logger.info(`[Split] Original file removed: ${plan.originalFile}`);
  } catch (unlinkError) {
    // Si no se puede eliminar, registrar warning pero no fallar
    logger.warn(`[Split] Could not remove original file: ${unlinkError.message}`);
  }

  return {
    success: true,
    mode: 'applied_folderized',
    plan,
    results,
    folderPath: plan.folderPath,
    summary: {
      originalFile: plan.originalFile,
      folderCreated: plan.folderPath,
      filesCreated: results.createdFiles.length,
      barrelFile: plan.barrel.filePath
    }
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
        error: plan.reason || 'File cannot be split meaningfully',
        coupling: plan.coupling,
        suggestions: plan.suggestions
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