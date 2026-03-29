import { clearWatcherIssue } from '../../watcher-issue-persistence.js';
import {
    normalizeFilePath,
    loadPreviousFindings,
    buildDuplicateDebtHistory,
    coordinateDuplicateFindings
} from '../../../../shared/compiler/index.js';

export async function clearUnifiedDuplicateIssues(rootPath, normalizedFilePath) {
    await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_unified_high');
    await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_unified_medium');
    await clearWatcherIssue(rootPath, normalizedFilePath, 'code_duplicate_unified_critical_high');
}

export function normalizeUnifiedDuplicateFilePath(filePath) {
    return normalizeFilePath(filePath);
}

export function loadUnifiedPreviousFindings(repo, normalizedFilePath) {
    return loadPreviousFindings(repo.db, normalizedFilePath, 'code_%duplicate');
}

export function buildUnifiedDebtHistory(normalizedFilePath, findings, previousFindings) {
    return buildDuplicateDebtHistory(normalizedFilePath, findings, previousFindings);
}

export function coordinateUnifiedDuplicateFindings(structuralFindings, conceptualFindings) {
    return coordinateDuplicateFindings(structuralFindings, conceptualFindings);
}
