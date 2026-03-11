import path from 'path';
import fs from 'fs/promises';
import { getRepository } from '../../storage/repository/repository-factory.js';
import { getAtomicEditor } from '../../../core/atomic-editor/index.js';
import { createLogger } from '../../../utils/logger.js';
import { calculateRelativeImport } from '../../../utils/path-utils.js';

const logger = createLogger('OmnySys:mcp:consolidate_cluster');

/**
 * mcp_omnysystem_consolidate_conceptual_cluster
 * 
 * Automatiza la eliminación de deuda técnica por duplicidad conceptual.
 * Redirige múltiples implementaciones hacia un SSOT (Source of Truth).
 * 
 * @param {Object} args - { semanticFingerprint, ssotFilePath, execute }
 * @param {Object} context - Contexto MCP
 */
export async function consolidate_conceptual_cluster(args, context) {
    const { semanticFingerprint, ssotFilePath, execute = false } = args;
    const { projectPath, orchestrator } = context;

    if (!semanticFingerprint || !ssotFilePath) {
        return { success: false, error: 'Parámetros obligatorios: semanticFingerprint, ssotFilePath' };
    }

    logger.info(`[Tool] consolidating cluster: ${semanticFingerprint} -> ${ssotFilePath}`);

    try {
        const repository = getRepository(projectPath);
        const atomicEditor = getAtomicEditor(projectPath, orchestrator);

        // 1. Obtener todos los átomos del cluster
        // Usamos SQL crudo para tener acceso directo a dna_json
        const query = `
            SELECT id, name, file_path, atom_type, is_exported,
                   json_extract(dna_json, '$.structuralHash') as structuralHash
            FROM atoms
            WHERE json_extract(dna_json, '$.semanticFingerprint') = ?
              AND (is_removed = 0 OR is_removed IS NULL)
              AND (is_dead_code = 0 OR is_dead_code IS NULL)
        `;

        const allAtoms = repository.db.prepare(query).all(semanticFingerprint);

        const ssotAtom = allAtoms.find(a => a.file_path.includes(ssotFilePath.replace(/\\/g, '/')));

        if (!ssotAtom) {
            return {
                success: false,
                error: `No se encontró el átomo SSOT en ${ssotFilePath} para el fingerprint ${semanticFingerprint}.`,
                foundPaths: allAtoms.map(a => a.file_path)
            };
        }

        const duplicates = allAtoms.filter(a => a.id !== ssotAtom.id);

        const results = {
            success: true,
            fingerprint: semanticFingerprint,
            ssot: { name: ssotAtom.name, path: ssotAtom.file_path },
            totalFound: allAtoms.length,
            duplicatesCount: duplicates.length,
            actions: []
        };

        if (duplicates.length === 0) {
            return { ...results, message: 'No hay duplicados para consolidar.' };
        }

        // 2. Procesar duplicados
        for (const duplicate of duplicates) {
            const action = {
                targetFile: duplicate.file_path,
                targetSymbol: duplicate.name,
                status: 'pending'
            };

            try {
                // TODO: Mejorar lógica de detección de "body" para reemplazo quirúrgico
                // Por ahora, si es una función/método idéntico, sugerimos el cambio

                const relPath = calculateRelativeImport(duplicate.file_path, ssotAtom.file_path, projectPath);

                // Lógica de reemplazo básica para Prototipo
                let replacement;
                if (duplicate.atom_type === 'method') {
                    if (duplicate.name === ssotAtom.name) {
                        action.status = 'error';
                        action.error = `Unsafe auto-consolidation: method '${duplicate.name}' matches the SSOT symbol name. Manual refactor required.`;
                        results.actions.push(action);
                        continue;
                    }
                    replacement = `${duplicate.name}() {\n    return ${ssotAtom.name}.apply(this, arguments);\n  }`;
                } else {
                    replacement = `import { ${ssotAtom.name} } from '${relPath}';\n\nexport const ${duplicate.name} = (...args) => ${ssotAtom.name}(...args);`;
                }

                action.type = duplicate.atom_type;
                action.suggestion = replacement;

                if (execute) {
                    // Estrategia de reemplazo por símbolo:
                    // Buscamos la definición del símbolo original y la reemplazamos por la sugerencia
                    // NOTA: En un sistema productivo usaríamos un parser AST, 
                    // aquí usamos una aproximación segura con AtomicEditor.

                    try {
                        const result = await atomicEditor.edit(
                            duplicate.file_path,
                            null,
                            action.suggestion,
                            {
                                symbolName: duplicate.name,
                                autoFix: true
                            }
                        );

                        action.status = result.success ? 'consolidated' : 'failed';
                        if (!result.success) action.error = result.error;
                    } catch (err) {
                        logger.error(`[ConsolidateTool] AtomicEditor error for ${duplicate.file_path}: ${err.message}`);
                        action.status = 'failed';
                        action.error = err.message;
                    }
                } else {
                    action.status = 'preview';
                }

                results.actions.push(action);
            } catch (err) {
                action.status = 'error';
                action.error = err.message;
                results.actions.push(action);
            }
        }

        return results;

    } catch (error) {
        logger.error(`[ConsolidateTool] Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}
