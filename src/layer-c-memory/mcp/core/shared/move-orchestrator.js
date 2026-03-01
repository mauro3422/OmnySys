
import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../../utils/logger.js';
import { getFileDependents } from '#layer-c/query/apis/file-api.js';
import { calculateRelativeImport, normalizeImportToAbsolute } from '../../../../utils/path-utils.js';
import { atomic_edit } from '../../tools/atomic-edit/index.js';
import { extractImportsFromCode } from '../../tools/atomic-edit/exports.js';
import { reindexFile } from '../../tools/atomic-edit/reindex.js';

const logger = createLogger('OmnySys:move:orchestrator');

export class MoveOrchestrator {
    /**
     * Mueve un archivo y actualiza todas sus referencias globales de forma atómica
     * @param {string} oldPath - Ruta actual relativa al proyecto
     * @param {string} newPath - Nueva ruta relativa al proyecto
     * @param {string} projectPath - Ruta raíz del proyecto
     * @param {Object} context - Contexto del orquestador MCP
     * @returns {Promise<Object>} Resultado de la operación
     */
    static async moveFile(oldPath, newPath, projectPath, context = {}) {
        logger.info(`[MoveOrchestrator] Starting move: ${oldPath} -> ${newPath}`);

        // Sincronización: Esperar a que el indexador en background termine de procesar archivos recientes
        const { orchestrator } = context;
        if (orchestrator) {
            logger.info(`[MoveOrchestrator] Sycnhronizing with background indexer...`);
            let attempts = 0;
            while (attempts < 50 && (orchestrator.queue?.size() > 0 || orchestrator.activeJobs > 0)) {
                await new Promise(r => setTimeout(r, 200));
                attempts++;
            }
        }

        // 1. Obtener dependientes ANTES del movimiento (basado en el índice actual)
        const dependents = await getFileDependents(projectPath, oldPath);
        logger.info(`[MoveOrchestrator] Found ${dependents.length} dependent files to update`);

        const absOld = path.resolve(projectPath, oldPath);
        const absNew = path.resolve(projectPath, newPath);

        try {
            // 2. Mover archivo físicamente
            await fs.mkdir(path.dirname(absNew), { recursive: true });
            await fs.rename(absOld, absNew);
            logger.info(`[MoveOrchestrator] Physical move successful`);

            // 3. Re-indexar el archivo en su nueva ubicación para que el sistema lo reconozca
            await reindexFile(newPath, projectPath);

            // También borramos el átomo viejo del índice si es necesario (el reindexFile suele manejarlo por path)
            // pero para estar seguros, el sistema de limpieza de átomos huérfanos debería actuar o podemos forzarlo.

            const results = {
                success: true,
                moved: { from: oldPath, to: newPath },
                updatedFiles: [],
                failedUpdates: []
            };

            // 4. Actualizar cada dependiente
            for (const depPath of dependents) {
                try {
                    const absDep = path.resolve(projectPath, depPath);
                    const code = await fs.readFile(absDep, 'utf-8');
                    const imports = extractImportsFromCode(code);

                    // Identificar el import exacto que apunta al archivo movido
                    const matchingImport = imports.find(imp => {
                        const absResolved = normalizeImportToAbsolute(imp, depPath, projectPath);
                        // Normalizamos para comparar sin importar extensión o slash final
                        const normTarget = absOld.replace(/\.[jt]sx?$/, '').replace(/\\/g, '/');
                        const normResolved = absResolved.replace(/\.[jt]sx?$/, '').replace(/\\/g, '/');
                        return normResolved === normTarget;
                    });

                    if (matchingImport) {
                        const newImportStr = calculateRelativeImport(depPath, newPath, projectPath);
                        logger.info(`[MoveOrchestrator] Updating ${depPath}: "${matchingImport}" -> "${newImportStr}"`);

                        // Localizar la línea exacta del import para el atomic_edit
                        const lines = code.split('\n');
                        const lineIndex = lines.findIndex(l => l.includes(`'${matchingImport}'`) || l.includes(`"${matchingImport}"`));

                        if (lineIndex !== -1) {
                            const oldLine = lines[lineIndex];
                            const newLine = oldLine.replace(matchingImport, newImportStr);

                            // Aplicamos el cambio atómicamente
                            const editRes = await atomic_edit({
                                filePath: depPath,
                                oldString: oldLine,
                                newString: newLine
                            }, { ...context, projectPath }); // Aseguramos que el context tenga projectPath

                            if (editRes.success) {
                                results.updatedFiles.push(depPath);
                            } else {
                                results.failedUpdates.push({ file: depPath, reason: editRes.message });
                                logger.warn(`[MoveOrchestrator] Atomic edit failed for ${depPath}: ${editRes.message}`);
                            }
                        } else {
                            results.failedUpdates.push({ file: depPath, reason: 'Import line not found by string match' });
                        }
                    }
                } catch (err) {
                    logger.error(`[MoveOrchestrator] Failed to process dependent ${depPath}: ${err.message}`);
                    results.failedUpdates.push({ file: depPath, reason: err.message });
                }
            }

            return results;

        } catch (err) {
            logger.error(`[MoveOrchestrator] Fatal move error: ${err.message}`);
            return {
                success: false,
                error: err.message,
                moved: false
            };
        }
    }
}

export default MoveOrchestrator;
