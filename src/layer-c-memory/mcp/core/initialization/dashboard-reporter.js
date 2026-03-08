/**
 * @fileoverview dashboard-reporter.js
 * 
 * Utility to print a consolidated system diagnostics dashboard to the console.
 * Aggregates Pipeline Integrity, Technical Debt, and Physics metrics.
 *
 * @module mcp/core/initialization/dashboard-reporter
 */

import { PipelineIntegrityDetector } from '#core/meta-detector/pipeline-integrity-detector.js';
import { IntegrityDashboard } from '#core/meta-detector/integrity-dashboard.js';
import { createLogger } from '#utils/logger.js';
import { getRepository } from '#layer-c/storage/repository/index.js';

const logger = createLogger('OmnySys:DashboardReporter');

// Report State to avoid redundant output
let lastReportType = null; // 'preliminary' | 'final'
let lastReportSnapshot = '';

/**
 * Prints the consolidated diagnostics dashboard to the console
 * @param {string} projectPath - Project root path
 * @param {Object} options - Formatting options
 */
export async function printDiagnosticsDashboard(projectPath, options = {}) {
    const { isFinal = false, force = false } = options;

    // De-duplication Logic
    if (!isFinal && lastReportType === 'final' && !force) return;

    try {
        const repo = getRepository(projectPath);
        const db = repo?.db;
        if (!db) return;

        // 1. Fetch Integrity Report
        const detector = new PipelineIntegrityDetector(projectPath);
        const dashboard = new IntegrityDashboard();
        const integrityResults = await detector.verify();
        const report = await dashboard.generateReport(integrityResults);

        // 2. Fetch Extended Metrics (Structural, Conceptual, Orphans, Physics)
        const extendedMetrics = await _fetchExtendedMetrics(projectPath, db, repo);

        // 3. Construct current snapshot (health + debt count) to detect meaningful changes
        const currentSnapshot = `${report.overallHealth}-${extendedMetrics.issueCount}`;
        if (!force && isFinal && lastReportType === 'final' && currentSnapshot === lastReportSnapshot) {
            return;
        }

        // 4. Generate and Print the Box
        const consoleSummary = dashboard.generateConsoleSummary(report);
        const output = _formatConsolidatedBox(consoleSummary, extendedMetrics, isFinal);

        // Update tracking state
        lastReportType = isFinal ? 'final' : 'preliminary';
        lastReportSnapshot = currentSnapshot;

        process.stdout.write('\n' + output + '\n');

    } catch (error) {
        logger.error('Failed to generate consolidated dashboard:', error.message);
    }
}

/**
 * Fetches technical debt and physics metrics from the database
 * @private
 */
async function _fetchExtendedMetrics(projectPath, db, repo) {
    const metrics = {
        totalAtoms: 0,
        typeSummary: '',
        structuralGroups: 0,
        conceptualGroups: 0,
        orphans: 0,
        issueCount: 0,
        issueSummary: '0 items',
        relations: 0,
        physicsCoverage: 0,
        hotspots: 0,
        phase2PendingFiles: 0,
        hasPhase2DebtSnapshot: false
    };

    try {
        // A. Project Composition
        const atomCounts = db.prepare(`
            SELECT atom_type, COUNT(*) as count FROM atoms 
            WHERE (is_removed = 0 OR is_removed IS NULL)
            GROUP BY atom_type
        `).all();
        metrics.totalAtoms = atomCounts.reduce((sum, a) => sum + a.count, 0);
        metrics.typeSummary = atomCounts
            .filter(a => ['function', 'class', 'module', 'variable'].includes(a.atom_type))
            .map(a => `${a.count} ${a.atom_type}${a.count > 1 ? 's' : ''}`)
            .join(', ');

        // B. Duplicates (Structural via DNA)
        const dupStats = db.prepare(`
            SELECT COUNT(*) as group_count FROM (
                SELECT dna_json FROM atoms
                WHERE dna_json IS NOT NULL AND dna_json != '' AND dna_json != 'null'
                  AND atom_type IN ('function', 'arrow') AND (is_removed = 0 OR is_removed IS NULL)
                GROUP BY dna_json HAVING COUNT(*) > 1
            )
        `).get();
        metrics.structuralGroups = dupStats?.group_count || 0;

        // C. Conceptual Duplicates & Orphans (If available)
        try {
            metrics.conceptualGroups = repo.findConceptualDuplicates ? (repo.findConceptualDuplicates({ limit: 100 })).length : 0;
            const { getPipelineOrphanSummary } = await import('#shared/compiler/index.js');
            metrics.orphans = getPipelineOrphanSummary(db)?.total || 0;
        } catch (e) { /* Optional components missing */ }

        // D. Technical Debt (Semantic Issues)
        const issues = db.prepare(`
            SELECT severity, COUNT(*) as count FROM semantic_issues 
            WHERE (is_removed = 0 OR is_removed IS NULL) AND (lifecycle_status = 'active' OR lifecycle_status IS NULL)
            GROUP BY severity
        `).all();
        metrics.issueCount = issues.reduce((sum, i) => sum + i.count, 0);
        metrics.issueSummary = issues.map(i => `${i.count} ${i.severity}`).join(', ') || '0 items';
        metrics.phase2PendingFiles = db.prepare(`
            SELECT COUNT(DISTINCT file_path) as count
            FROM atoms
            WHERE is_phase2_complete = 0
        `).get()?.count || 0;
        metrics.hasPhase2DebtSnapshot = Boolean(db.prepare(`
            SELECT 1
            FROM semantic_issues
            WHERE file_path = 'project-wide'
              AND issue_type = 'arch_technical_debt_high'
              AND (is_removed = 0 OR is_removed IS NULL)
              AND (lifecycle_status = 'active' OR lifecycle_status IS NULL)
            LIMIT 1
        `).get());

        // E. Relations & Physics
        metrics.relations = db.prepare(`SELECT COUNT(*) as count FROM atom_relations WHERE (is_removed = 0 OR is_removed IS NULL)`).get()?.count || 0;
        const physics = db.prepare(`
            SELECT SUM(CASE WHEN fragility_score > 0 THEN 1 ELSE 0 END) as fragility_covered,
                   SUM(CASE WHEN complexity > 10 THEN 1 ELSE 0 END) as complex_atoms
            FROM atoms WHERE (is_removed = 0 OR is_removed IS NULL)
        `).get();

        if (metrics.totalAtoms > 0) {
            metrics.physicsCoverage = Math.round(((physics?.fragility_covered || 0) / metrics.totalAtoms) * 100);
            metrics.hotspots = physics?.complex_atoms || 0;
        }
    } catch (err) {
        logger.debug('Extended metrics fetch partially failed:', err.message);
    }

    return metrics;
}

/**
 * Formats the final console box strings
 * @private
 */
function _formatConsolidatedBox(integrityConsoleSummary, extendedMetrics, isFinal) {
    const lines = integrityConsoleSummary.split('\n');
    const headerPattern = 'OMNYSYS PIPELINE INTEGRITY REPORT';
    const isPreliminary = !isFinal;
    const isSettling = extendedMetrics.phase2PendingFiles > 0 || (!isFinal && !extendedMetrics.hasPhase2DebtSnapshot);

    // 1. Update Header
    const headerIdx = lines.findIndex(l => l.includes(headerPattern));
    if (headerIdx !== -1) {
        lines[headerIdx] = isFinal
            ? '║           --- FINAL SYSTEM SUMMARY ---               ║'
            : isSettling
                ? '║          --- PRELIMINARY SYSTEM SUMMARY ---          ║'
                : '║             --- SYSTEM SUMMARY ---                   ║';
    }

    // 2. Prepare Detailed Lines
    const detailLines = [
        ...(isPreliminary && isSettling
            ? [`  ℹ️  Preliminary snapshot: Phase 2 telemetry is still settling; final post-completion debt/issue counts may change.`, '']
            : []),
        `  📦  Project: ${extendedMetrics.totalAtoms} atoms (${extendedMetrics.typeSummary})`,
        `  🔗  Semantic Density: ${extendedMetrics.relations} cross-links (Impact Map active)`,
        `  👥  Duplicates: ${extendedMetrics.structuralGroups} structural, ${extendedMetrics.conceptualGroups} conceptual`,
        `  ⚠️  Technical Debt: ${extendedMetrics.issueSummary}${extendedMetrics.orphans > 0 ? ` (+${extendedMetrics.orphans} orphans)` : ''}`,
        `  ⚛️  Physics Coverage: ${extendedMetrics.physicsCoverage}% signals (${extendedMetrics.hotspots} hotspots)`,
        ''
    ];

    // 3. Inject details before recommendations
    let insertIdx = lines.findIndex(l => l.includes('🔴 CRITICAL ISSUES'));
    if (insertIdx === -1) insertIdx = lines.findIndex(l => l.includes('📋 TOP RECOMMENDATIONS'));
    if (insertIdx === -1) insertIdx = lines.length - 2;

    lines.splice(insertIdx, 0, ...detailLines);

    return lines.join('\n');
}
