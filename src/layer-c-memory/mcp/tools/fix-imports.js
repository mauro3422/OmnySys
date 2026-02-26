
import fs from 'fs/promises';
import { validate_imports } from './validate-imports.js';
import { getRepository } from '#layer-c/storage/repository/repository-factory.js';
import { calculateRelativeImport } from '../../../utils/path-utils.js';
import { atomic_edit } from './atomic-edit/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:mcp:fix_imports');

/**
 * Tool: mcp_omnysystem_fix_imports
 * Resuelve automáticamente imports rotos en un archivo buscando los símbolos en el grafo global.
 * 
 * @param {Object} args - Argumentos: { filePath }
 * @param {Object} context - Contexto del servidor MCP
 * @returns {Promise<Object>} Resultado del proceso de reparación
 */
export async function fix_imports(args, context) {
    const { filePath, execute = false } = args;
    const { projectPath } = context;

    if (!filePath) return { error: 'Missing required parameter: filePath' };

    logger.info(`[Tool] fix_imports("${filePath}")`);

    try {
        // 1. Identificar imports rotos
        const validation = await validate_imports({
            filePath,
            checkBroken: true,
            checkFileExistence: true
        }, context);

        if (!validation.files || validation.files.length === 0) {
            return { success: true, message: 'No broken imports detected in this file.' };
        }

        const repo = getRepository(projectPath);
        const results = {
            success: true,
            fixed: [],
            unresolved: []
        };

        const fileIssues = validation.files[0];
        const content = await fs.readFile(filePath, 'utf-8');

        // 2. Intentar resolver cada import roto
        for (const broken of (fileIssues.nonExistent || fileIssues.broken || [])) {
            const importStr = broken.import;

            // Extraer el nombre base para buscar en el índice de átomos
            const baseName = importStr.split('/').pop().replace(/\.[jt]sx?$/, '');

            // Buscar por nombre de archivo o átomo coincidente
            logger.info(`[FixImports] Searching for resolution for: ${importStr}`);
            const potentialMatches = repo.query({ limit: 10 });

            // Filtramos manualmente por path para encontrar el archivo real
            const bestMatch = potentialMatches.find(a =>
                a.file_path && a.file_path.includes(baseName)
            );

            if (bestMatch && bestMatch.file_path !== filePath) {
                const newImportPath = calculateRelativeImport(filePath, bestMatch.file_path, projectPath);

                // 3. Aplicar reparación vía atomic_edit
                const oldLine = content.split('\n').find(l => l.includes(`'${importStr}'`) || l.includes(`"${importStr}"`));

                if (oldLine) {
                    const newLine = oldLine.replace(importStr, newImportPath);

                    if (execute) {
                        const editRes = await atomic_edit({
                            filePath,
                            oldString: oldLine,
                            newString: newLine
                        }, context);

                        if (editRes.success) {
                            results.fixed.push({ from: importStr, to: newImportPath, status: 'applied' });
                            continue;
                        }
                    } else {
                        results.fixed.push({
                            from: importStr,
                            to: newImportPath,
                            status: 'suggested',
                            oldString: oldLine,
                            newString: newLine
                        });
                        continue;
                    }
                }
            }

            results.unresolved.push({ import: importStr, reason: 'No matching file found in global index' });
        }

        return results;
    } catch (error) {
        logger.error(`[Tool] fix_imports failed: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}
