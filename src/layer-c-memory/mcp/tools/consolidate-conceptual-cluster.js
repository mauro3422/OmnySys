import { getRepository } from '../../storage/repository/repository-factory.js';
import { getAtomicEditor } from '../../../core/atomic-editor/index.js';
import { AtomicEditor } from '../../../core/atomic-editor/AtomicEditor.js';
import { createLogger } from '../../../utils/logger.js';
import { calculateRelativeImport } from '../../../utils/path-utils.js';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const logger = createLogger('OmnySys:mcp:consolidate_cluster');

function isBarrelFile(filePath, projectPath) {
    try {
        const fullPath = path.resolve(projectPath, filePath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.trim().split('\n');
        const nonEmptyLines = lines.filter(l => l.trim() && !l.trim().startsWith('//'));
        const hasOnlyExports = nonEmptyLines.every(l =>
            l.trim().startsWith('export') ||
            l.trim().startsWith('import') ||
            l.trim() === ''
        );
        return nonEmptyLines.length <= 5 && hasOnlyExports;
    } catch {
        return false;
    }
}

/**
 * Find function boundaries in source code lines.
 * Returns { startLine, endLine } (0-based indices).
 */
function findFunctionBoundaries(lines, symbolName) {
    let startLine = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(`function ${symbolName}`) ||
            lines[i].includes(`${symbolName} = function`) ||
            lines[i].includes(`${symbolName} = (`)) {
            startLine = i;
            break;
        }
    }
    if (startLine === -1) return { startLine: -1, endLine: -1 };

    let braceCount = 0;
    let endLine = -1;
    for (let i = startLine; i < lines.length; i++) {
        for (const ch of lines[i]) {
            if (ch === '{') braceCount++;
            else if (ch === '}') {
                braceCount--;
                if (braceCount === 0) {
                    endLine = i;
                    break;
                }
            }
        }
        if (endLine !== -1) break;
    }
    return { startLine, endLine };
}

/**
 * Extract function signature (declaration + opening brace).
 */
function extractFunctionSignature(fullFunctionText, symbolName) {
    const openBraceIdx = fullFunctionText.indexOf('{');
    if (openBraceIdx === -1) {
        throw new Error(`Could not find opening brace for "${symbolName}"`);
    }
    return fullFunctionText.substring(0, openBraceIdx + 1);
}

/**
 * Build new function text from signature + new body.
 */
function buildNewFunctionText(signaturePart, newBody) {
    return `${signaturePart.trim()}\n  ${newBody.trim()}\n}`;
}

/**
 * Find the insertion point for a new import statement.
 */
function findImportInsertionPoint(lines) {
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
            lastImportIdx = i;
        }
    }
    if (lastImportIdx === -1) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('//') && !line.startsWith('/*') &&
                !line.startsWith('*') && !line.startsWith('#!') &&
                !line.startsWith('/**') && line !== '') {
                lastImportIdx = i - 1;
                break;
            }
        }
        if (lastImportIdx === -1) lastImportIdx = 0;
    }
    return lastImportIdx;
}

/**
 * Validate JavaScript syntax using node --check.
 */
function validateSyntax(content, projectPath) {
    const tmpFile = path.join(projectPath, '.tmp-validation.js');
    fs.writeFileSync(tmpFile, content, 'utf-8');
    try {
        const result = spawnSync(process.execPath, ['--check', tmpFile], {
            encoding: 'utf-8',
            timeout: 5000,
            windowsHide: true
        });
        if (result.status !== 0) {
            throw new Error(`Syntax validation failed: ${result.stderr?.split('\n')[0] || 'Unknown error'}`);
        }
    } finally {
        fs.unlinkSync(tmpFile);
    }
}

/**
 * Direct fragment edit: reads file, replaces function body, validates, writes.
 * Bypasses AtomicEditor ESM cache issue.
 */
async function applyFragmentEdit(filePath, projectPath, symbolName, newBody, needsImport, importStatement) {
    const absolutePath = path.resolve(projectPath, filePath);
    const originalContent = fs.readFileSync(absolutePath, 'utf-8');
    const lines = originalContent.split('\n');

    const { startLine, endLine } = findFunctionBoundaries(lines, symbolName);
    if (startLine === -1) {
        throw new Error(`Function "${symbolName}" not found in ${filePath}`);
    }
    if (endLine === -1) {
        throw new Error(`Could not find closing brace for "${symbolName}" in ${filePath}`);
    }

    const functionLines = lines.slice(startLine, endLine + 1);
    const fullFunctionText = functionLines.join('\n');
    const signaturePart = extractFunctionSignature(fullFunctionText, symbolName);
    const newFunction = buildNewFunctionText(signaturePart, newBody);

    lines.splice(startLine, endLine - startLine + 1, newFunction);

    if (needsImport && importStatement) {
        const insertIdx = findImportInsertionPoint(lines);
        lines.splice(insertIdx + 1, 0, importStatement);
    }

    const newContent = lines.join('\n');
    validateSyntax(newContent, projectPath);

    fs.writeFileSync(absolutePath, newContent, 'utf-8');
    return { success: true, file: filePath };
}


function buildWrapperDelegationSuggestion(duplicate, ssotAtom, relPath, projectPath) {
    const ssotImportPath = relPath;
    const ssotName = ssotAtom.name;
    const duplicateName = duplicate.name;

    if (duplicate.atom_type === 'method') {
        return {
            status: 'error',
            error: `Unsafe auto-consolidation: method '${duplicateName}' matches the SSOT symbol name. Extract a coordinator/API helper first and migrate callers manually.`
        };
    }

    const isBarrel = isBarrelFile(duplicate.file_path, projectPath);

    if (isBarrel && duplicateName === ssotName) {
        return {
            status: 'preview',
            type: 'file-replace',
            strategy: 're-export',
            suggestion: `export { ${ssotName} } from '${ssotImportPath}';`
        };
    }

    // Use aliased import to avoid shadowing (e.g., import { log as canonicalLog })
    const aliasName = `canonical${ssotName.charAt(0).toUpperCase()}${ssotName.slice(1)}`;
    const importStatement = `import { ${ssotName} as ${aliasName} } from '${ssotImportPath}';`;
    const delegationBody = `return ${aliasName}(...args);`;

    return {
        status: 'preview',
        type: duplicate.atom_type,
        strategy: 'wrapper-delegation',
        needsImport: true,
        importStatement,
        replacementBody: delegationBody,
        description: `Replace body of '${duplicateName}' with delegation to SSOT '${ssotName}' via ${aliasName}`
    };
}

function buildCanonicalAlias(symbolName) {
    return `canonical${symbolName[0].toUpperCase()}${symbolName.slice(1)}`;
}

function buildSafeConsolidationSuggestion(duplicate, ssotAtom, relPath, projectPath) {
    return buildWrapperDelegationSuggestion(duplicate, ssotAtom, relPath, projectPath);
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
        const atomicEditor = orchestrator?.atomicEditor || getAtomicEditor(() => new AtomicEditor(projectPath, orchestrator));

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
                const plan = buildSafeConsolidationSuggestion(duplicate, ssotAtom, relPath, projectPath);

                action.status = plan.status;

                if (plan.error) {
                    action.error = plan.error;
                    results.actions.push(action);
                    continue;
                }

                action.type = plan.type;
                action.strategy = plan.strategy;
                action.suggestion = plan.suggestion;
                action.description = plan.description;

                if (execute) {
                    try {
                        let result;

                        if (plan.strategy === 'wrapper-delegation') {
                            // Direct fragment edit - bypasses AtomicEditor ESM cache
                            result = await applyFragmentEdit(
                                duplicate.file_path,
                                projectPath,
                                duplicate.name,
                                plan.replacementBody,
                                plan.needsImport,
                                plan.importStatement
                            );
                        } else if (plan.strategy === 're-export') {
                            // BARREL FILE: Replace entire content
                            result = await atomicEditor.edit(
                                duplicate.file_path,
                                null,
                                plan.suggestion,
                                {
                                    symbolName: duplicate.name,
                                    autoFix: false
                                }
                            );
                        } else {
                            // Fallback: try standard edit
                            result = await atomicEditor.edit(
                                duplicate.file_path,
                                null,
                                plan.suggestion,
                                {
                                    symbolName: duplicate.name,
                                    autoFix: true
                                }
                            );
                        }

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
