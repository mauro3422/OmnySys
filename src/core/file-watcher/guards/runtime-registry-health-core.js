import { createLogger } from '../../../utils/logger.js';
import { findRuntimeRegistryHealthDuplicateRegistrations } from './runtime-registry-health-duplicates.js';
import {
    buildDuplicateRegistrationIssue,
    buildInitializationChurnIssue,
    buildRegistryLeakIssue,
    buildSlowInitializationIssue
} from './runtime-registry-health-issues.js';
import { getOrCreateRuntimeRegistryHealthStats } from './runtime-registry-health-stats.js';

const logger = createLogger('OmnySys:file-watcher:guards:runtime-registry-health');

const MAX_EXPECTED_GUARDS = 50;
const MAX_INIT_CALLS = 3;

export async function detectRuntimeRegistryHealth(rootPath, filePath, EventEmitterContext, options = {}) {
    const {
        verbose = false,
        registrySnapshot = null
    } = options;

    try {
        const issues = [];

        if (!filePath.includes('registry') && !filePath.includes('Registry')) {
            return [];
        }

        const stats = getOrCreateRuntimeRegistryHealthStats(filePath);

        if (registrySnapshot) {
            const duplicates = findRuntimeRegistryHealthDuplicateRegistrations(registrySnapshot);
            if (duplicates.length > 0) {
                issues.push(buildDuplicateRegistrationIssue({ filePath, duplicates }));
            }
        }

        stats.initCalls++;
        if (stats.initCalls > MAX_INIT_CALLS) {
            issues.push(buildInitializationChurnIssue({
                filePath,
                initCalls: stats.initCalls,
                lastInitTime: stats.lastInitTime
            }));
        }
        stats.lastInitTime = Date.now();

        if (registrySnapshot) {
            const semanticCount = registrySnapshot.semanticGuards?.size || 0;
            const impactCount = registrySnapshot.impactGuards?.size || 0;
            const totalSize = semanticCount + impactCount;

            if (totalSize > MAX_EXPECTED_GUARDS) {
                issues.push(buildRegistryLeakIssue({
                    filePath,
                    semanticCount,
                    impactCount,
                    totalSize
                }));
            }

            if (registrySnapshot.initializationPromise && !registrySnapshot.initialized) {
                const timeInInit = Date.now() - (stats.initStartTime || Date.now());
                if (timeInInit > 5000) {
                    issues.push(buildSlowInitializationIssue({
                        filePath,
                        timeInInit,
                        hasInitPromise: true,
                        isInitialized: registrySnapshot.initialized
                    }));
                }
            }
        }

        if (issues.length > 0) {
            EventEmitterContext.emit('runtime:registry-health', {
                filePath,
                totalIssues: issues.length,
                checks: issues.map((issue) => ({
                    check: issue.check,
                    severity: issue.severity,
                    message: issue.message
                }))
            });

            if (verbose) {
                logger.warn(`[RUNTIME-REGISTRY-HEALTH] ${filePath}: ${issues.length} issue(s) detected`);
            }
        }

        return issues;
    } catch (error) {
        logger.debug(`[RUNTIME-REGISTRY-HEALTH GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}
