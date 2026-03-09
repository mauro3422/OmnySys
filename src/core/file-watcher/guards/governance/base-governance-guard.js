/**
 * @fileoverview base-governance-guard.js
 *
 * Clase base para la creación de "Governance Guards".
 * Encapsula la persistencia y la estructura común de los reportes
 * para reglas arquitectónicas y límites del sistema.
 *
 * @module core/file-watcher/guards/governance/base-governance-guard
 * @version 1.0.0
 */

import { persistWatcherIssue, clearWatcherIssue } from '../../watcher-issue-persistence.js';
import { createLogger } from '../../../../utils/logger.js';
import { IssueDomains, createIssueType, createStandardContext } from '../guard-standards.js';

const logger = createLogger('OmnySys:guards:governance');

export class BaseGovernanceGuard {
    /**
     * @param {string} guardName Identificador del guard (ej. file-size-guard)
     * @param {string} domain Dominio del issue (IssueDomains.CODE o IssueDomains.ARCH)
     */
    constructor(guardName, domain = IssueDomains.ARCH) {
        this.guardName = guardName;
        this.domain = domain;
    }

    /**
     * Persiste un issue de gobernanza.
     */
    async reportIssue(rootPath, filePath, issueSubType, severity, message, contextData = {}) {
        const issueType = createIssueType(this.domain, issueSubType, severity);
        const context = createStandardContext({
            guardName: this.guardName,
            severity,
            ...contextData
        });

        await persistWatcherIssue(rootPath, filePath, issueType, severity, message, {
            issues: [context]
        });

        logger.warn(`[GOVERNANACE: ${this.guardName}] ${filePath}: ${severity.toUpperCase()} issue detected: ${message}`);
        return context;
    }

    /**
     * Limpia un issue de gobernanza si ya no está presente.
     */
    async clearIssue(rootPath, filePath, issueSubType, severity) {
        const issueType = createIssueType(this.domain, issueSubType, severity);
        await clearWatcherIssue(rootPath, filePath, issueType);
    }
}
