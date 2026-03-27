import { isValidGuardTarget, extractAtomMetrics } from './guard-standards.js';

export function loadHotspotAtoms(repo, filePath, maxAgeDays) {
    return repo.db.prepare(`
        SELECT 
            id, name, type, complexity, lines_of_code, is_async,
            change_frequency, age_days, fragility_score, risk_level,
            is_exported, is_dead_code
        FROM atoms
        WHERE file_path = ?
            AND (is_removed IS NULL OR is_removed = 0)
            AND (is_dead_code IS NULL OR is_dead_code = 0)
            AND age_days <= ?
        ORDER BY change_frequency DESC
    `).all(filePath, maxAgeDays);
}

export function collectHotspotIssues(atoms, highThreshold, mediumThreshold) {
    const issues = [];

    for (const atom of atoms) {
        if (!isValidGuardTarget(atom)) continue;

        const metrics = extractAtomMetrics(atom);
        const changeScore = metrics.changeFrequency * metrics.ageDays;

        if (changeScore >= highThreshold || metrics.changeFrequency >= 0.5) {
            issues.push({
                atomId: metrics.id,
                atomName: metrics.name,
                severity: 'high',
                metrics,
                changeScore
            });
        } else if (changeScore >= mediumThreshold) {
            issues.push({
                atomId: metrics.id,
                atomName: metrics.name,
                severity: 'medium',
                metrics,
                changeScore
            });
        }
    }

    return issues;
}
