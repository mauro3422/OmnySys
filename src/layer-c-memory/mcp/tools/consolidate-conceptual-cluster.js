import { getRepository } from '../../storage/repository/repository-factory.js';
import { getAtomicEditor } from '../../../core/atomic-editor/index.js';
import { createLogger } from '../../../utils/logger.js';
import { calculateRelativeImport } from '../../../utils/path-utils.js';

const logger = createLogger('OmnySys:mcp:consolidate_cluster');

function buildCanonicalAlias(symbolName) {
    return `canonical${symbolName[0].toUpperCase()}${symbolName.slice(1)}`;
}

function buildSafeConsolidationSuggestion(duplicate, ssotAtom, relPath) {
    const sameSymbolName = duplicate.name === ssotAtom.name;

    if (duplicate.atom_type === 'method') {
        if (sameSymbolName) {
            return {
                status: 'error',
                error: `Unsafe auto-consolidation: method '${duplicate.name}' matches the SSOT symbol name. Extract a coordinator/API helper first and migrate callers manually.`
            };
        }

        return {
            status: 'preview',
            type: duplicate.atom_type,
            strategy: 'method-wrapper',
            suggestion: `${duplicate.name}(...args) {\n    return ${ssotAtom.name}.call(this, ...args);\n  }`
        };
    }

    if (sameSymbolName) {
        return {
            status: 'preview',
            type: duplicate.atom_type,
            strategy: 're-export',
            suggestion: `export { ${ssotAtom.name} } from '${relPath}';`
        };
    }

    const canonicalAlias = buildCanonicalAlias(ssotAtom.name);
    return {
        status: 'preview',
        type: duplicate.atom_type,
        strategy: 'alias-wrapper',
        suggestion: `import { ${ssotAtom.name} as ${canonicalAlias} } from '${relPath}';\n\nexport const ${duplicate.name} = (...args) => ${canonicalAlias}(...args);`
    };
}

/**
 * mcp_omnysystem_consolidate_conceptual_cluster
 *
 * Automatiza la eliminacion de deuda tecnica por duplicidad conceptual.
 * Redirige multiples implementaciones hacia un SSOT (Source of Truth).
 *
 * @param {Object} args - { semanticFingerprint, ssotFilePath, execute }
 * @param {Object} context - Contexto MCP
 */
export async function consolidate_conceptual_cluster(args, context) {
    const { semanticFingerprint, ssotFilePath, execute = false } = args;
    const { projectPath, orchestrator } = context;

    if (!semanticFingerprint || !ssotFilePath) {
        return { success: false, error: 'Parametros obligatorios: semanticFingerprint, ssotFilePath' };
    }

    logger.info(`[Tool] consolidating cluster: ${semanticFingerprint} -> ${ssotFilePath}`);

    try {
        const repository = getRepository(projectPath);
        const atomicEditor = getAtomicEditor(projectPath, orchestrator);

        const query = `
            SELECT id, name, file_path, atom_type, is_exported,
                   json_extract(dna_json, '$.structuralHash') as structuralHash
            FROM atoms
            WHERE json_extract(dna_json, '$.semanticFingerprint') = ?
              AND (is_removed = 0 OR is_removed IS NULL)
              AND (is_dead_code = 0 OR is_dead_code IS NULL)
        `;

        const allAtoms = repository.db.prepare(query).all(semanticFingerprint);
        const normalizedSsotPath = ssotFilePath.replace(/\\/g, '/');
        const ssotAtom = allAtoms.find((atom) => atom.file_path.includes(normalizedSsotPath));

        if (!ssotAtom) {
            return {
                success: false,
                error: `No se encontro el atomo SSOT en ${ssotFilePath} para el fingerprint ${semanticFingerprint}.`,
                foundPaths: allAtoms.map((atom) => atom.file_path)
            };
        }

        const duplicates = allAtoms.filter((atom) => atom.id !== ssotAtom.id);
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

        for (const duplicate of duplicates) {
            const action = {
                targetFile: duplicate.file_path,
                targetSymbol: duplicate.name,
                status: 'pending'
            };

            try {
                const relPath = calculateRelativeImport(duplicate.file_path, ssotAtom.file_path, projectPath);
                const plan = buildSafeConsolidationSuggestion(duplicate, ssotAtom, relPath);

                action.status = plan.status;

                if (plan.error) {
                    action.error = plan.error;
                    results.actions.push(action);
                    continue;
                }

                action.type = plan.type;
                action.strategy = plan.strategy;
                action.suggestion = plan.suggestion;

                if (execute) {
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
                        if (!result.success) {
                            action.error = result.error;
                        }
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
