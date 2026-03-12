import path from 'path';
import { BaseSqlRepository } from '#layer-c/storage/repository/core/BaseSqlRepository.js';
import { getPhase2FileCounts } from '#shared/compiler/index.js';

export async function processPhase2Batch({
    indexer,
    orchestrator,
    projectPath,
    logger,
    onUpdateStatus
}) {
    let repo = null;
    try {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        repo = getRepository(projectPath);
    } catch (error) {
        logger.warn(`Phase 2 batch repository load failed: ${error.message}`);
        return;
    }
    if (!repo || !repo.db) return;

    const rows = loadPendingRows(repo.db);
    if (rows.length === 0) {
        indexer.stop(true);
        return;
    }

    const candidateSummary = await collectCandidateFiles(indexer, rows, projectPath);
    if (candidateSummary.countProcessedGroup === 0) {
        logger.warn(`Phase 2 Indexer Deadlock Detected: ${rows.length} files constantly failing analysis. Bypassing them and ending phase 2.`);
        indexer.stop(true);
        return;
    }

    let analyzeProjectFilesUnified = null;
    try {
        ({ analyzeProjectFilesUnified } = await import('#layer-a/pipeline/unified-analysis.js'));
    } catch (error) {
        logger.warn(`Phase 2 batch analysis loader failed: ${error.message}`);
        return;
    }

    if (candidateSummary.missingFiles.length > 0) {
        persistMissingFiles(repo.db, candidateSummary.missingFiles);
    }

    if (candidateSummary.filesToProcess.length > 0) {
        try {
            await processExistingFiles({
                db: repo.db,
                filesToProcess: candidateSummary.filesToProcess,
                projectPath,
                orchestrator,
                analyzeProjectFilesUnified
            });
        } catch (error) {
            logger.warn(`Phase 2 batch processing failed: ${error.message}`);
            return;
        }
    }

    if (indexer.globalTimer) {
        indexer.globalTimer.onItemProcessed(candidateSummary.countProcessedGroup);
    }

    const remainingCount = getPhase2FileCounts(repo.db).pendingFiles;
    await syncPhase2Progress(indexer, remainingCount, candidateSummary.countProcessedGroup);

    onUpdateStatus(remainingCount);
    orchestrator.emit('job:complete', { filePath: candidateSummary.filesToProcess[0] }, {});
}

function loadPendingRows(db) {
    return db.prepare(`
        SELECT DISTINCT file_path
        FROM atoms
        WHERE is_phase2_complete = 0
        LIMIT 200
    `).all();
}

async function collectCandidateFiles(indexer, rows, projectPath) {
    const filesToProcess = [];
    const missingFiles = [];
    const fs = await import('fs');
    let countProcessedGroup = 0;

    for (const row of rows) {
        const relPath = row.file_path;
        if (indexer.processedPaths.has(relPath)) continue;

        indexer.processedPaths.add(relPath);
        countProcessedGroup++;

        const absPath = path.join(projectPath, relPath);
        if (fs.existsSync(absPath)) {
            filesToProcess.push(relPath);
        } else {
            missingFiles.push(relPath);
        }
    }

    return { filesToProcess, missingFiles, countProcessedGroup };
}

async function syncPhase2Progress(indexer, remainingCount, processedGroupCount) {
    const nextTotal = indexer._syncPhase2Totals(remainingCount, processedGroupCount);
    await indexer._ensureGlobalTimer(nextTotal);

    if (indexer.globalTimer) {
        indexer.globalTimer.totalItems = nextTotal;
    }
}

function persistMissingFiles(db, missingFiles) {
    const hrMissing = new BaseSqlRepository(db, 'Indexer:Missing');
    const persistTransaction = hrMissing.db.transaction((paths) => {
        const stmt = db.prepare(`
            UPDATE atoms
            SET is_removed = 1, is_phase2_complete = 1, purpose_type = 'DEAD_CODE'
            WHERE file_path = ?
        `);
        for (const filePath of paths) {
            stmt.run(filePath);
        }
    });
    persistTransaction(missingFiles);
}

async function processExistingFiles({
    db,
    filesToProcess,
    projectPath,
    orchestrator,
    analyzeProjectFilesUnified
}) {
    try {
        const hr = new BaseSqlRepository(db, 'Indexer:Batch');
        const clearPendingAtoms = hr.db.transaction((paths) => {
            for (const filePath of paths) {
                hr.delete('atoms', 'file_path', filePath);
            }
        });
        clearPendingAtoms(filesToProcess);

        const absoluteFiles = filesToProcess.map((filePath) => path.join(projectPath, filePath));
        await analyzeProjectFilesUnified(absoluteFiles, projectPath, false, 'deep');

        for (const relPath of filesToProcess) {
            const absPath = path.join(projectPath, relPath);
            orchestrator.indexedFiles.add(absPath);
            orchestrator.processedFiles.add(absPath);
        }
    } catch (error) {
        throw new Error(`processExistingFiles failed: ${error.message}`);
    }
}
