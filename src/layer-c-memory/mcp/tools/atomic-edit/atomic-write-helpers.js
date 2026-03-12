import path from 'path';
import { loadAtoms } from '#layer-c/storage/index.js';
import { extractExportsFromCode } from './exports.js';
import { query_graph } from '../query-graph.js';

export async function loadPreviousAtomsForWrite(projectPath, filePath) {
    try {
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);
        return await loadAtoms(projectPath, path.relative(projectPath, absolutePath));
    } catch {
        return [];
    }
}

export function buildDuplicateRiskError(tool, duplicateCandidates, failOnDuplicate) {
    if (duplicateCandidates.length === 0) {
        return null;
    }

    const duplicatedSymbols = duplicateCandidates.map((candidate) => candidate.name);
    const duplicateOccurrences = duplicateCandidates.reduce((sum, candidate) => sum + (candidate.occurrenceCount || 0), 0);
    const message = `[DuplicateGuard] ${duplicateCandidates.length} symbols with duplication risk (${duplicateOccurrences} occurrences): ${duplicatedSymbols.join(', ')}`;

    tool.logger.warn(message);

    if (!failOnDuplicate) {
        return null;
    }

    return tool.formatError('DUPLICATE_SYMBOL_RISK', message, {
        suggestion: 'Refactor/unify duplicated symbols or rerun with failOnDuplicate: false',
        duplicates: duplicateCandidates
    });
}

function isLowSignalExportName(name) {
    return name.length < 3 || /^[a-z]$/.test(name);
}

async function findCrossFileDuplicates(newExports, filePath, context, logger) {
    const duplicates = [];

    for (const exportItem of newExports) {
        if (isLowSignalExportName(exportItem.name)) {
            continue;
        }

        try {
            const existing = await query_graph(
                { queryType: 'instances', symbolName: exportItem.name },
                context
            );

            if (!existing?.success || existing?.data?.totalInstances <= 0) {
                continue;
            }

            const otherFiles = existing.data.instances.filter(
                (instance) => !instance.file_path.endsWith(filePath)
            );

            if (otherFiles.length === 0) {
                continue;
            }

            duplicates.push({
                symbol: exportItem.name,
                type: exportItem.type,
                existingInstances: otherFiles.length,
                existingFiles: otherFiles.map((item) => item.file_path),
                existingLocations: otherFiles.map((item) => ({
                    file: item.file_path,
                    line: item.line_start
                }))
            });
        } catch (error) {
            logger.debug(`[CrossFileGuard] Skip ${exportItem.name}: ${error.message}`);
        }
    }

    return duplicates;
}

export async function enforceCrossFileDuplicateGuard({
    content,
    filePath,
    failOnDuplicate,
    context,
    logger,
    formatError
}) {
    const newExports = extractExportsFromCode(content);
    if (newExports.length === 0) {
        return null;
    }

    const crossFileDuplicates = await findCrossFileDuplicates(newExports, filePath, context, logger);
    if (crossFileDuplicates.length === 0) {
        return null;
    }

    const message = `[CrossFileDuplicateGuard] ${crossFileDuplicates.length} symbol(s) already exist in other file(s)`;
    logger.warn(message);

    if (!failOnDuplicate) {
        logger.warn(`${message}: ${crossFileDuplicates.map((item) => item.symbol).join(', ')}`);
        return null;
    }

    return formatError('DUPLICATE_SYMBOL_CROSS_FILE', message, {
        suggestion: 'Consider reusing existing implementation or rename symbol',
        duplicates: crossFileDuplicates,
        canonicalLocations: crossFileDuplicates.map((item) => ({
            symbol: item.symbol,
            recommendedFile: item.existingFiles[0],
            reason: 'First existing instance (canonical candidate)'
        }))
    });
}

export function buildAtomicWriteWarnings(analysis, duplicateCandidates) {
    return [
        ...(analysis.conflicts.length > 0 ? [`WARNING: ${analysis.conflicts.length} export name(s) already exist`] : []),
        ...(duplicateCandidates.length > 0 ? [`WARNING: ${duplicateCandidates.length} duplicated symbol candidate(s) detected. Review response.refactoring.`] : []),
        ...analysis.namespaceRisk.warnings.map((warning) => warning.message)
    ];
}
