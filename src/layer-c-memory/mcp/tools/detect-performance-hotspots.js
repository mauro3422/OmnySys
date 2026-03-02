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
 * Normalizes performance risk into a score 0-100
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

    // 1. Big-O Complexity (Max 40 points)
    const complexity = performance.estimatedComplexity || 'O(1)';
    if (complexity === 'O(n^3)') score += 40;
    else if (complexity === 'O(n^2)') score += 25;
    else if (complexity === 'O(n)') score += 5;

    // 2. Blocking Operations (Max 30 points)
    const blocking = performance.blockingOperations || [];
    if (blocking.length > 0) {
        score += Math.min(30, blocking.length * 10);
    }

    // 3. Array Chaining / Iteration Pressure (Max 20 points)
    const chains = performance.largeArrayOps || [];
    if (chains.length > 0) {
        score += Math.min(20, chains.length * 5);
    }

    // 4. Memory/Regex Risks in Loops (Max 10 points)
    const regex = performance.regexIssues || [];
    const memory = performance.memoryRisks || [];
    if (regex.length > 0 || memory.length > 0) score += 10;

    return Math.min(100, score);
}

export async function detect_performance_hotspots(args) {
    const { limit = 20, minRisk = 10, filePath = null } = args;
    const projectPath = process.env.OMNYSYS_PROJECT_PATH || process.cwd();
    const repo = getRepository(projectPath);

    try {
        let query = 'SELECT * FROM atoms WHERE complexity > 1 OR performance_json IS NOT NULL';
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
                    complexity: performance.estimatedComplexity || 'O(1)',
                    issues: performance.all || [],
                    recommendation: generateRecommendation(riskScore, performance)
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

function generateRecommendation(score, perf) {
    if (score >= 40) return "CRITICAL: High algorithmic complexity detected. Consider using a Map/Set for lookups or optimizing nested loops.";
    if (perf.blockingOperations?.length > 0) return "WARNING: Synchronous blocking I/O found. Move to async/await to prevent Event Loop blockage.";
    if (perf.largeArrayOps?.length > 1) return "TIP: Multiple array iterations found. Combine .map/.filter into a single .reduce or for-loop for better cache locality.";
    return "Check for potential micro-optimizations in hot paths.";
}
