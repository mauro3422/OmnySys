/**
 * @fileoverview pipeline-integrity-detector.js
 *
 * Coordinador de integridad del pipeline. La lógica pesada de verificación
 * vive en módulos dedicados para reducir complejidad y riesgo de edición.
 *
 * @module core/meta-detector/pipeline-integrity-detector
 */

import { createLogger } from '../../utils/logger.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import {
    checkAtomMetadataCompleteness,
    checkCalledByResolution,
    checkRelationConsistency,
    checkScanToAtomCoverage
} from './pipeline-integrity-detector/data-checks.js';
import {
    checkGuardExecution,
    checkIssuePersistence,
    checkMcpDataAccess,
    checkOrphanedData,
    reconcileLiveRows
} from './pipeline-integrity-detector/runtime-checks.js';

const logger = createLogger('OmnySys:PipelineIntegrityDetector');

const INTEGRITY_CHECKS = [
    checkScanToAtomCoverage,
    checkAtomMetadataCompleteness,
    checkCalledByResolution,
    checkGuardExecution,
    checkIssuePersistence,
    checkMcpDataAccess,
    checkOrphanedData,
    checkRelationConsistency
];

export class PipelineIntegrityDetector {
    constructor(projectPath) {
        this.projectPath = projectPath;
        this.repo = null;
        this.lastCleanupResult = null;
    }

    async initialize() {
        try {
            this.repo = getRepository(this.projectPath);
            return true;
        } catch (error) {
            logger.error('Failed to initialize repository:', error.message);
            return false;
        }
    }

    async verify() {
        const initialized = await this.initialize();
        if (!initialized || !this.repo?.db) {
            logger.error('Cannot verify pipeline: repository not available');
            return [];
        }

        reconcileLiveRows(this);

        const results = await Promise.allSettled(
            INTEGRITY_CHECKS.map(check => check(this))
        );

        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            }

            logger.error(`Check ${index} failed:`, result.reason);
            return {
                name: `check_${index}`,
                passed: false,
                severity: 'high',
                error: result.reason.message,
                details: { error: result.reason.message },
                recommendation: 'Restart MCP server and verify files on disk'
            };
        });
    }

    _buildResult(name, passed, severity, details, recommendation) {
        return {
            name,
            passed,
            severity,
            details,
            recommendation
        };
    }

    _countLiveAtoms() {
        return this.repo.db.prepare(`
            SELECT COUNT(*) as count FROM atoms
            WHERE (is_removed IS NULL OR is_removed = 0)
        `).get().count;
    }

    _runAccessProbe(name, test) {
        try {
            const result = test();
            return {
                tool: name,
                success: true,
                dataQuality: result ? 'good' : 'empty'
            };
        } catch (error) {
            return {
                tool: name,
                success: false,
                error: error.message,
                dataQuality: 'unknown'
            };
        }
    }
}

export default PipelineIntegrityDetector;
