import Database from 'better-sqlite3';
import { isValidGuardTarget } from './guard-standards.js';
import {
    getDeadCodePlausibilitySummary,
    getPipelineOrphanSummary
} from '../../../shared/compiler/index.js';

const PIPELINE_NAME_PATTERN = /(persist|analyze|compute|calculate|build|generate|process|index)/i;

function isProductionPipelineFile(filePath = '') {
    return typeof filePath === 'string'
        && filePath.startsWith('src/')
        && !filePath.startsWith('tests/')
        && !filePath.startsWith('scripts/');
}

export function hasPipelineShape(atom) {
    if (!isValidGuardTarget(atom)) return false;
    if (!(atom?.isExported || atom?.is_exported)) return false;
    const filePath = atom.filePath || atom.file_path || '';
    if (!isProductionPipelineFile(filePath)) return false;
    return PIPELINE_NAME_PATTERN.test(atom?.name || '');
}

export function loadPipelineOrphanEvidence(rootPath, filePath) {
    let db;
    try {
        db = new Database(`${rootPath}/.omnysysdata/omnysys.db`, { readonly: true });
        const orphanSummary = getPipelineOrphanSummary(db, {
            candidateLimit: 200,
            orphanLimit: 100,
            minComplexity: 0
        });
        const deadCodeSummary = getDeadCodePlausibilitySummary(db, {
            minLines: 0,
            allowExported: true,
            suspiciousThreshold: 0
        });

        return {
            deadCodeSummary,
            orphanAtoms: orphanSummary.orphans.filter((atom) => atom.file_path === filePath)
        };
    } catch {
        return {
            deadCodeSummary: null,
            orphanAtoms: []
        };
    } finally {
        db?.close();
    }
}
