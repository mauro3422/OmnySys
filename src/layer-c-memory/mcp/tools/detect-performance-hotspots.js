/**
 * @fileoverview detect-performance-hotspots.js
 * 
 * Tool handler for identifying performance bottlenecks based on static analysis metadata.
 * Ranks atoms by complexity, blocking operations, and resource intensity.
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:mcp:tools:performance');

/**
 * Normalizes performance risk into a score 0-100.
 * Falls back to complexity-based scoring when performance_json is missing
 * (atoms indexed before Phase 2 had the performance extractor active).
 */
function calculatePerformanceRisk(atom) {
    let score = 0;
    let performance = {};
    try {
        const parsed = atom.performance_json ? JSON.parse(atom.performance_json) : null;
        performance = (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) {
        performance = {};
    }

    const hasRealPerfData = Object.keys(performance).length > 0;

    if (hasRealPerfData) {
        // 1. Big-O Complexity from extractor (Max 40 points)
        const complexity = performance.estimatedComplexity || 'O(1)';
        if (complexity === 'O(n^3)') score += 40;
        else if (complexity === 'O(n^2)') score += 25;
        else if (complexity === 'O(n)') score += 5;

        // 2. Blocking Operations (Max 30 points)
        const blocking = performance.blockingOperations || [];
        if (blocking.length > 0) score += Math.min(30, blocking.length * 10);

        // 3. Array Chaining / Iteration Pressure (Max 20 points)
        const chains = performance.largeArrayOps || [];
        if (chains.length > 0) score += Math.min(20, chains.length * 5);

        // 4. Memory/Regex Risks in Loops (Max 10 points)
        const regex = performance.regexIssues || [];
        const memory = performance.memoryRisks || [];
        if (regex.length > 0 || memory.length > 0) score += 10;
    } else {
        // FALLBACK: Derive risk from cyclomatic complexity when performance_json is missing.
        // Most atoms fall here because they were indexed before Phase 2 had the extractor.
        const cyclomatic = atom.complexity || 0;
        if (cyclomatic >= 30) score += 40;       // Very high — likely O(n^2) or worse
        else if (cyclomatic >= 15) score += 25;  // High — likely deeply nested
        else if (cyclomatic >= 8) score += 12;   // Medium — worth attention
        else if (cyclomatic >= 4) score += 5;    // Low — baseline noise

        // Boost for async functions without error handling (fragile hot paths)
        if (atom.is_async && !atom.has_error_handling) score += 8;

        // Boost for high-coupling atoms (lots of deps = latency amplification)
        const callees = atom.callees_count || atom.out_degree || 0;
        if (callees > 10) score += 10;
        else if (callees > 5) score += 5;
    }

    return Math.min(100, score);
}

export async function detect_performance_hotspots(args) {
    const { limit = 20, minRisk = 10, filePath = null } = args;
    const projectPath = process.env.OMNYSYS_PROJECT_PATH || process.cwd();
    const repo = getRepository(projectPath);

    try {
        // Include ALL atoms with complexity > 3 — performance_json may be null for older atoms
        // and we derive scores from complexity in that case.
        let query = `
            SELECT id, name, file_path, line_start, complexity, performance_json,
                   is_async, has_error_handling, callees_count, out_degree
            FROM atoms 
            WHERE complexity > 3 OR performance_json IS NOT NULL
        `;
        const params = [];

        if (filePath) {
            query += ' AND file_path = ?';
            params.push(filePath);
        }

        const atoms = repo.db.prepare(query).all(...params);

        const hotspots = atoms
            .map(atom => {
                const riskScore = calculatePerformanceRisk(atom);
                let performance = {};
                try {
                    const parsed = atom.performance_json ? JSON.parse(atom.performance_json) : null;
                    performance = (parsed && typeof parsed === 'object') ? parsed : {};
                } catch (e) {
                    performance = {};
                }

                return {
                    id: atom.id,
                    name: atom.name,
                    file: atom.file_path,
                    line: atom.line_start,
                    riskScore,
                    complexity: performance.estimatedComplexity || `cyclomatic:${atom.complexity}`,
                    hasDetailedData: Object.keys(performance).length > 0,
                    issues: performance.all || [],
                    recommendation: generateRecommendation(riskScore, performance, atom)
                };
            })
            .filter(h => h.riskScore >= minRisk)
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, limit);

        return {
            success: true,
            totalFound: hotspots.length,
            hotspots,
            summary: `Detected ${hotspots.length} performance hotspots with risk score >= ${minRisk}.`
        };
    } catch (error) {
        logger.error('Error detecting performance hotspots:', error);
        return { success: false, error: error.message };
    }
}

function generateRecommendation(score, perf, atom = {}) {
    if (perf.blockingOperations?.length > 0) return `CRITICAL: Synchronous blocking I/O found (${perf.blockingOperations.map(b => b.type).join(', ')}). Move to async/await.`;
    if (score >= 40) return `HIGH: Complex function (${atom.complexity} cyclomatic). Consider splitting or caching results.`;
    if (perf.largeArrayOps?.length > 1) return `TIP: Multiple array iterations. Combine into single .reduce or for-loop for better cache locality.`;
    if (atom.is_async && !atom.has_error_handling) return `WARNING: Async function without error handling — unhandled rejections can crash the process.`;
    return `Monitor in production — complexity score suggests potential hotspot.`;
}
