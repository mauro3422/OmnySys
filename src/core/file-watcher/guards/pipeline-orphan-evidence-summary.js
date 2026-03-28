import Database from 'better-sqlite3';
import {
    getDeadCodePlausibilitySummary,
    getPipelineOrphanSummary
} from '../../../shared/compiler/index.js';

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
