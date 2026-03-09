export function saveFileSummariesBatch(repo, entries, now = new Date().toISOString()) {
    if (!repo?.db || !entries || entries.length === 0) {
        return;
    }

    const upsertFileSummary = repo.db.prepare(`
        INSERT INTO files (path, imports_json, exports_json, module_name, atom_count, total_lines, last_analyzed)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET
            imports_json = excluded.imports_json,
            exports_json = excluded.exports_json,
            module_name = excluded.module_name,
            atom_count = excluded.atom_count,
            total_lines = MAX(COALESCE(files.total_lines, 0), excluded.total_lines),
            last_analyzed = excluded.last_analyzed,
            is_removed = 0,
            updated_at = datetime('now')
    `);

    const saveFileSummariesTx = repo.db.transaction((batchEntries) => {
        for (const [filePath, summary] of batchEntries) {
            upsertFileSummary.run(
                filePath,
                JSON.stringify(summary.imports || []),
                JSON.stringify(summary.exports || []),
                summary.moduleName || null,
                Number(summary.atomCount || 0),
                Number(summary.totalLines || 0),
                now
            );
        }
    });

    saveFileSummariesTx(entries);
}
